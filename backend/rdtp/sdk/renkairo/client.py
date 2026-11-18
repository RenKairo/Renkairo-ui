"""
RenKairo On-Demand Streaming Client
Implements the reverse-pull RDTP ingestion wire protocol.
"""

import os
import sys
import socket
import struct
import zlib
import time
from enum import IntEnum
from dataclasses import dataclass
from typing import Iterator, List, Optional, Tuple

MAGIC_HEADER = 0x52445450  # "RDTP" in ASCII
HEADER_FORMAT = ">IQQIHHII"
HEADER_SIZE = 36

class CodecType(IntEnum):
    RAW_FP32 = 0
    JPEG = 1
    WEBP = 2
    PACKED_UINT16 = 3
    OPUS = 4
    CREDIT_ACK = 5
    HEARTBEAT_PING = 6
    HEARTBEAT_PONG = 7
    EPOCH_END = 8
    CHECKPOINT_STREAM = 9
    PULL_REQUEST = 10

@dataclass
class RDTPPacketHeader:
    epoch_id: int
    batch_id: int
    sample_count: int
    codec_type: CodecType
    flags: int = 0
    payload_len: int = 0
    checksum: int = 0

def encode_packet(
    epoch_id: int,
    batch_id: int,
    sample_count: int,
    codec_type: CodecType,
    payload: bytes,
    flags: int = 0
) -> bytes:
    payload_len = len(payload)
    checksum = zlib.crc32(payload) & 0xFFFFFFFF
    header = struct.pack(
        HEADER_FORMAT,
        MAGIC_HEADER,
        epoch_id,
        batch_id,
        sample_count,
        int(codec_type),
        flags,
        payload_len,
        checksum,
    )
    return header + payload

def decode_header(header_bytes: bytes) -> RDTPPacketHeader:
    if len(header_bytes) != HEADER_SIZE:
        raise ValueError(f"Invalid header size: expected {HEADER_SIZE}, got {len(header_bytes)}")
    magic, epoch_id, batch_id, sample_count, codec_val, flags, payload_len, checksum = struct.unpack(
        HEADER_FORMAT, header_bytes
    )
    if magic != MAGIC_HEADER:
        raise ValueError(f"Corrupt frame magic: expected 0x{MAGIC_HEADER:08X}, got 0x{magic:08X}")
    return RDTPPacketHeader(
        epoch_id=epoch_id,
        batch_id=batch_id,
        sample_count=sample_count,
        codec_type=CodecType(codec_val),
        flags=flags,
        payload_len=payload_len,
        checksum=checksum,
    )

def verify_and_decode_packet(raw_packet: bytes) -> Tuple[RDTPPacketHeader, bytes]:
    if len(raw_packet) < HEADER_SIZE:
        raise ValueError(f"Packet too small: {len(raw_packet)} bytes")
    header = decode_header(raw_packet[:HEADER_SIZE])
    payload = raw_packet[HEADER_SIZE:HEADER_SIZE + header.payload_len]
    if len(payload) != header.payload_len:
        raise ValueError(f"Incomplete payload: expected {header.payload_len}, got {len(payload)}")
    computed_crc = zlib.crc32(payload) & 0xFFFFFFFF
    if computed_crc != header.checksum:
        raise ValueError(f"CRC32 mismatch: expected 0x{header.checksum:08X}, got 0x{computed_crc:08X}")
    return header, payload

def unpack_images(payload: bytes) -> List[bytes]:
    """Unpacks length-prefixed images [4B uint32 BE len][raw image bytes]..."""
    images = []
    offset = 0
    total = len(payload)
    while offset + 4 <= total:
        img_len = int.from_bytes(payload[offset:offset+4], byteorder="big")
        offset += 4
        if offset + img_len > total:
            break
        images.append(payload[offset:offset+img_len])
        offset += img_len
    if len(images) == 0 and total > 0:
        images.append(payload)
    return images

def _recv_exact(sock: socket.socket, num_bytes: int) -> Optional[bytes]:
    buf = bytearray()
    while len(buf) < num_bytes:
        chunk = sock.recv(num_bytes - len(buf))
        if not chunk:
            return None
        buf.extend(chunk)
    return bytes(buf)

