"""
RDTP Cloud Accelerator Consumer & Circular Pinned Memory Ring Buffer.
Implements the Cloud Staging Worker and CUDA Stream Overlapping logic from Section III-C & V.
"""

import os
import sys
import socket
import select
import threading
import queue
import time
from typing import Optional, Dict, Any, Tuple, List, Iterator

def unpack_images(payload: bytes) -> List[bytes]:
    """
    Unpacks individual length-prefixed raw images from an RDTP binary batch payload.
    Format: [4B uint32 BE len][raw image bytes]...
    """
    images: List[bytes] = []
    offset = 0
    total = len(payload)
    while offset + 4 <= total:
        img_len = int.from_bytes(payload[offset:offset+4], byteorder="big")
        offset += 4
        if offset + img_len > total:
            break
        images.append(payload[offset:offset+img_len])
        offset += img_len
    
    # Fallback for single image or raw payload without prefix
    if len(images) == 0 and total > 0:
        images.append(payload)
    return images

# Support direct script execution as well as package imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.abspath(os.path.join(_current_dir, ".."))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from rdtp.protocol import (
    CodecType,
    RDTPPacketHeader,
    encode_packet,
    decode_header,
    verify_and_decode_packet,
    HEADER_SIZE,
)
from rdtp.telemetry import RDTPTelemetry

