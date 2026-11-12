"""
RDTP Local Edge Producer & PyTorch Streaming DataLoader Interface.
Implements the Edge Ingestion Daemon and Application Flow Control from Section III-A & IV-B.
"""

import os
import sys
import io
import time
import socket
import threading
from typing import Iterator, Optional, Dict, Any, List

# Support direct script execution as well as package imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.abspath(os.path.join(_current_dir, ".."))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from rdtp.protocol import (
    CodecType,
    encode_packet,
    decode_header,
    verify_and_decode_packet,
    HEADER_SIZE,
)
from rdtp.telemetry import RDTPTelemetry

class RDTPProducer:
    """
    Local Edge Producer daemon that streams preprocessed batches across WAN
    to remote cloud GPU workers with credit-based flow control.
    """
    def __init__(
        self,
        target_host: str = "127.0.0.1",
        target_port: int = 50051,
        buffer_depth: int = 3,
        codec: CodecType = CodecType.JPEG,
    ):
        self.target_host = target_host
        self.target_port = target_port
        self.buffer_depth = buffer_depth
        self.codec = codec
        self.credits = buffer_depth
        self.credit_lock = threading.Condition()
        self.sock: Optional[socket.socket] = None
        self.is_connected = False
        self.is_running = False
        self.receiver_thread: Optional[threading.Thread] = None
        self.telemetry = RDTPTelemetry(max_buffer_depth=buffer_depth, current_credits=buffer_depth)
        self.epoch_id = 1
        self.batch_id = 0

    def connect(self, timeout: float = 10.0) -> bool:
        """Establishes outbound connection to Cloud Consumer."""
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(timeout)
            self.sock.connect((self.target_host, self.target_port))
            self.sock.settimeout(None)
            self.is_connected = True
            self.is_running = True
            
            # Start background ACK / Credit token listener
            self.receiver_thread = threading.Thread(target=self._listen_for_credits, daemon=True)
            self.receiver_thread.start()
            return True
        except Exception as e:
            self.is_connected = False
            return False

    def _listen_for_credits(self):
        """Background thread listening for CREDIT_ACK frames from cloud worker."""
        while self.is_running and self.sock:
            try:
                header_data = self._recv_exact(HEADER_SIZE)
                if not header_data:
                    break
                header = decode_header(header_data)
                if header.payload_len > 0:
                    self._recv_exact(header.payload_len)
                if header.codec_type == CodecType.CREDIT_ACK:
                    with self.credit_lock:
                        self.credits = min(self.buffer_depth, self.credits + 1)
                        self.telemetry.record_credit_ack()
                        self.credit_lock.notify_all()
            except Exception:
                break
        self.is_connected = False

    def _recv_exact(self, num_bytes: int) -> Optional[bytes]:
        buf = bytearray()
        while len(buf) < num_bytes:
            chunk = self.sock.recv(num_bytes - len(buf)) if self.sock else b""
            if not chunk:
                return None
            buf.extend(chunk)
        return bytes(buf)

    def send_batch(self, payload_bytes: bytes, sample_count: int) -> bool:
        """
        Dispatches a batch payload to the remote consumer, respecting flow control credits.
        """
        with self.credit_lock:
            while self.credits <= 0 and self.is_running:
                # Block until cloud GPU consumes a batch and replenishes credit
                self.credit_lock.wait(timeout=1.0)
            
            if not self.is_running or not self.is_connected:
                return False
            
            self.batch_id += 1
            packet = encode_packet(
                epoch_id=self.epoch_id,
                batch_id=self.batch_id,
                sample_count=sample_count,
                codec_type=self.codec,
                payload=payload_bytes,
            )
            
            try:
                self.sock.sendall(packet)
                self.credits -= 1
                self.telemetry.record_batch_sent(len(payload_bytes))
                return True
            except Exception:
                self.is_connected = False
                return False

    def close(self):
        self.is_running = False
        with self.credit_lock:
            self.credit_lock.notify_all()
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
        self.is_connected = False

