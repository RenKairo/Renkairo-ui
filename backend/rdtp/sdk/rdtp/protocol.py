"""
RDTP Binary Framing & Wire Protocol Implementation.
Compliant with Section IV of the IEEE Research Paper.
"""

import struct
import zlib
from enum import IntEnum
from dataclasses import dataclass
from typing import Tuple, Optional

# Magic byte marker: "RDTP" in ASCII (0x52445450)
MAGIC_HEADER = 0x52445450

# Header format:
# Magic: 4B (uint32)
# Epoch ID: 8B (uint64)
# Batch ID: 8B (uint64)
# Sample Count: 4B (uint32)
# Codec Type: 2B (uint16)
# Flags: 2B (uint16)
# Payload Length: 4B (uint32)
# CRC32 Checksum: 4B (uint32)
# Total = 36 bytes
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
    """
    Serializes a batch payload into a self-contained RDTP binary envelope
    with CRC32 integrity verification.
    """
    payload_len = len(payload)
    checksum = zlib.crc32(payload) & 0xFFFFFFFF
    
    header_bytes = struct.pack(
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
    return header_bytes + payload

def decode_header(header_bytes: bytes) -> RDTPPacketHeader:
    """
    Decodes the 36-byte RDTP binary header.
    """
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

def verify_and_decode_packet(raw_bytes: bytes) -> Tuple[RDTPPacketHeader, bytes]:
    """
    Decodes and verifies CRC32 integrity for an entire packet.
    """
    if len(raw_bytes) < HEADER_SIZE:
        raise ValueError("Packet truncated: shorter than minimum header size.")
    
    header = decode_header(raw_bytes[:HEADER_SIZE])
    payload = raw_bytes[HEADER_SIZE : HEADER_SIZE + header.payload_len]
    
    if len(payload) != header.payload_len:
        raise ValueError(f"Incomplete payload: expected {header.payload_len}, got {len(payload)}")
    
    computed_crc = zlib.crc32(payload) & 0xFFFFFFFF
    if computed_crc != header.checksum:
        raise ValueError(f"CRC32 mismatch: expected 0x{header.checksum:08X}, calculated 0x{computed_crc:08X}")
    
    return header, payload

# Backward compatibility alias
decode_packet = verify_and_decode_packet

if __name__ == "__main__":
    test_payload = b"RDTP Protocol Self-Test Payload 123456"
    packet = encode_packet(
        epoch_id=1,
        batch_id=42,
        sample_count=16,
        codec_type=CodecType.JPEG,
        payload=test_payload,
    )
    hdr, decoded = decode_packet(packet)
    assert decoded == test_payload
    assert hdr.batch_id == 42
    print(f"[RDTP Protocol] Self-test verified. Header: {hdr}, Payload: {len(decoded)} bytes")