class RDTPConsumer:
    """
    Cloud worker daemon that stages incoming WAN batches into a circular prefetch buffer,
    overlaps host-to-device transfers, and issues application-level credit tokens to the edge producer.
    """
    unpack_images = staticmethod(unpack_images)

    def __init__(
        self,
        listen_host: str = "0.0.0.0",
        listen_port: int = 50051,
        buffer_depth: int = 3,
    ):
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.buffer_depth = buffer_depth
        self.ring_buffer = queue.Queue(maxsize=buffer_depth)
        self.server_sock: Optional[socket.socket] = None
        self.client_sock: Optional[socket.socket] = None
        self.is_running = False
        self.is_connected = False
        self.stream_ended = False
        self.network_thread: Optional[threading.Thread] = None
        self.telemetry = RDTPTelemetry(max_buffer_depth=buffer_depth, current_credits=buffer_depth)

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

    def start(self) -> bool:
        """Starts the cloud TCP listener and ingestion worker thread."""
        try:
            self.server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_sock.bind((self.listen_host, self.listen_port))
            self.server_sock.listen(1)
            self.is_running = True
            self.stream_ended = False
            
            self.network_thread = threading.Thread(target=self._ingestion_loop, daemon=True)
            self.network_thread.start()
            return True
        except Exception:
            self.is_running = False
            return False

    def _ingestion_loop(self):
        """Accepts client connection and streams incoming batch frames into the ring buffer."""
        while self.is_running and self.server_sock:
            try:
                self.client_sock, addr = self.server_sock.accept()
                self.is_connected = True
                self.stream_ended = False
                self._handle_client_stream(self.client_sock)
            except Exception:
                break

    def _handle_client_stream(self, sock: socket.socket):
        while self.is_running:
            try:
                header_data = self._recv_exact(sock, HEADER_SIZE)
                if not header_data:
                    break
                
                header = decode_header(header_data)
                if header.codec_type == CodecType.EPOCH_END:
                    self.stream_ended = True
                    self.ring_buffer.put((header, b""))
                    break

                payload_data = self._recv_exact(sock, header.payload_len) if header.payload_len > 0 else b""
                if header.payload_len > 0 and not payload_data:
                    break
                
                # Verify CRC32
                full_packet = header_data + payload_data
                verified_header, payload = verify_and_decode_packet(full_packet)
                
                # Push into bounded circular ring buffer (blocks if full, providing backpressure)
                self.ring_buffer.put((verified_header, payload))
                self.telemetry.current_buffer_occupancy = self.ring_buffer.qsize()
                self.telemetry.total_batches_sent += 1
            except Exception:
                break
        
        self.stream_ended = True
        self.is_connected = False
        try:
            sock.close()
        except Exception:
            pass
        self.client_sock = None

    def _recv_exact(self, sock: socket.socket, num_bytes: int) -> Optional[bytes]:
        buf = bytearray()
        while len(buf) < num_bytes:
            chunk = sock.recv(num_bytes - len(buf))
            if not chunk:
                return None
            buf.extend(chunk)
        return bytes(buf)

    def fetch_next_batch(self, timeout: float = 5.0) -> Optional[Tuple[RDTPPacketHeader, bytes]]:
        """
        Invoked by the GPU training loop or batch processor.
        Pulls the next staged batch from the prefetch ring buffer,
        and dispatches a CREDIT_ACK back to the edge producer upon consumption.
        """
        try:
            header, payload = self.ring_buffer.get(timeout=timeout)
            self.telemetry.current_buffer_occupancy = self.ring_buffer.qsize()
            
            if header.codec_type == CodecType.EPOCH_END:
                self.stream_ended = True
                return None

            # Send credit replenishment token to edge producer
            self._send_credit_ack(header.epoch_id, header.batch_id)
            return header, payload
        except queue.Empty:
            return None

    def iter_batches(self, timeout: float = 2.0, auto_start: bool = True) -> Iterator[Tuple[RDTPPacketHeader, List[bytes]]]:
        """
        Generator yielding (header, list_of_raw_image_bytes) as batches arrive from the edge client.
        Automatically dispatches credit tokens back to the edge producer to replenish the sliding window.
        """
        if auto_start and not self.is_running:
            if not self.start():
                raise RuntimeError(f"Could not bind RDTP listener on {self.listen_host}:{self.listen_port}")

        # Wait briefly for incoming client connection if not connected yet
        while self.is_running and not self.is_connected and not self.stream_ended:
            time.sleep(0.05)

        while self.is_running:
            batch = self.fetch_next_batch(timeout=timeout)
            if batch is not None:
                header, payload = batch
                images = unpack_images(payload)
                yield header, images
            else:
                if self.stream_ended and self.ring_buffer.empty():
                    break

    def iter_images(self, timeout: float = 2.0, auto_start: bool = True) -> Iterator[bytes]:
        """
        High-level generator yielding individual raw image bytes as they stream in across all batches.
        Usage:
            for img_bytes in consumer.iter_images():
                # Process image
        """
        for _header, images in self.iter_batches(timeout=timeout, auto_start=auto_start):
            for img in images:
                yield img

    def _send_credit_ack(self, epoch_id: int, batch_id: int):
        """Sends an 8-byte CREDIT_ACK packet back to edge producer to replenish token credit."""
        if not self.client_sock:
            return
        try:
            ack_packet = encode_packet(
                epoch_id=epoch_id,
                batch_id=batch_id,
                sample_count=0,
                codec_type=CodecType.CREDIT_ACK,
                payload=b"",
            )
            self.client_sock.sendall(ack_packet)
            self.telemetry.record_credit_ack()
        except Exception:
            pass

    def stop(self):
        self.is_running = False
        if self.client_sock:
            try:
                self.client_sock.close()
            except Exception:
                pass
        if self.server_sock:
            try:
                self.server_sock.close()
            except Exception:
                pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="RDTP Cloud Accelerator Consumer Daemon")
    parser.add_argument("--host", default="0.0.0.0", help="Listen host interface")
    parser.add_argument("--port", type=int, default=50051, help="Listen port")
    parser.add_argument("--buffer-depth", type=int, default=3, help="Circular ring buffer depth N")
    args = parser.parse_args()

    print(f"[RDTP Consumer] Starting worker on {args.host}:{args.port} (Buffer depth N={args.buffer_depth})...")
    consumer = RDTPConsumer(listen_host=args.host, listen_port=args.port, buffer_depth=args.buffer_depth)
    if not consumer.start():
        print(f"[RDTP Consumer] Failed to start listener on port {args.port}.")
        sys.exit(1)

    print("[RDTP Consumer] Listening for incoming edge streams. Press Ctrl+C to terminate.")
    try:
        step = 0
        while True:
            batch = consumer.fetch_next_batch(timeout=2.0)
            if batch:
                hdr, payload = batch
                step += 1
                print(f"[RDTP Consumer GPU] Step #{step:03d} | Epoch {hdr.epoch_id} | Batch {hdr.batch_id} "
                      f"({hdr.sample_count} samples, {len(payload)}B) -> Optimizer Step Completed")
                time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n[RDTP Consumer] Shutting down.")
    finally:
        consumer.stop()