class RDTPStreamDataset:
    """
    Iterable PyTorch-compatible dataset that reads local inputs and produces
    compressed bitstream payloads for transmission.
    """
    def __init__(self, data_samples: List[Any], batch_size: int = 32, codec: CodecType = CodecType.JPEG):
        self.data_samples = data_samples
        self.batch_size = batch_size
        self.codec = codec

    def __iter__(self) -> Iterator[Dict[str, Any]]:
        num_samples = len(self.data_samples)
        for i in range(0, num_samples, self.batch_size):
            slice_samples = self.data_samples[i : i + self.batch_size]
            batch_bytes = self._encode_batch(slice_samples)
            yield {
                "batch_id": (i // self.batch_size) + 1,
                "sample_count": len(slice_samples),
                "payload": batch_bytes,
            }

    def _encode_batch(self, slice_samples: List[Any]) -> bytes:
        # In a real environment, encodes PIL Images or numpy arrays to compact bytes
        # Here we provide a robust byte serialization with sample delimiter offsets
        buf = io.BytesIO()
        for s in slice_samples:
            if isinstance(s, bytes):
                buf.write(len(s).to_bytes(4, 'big') + s)
            elif isinstance(s, str):
                encoded = s.encode('utf-8')
                buf.write(len(encoded).to_bytes(4, 'big') + encoded)
            else:
                raw = bytes(str(s), 'utf-8')
                buf.write(len(raw).to_bytes(4, 'big') + raw)
        return buf.getvalue()

class RDTPStreamLoader:
    """
    High-level PyTorch DataLoader replacement for RDTP edge-to-cloud streaming.
    Integrates local CPU prefetch generation with remote cloud dispatch.
    """
    def __init__(
        self,
        dataset: RDTPStreamDataset,
        target_host: str = "127.0.0.1",
        target_port: int = 50051,
        buffer_depth: int = 3,
    ):
        self.dataset = dataset
        self.producer = RDTPProducer(
            target_host=target_host,
            target_port=target_port,
            buffer_depth=buffer_depth,
            codec=dataset.codec,
        )

    def start_streaming(self) -> bool:
        if not self.producer.connect():
            return False
        
        def _stream_worker():
            for batch in self.dataset:
                ok = self.producer.send_batch(batch["payload"], batch["sample_count"])
                if not ok:
                    break
        
        t = threading.Thread(target=_stream_worker, daemon=True)
        t.start()
        return True

    def close(self):
        self.producer.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="RDTP Edge Producer Test Streamer")
    parser.add_argument("--host", default="127.0.0.1", help="Target cloud consumer host")
    parser.add_argument("--port", type=int, default=50051, help="Consumer port")
    parser.add_argument("--count", type=int, default=10, help="Number of test batches")
    parser.add_argument("--batch-size", type=int, default=32, help="Samples per batch")
    args = parser.parse_args()

    print(f"[RDTP Producer] Initializing connection to {args.host}:{args.port}...")
    producer = RDTPProducer(target_host=args.host, target_port=args.port)
    if not producer.connect():
        print(f"[RDTP Producer] Could not connect to {args.host}:{args.port}. Is the consumer worker running?")
        sys.exit(1)

    print(f"[RDTP Producer] Streaming {args.count} batches of size {args.batch_size}...")
    try:
        for i in range(args.count):
            dummy_payload = b"\x00" * (args.batch_size * 28 * 1024) # ~28 KB per compressed sample
            ok = producer.send_batch(dummy_payload, args.batch_size)
            if ok:
                print(f"  -> Streamed batch #{i + 1}/{args.count} ({len(dummy_payload)}B, Credits: {producer.credits})")
            time.sleep(0.04)
    finally:
        producer.close()
        print("[RDTP Producer] Finished streaming.")