def _resolve_host(host: Optional[str] = None) -> str:
    """
    Auto-discovers the RenKairo IDE host address with zero user configuration:
    1. Explicit parameter (if supplied)
    2. RENKAIRO_IDE_HOST (auto-injected by Shiro shell/sandbox environment)
    3. SSH_CLIENT / SSH_CONNECTION client IP (if executed over remote SSH)
    4. Linux container default gateway (/proc/net/route)
    5. Localhost fallback ('127.0.0.1')
    """
    if host and host.strip():
        return host.strip()
    env_host = os.environ.get("RENKAIRO_IDE_HOST")
    if env_host and env_host.strip():
        return env_host.strip()
    ssh_client = os.environ.get("SSH_CLIENT") or os.environ.get("SSH_CONNECTION")
    if ssh_client:
        parts = ssh_client.split()
        if parts:
            return parts[0]
    try:
        with open("/proc/net/route", "r") as f:
            for line in f:
                fields = line.strip().split()
                if len(fields) >= 3 and fields[1] == "00000000":
                    gw_hex = fields[2]
                    return ".".join(str(int(gw_hex[i:i+2], 16)) for i in (6, 4, 2, 0))
    except Exception:
        pass
    return "127.0.0.1"

def stream(
    batch_size: int = 32,
    codec: str = "jpeg",
    host: Optional[str] = None,
    port: Optional[int] = None,
    timeout: float = 15.0,
) -> Iterator[Tuple[RDTPPacketHeader, List[bytes]]]:
    """
    Connects to the RenKairo IDE Provider Daemon, sends a PULL_REQUEST,
    and yields (header, list_of_raw_image_bytes) as batches arrive.
    Automatically returns CREDIT_ACK tokens to replenish the sliding window.
    """
    target_host = _resolve_host(host)
    target_port = port or int(os.environ.get("RENKAIRO_IDE_PORT", "50051"))

    # Connect to RenKairo IDE Provider
    sock = socket.create_connection((target_host, target_port), timeout=timeout)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    # 1. Send PULL_REQUEST handshake frame to request loaded dataset
    codec_val = CodecType.RAW_FP32 if codec == "raw" else (CodecType.WEBP if codec == "webp" else CodecType.JPEG)
    handshake = encode_packet(
        epoch_id=1,
        batch_id=0,
        sample_count=batch_size,
        codec_type=CodecType.PULL_REQUEST,
        payload=b"",
    )
    sock.sendall(handshake)

    # 2. Ingest batches with sliding-window credit tokens
    try:
        while True:
            hdr_bytes = _recv_exact(sock, HEADER_SIZE)
            if not hdr_bytes:
                break
            
            hdr = decode_header(hdr_bytes)
            if hdr.codec_type == CodecType.EPOCH_END:
                break

            payload = _recv_exact(sock, hdr.payload_len) if hdr.payload_len > 0 else b""
            if hdr.payload_len > 0 and not payload:
                break

            verified_hdr, verified_payload = verify_and_decode_packet(hdr_bytes + payload)
            images = unpack_images(verified_payload)

            # Yield batch to developer code
            yield verified_hdr, images

            # Replenish sliding window credit token to IDE
            ack = encode_packet(
                epoch_id=verified_hdr.epoch_id,
                batch_id=verified_hdr.batch_id,
                sample_count=0,
                codec_type=CodecType.CREDIT_ACK,
                payload=b"",
            )
            sock.sendall(ack)
    finally:
        try:
            sock.close()
        except Exception:
            pass

def load_batches(
    batch_size: int = 32,
    codec: str = "jpeg",
    host: Optional[str] = None,
    port: Optional[int] = None,
    timeout: float = 15.0,
) -> Iterator[List[bytes]]:
    """
    On-demand generator that yields batches of images directly from the RenKairo IDE dataset.
    
    Usage:
        import renkairo

        for batch in renkairo.load_batches(batch_size=32):
            # batch is a list of image bytes [img1, img2, ...]
            train_on_batch(batch)
    """
    for _hdr, batch in stream(batch_size=batch_size, codec=codec, host=host, port=port, timeout=timeout):
        yield batch

def load_data(
    batch_size: int = 32,
    codec: str = "jpeg",
    host: Optional[str] = None,
    port: Optional[int] = None,
    timeout: float = 15.0,
) -> Iterator[bytes]:
    """
    On-demand generator that yields individual raw image bytes directly from the RenKairo IDE dataset.
    
    Usage:
        import renkairo

        for img in renkairo.load_data():
            process(img)
    """
    for _hdr, batch in stream(batch_size=batch_size, codec=codec, host=host, port=port, timeout=timeout):
        for img in batch:
            yield img
