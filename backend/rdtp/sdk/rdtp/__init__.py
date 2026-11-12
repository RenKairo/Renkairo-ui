"""
RDTP: Real-Time Distributed Training Protocol
=============================================
Edge-to-cloud streaming machine learning library for latency-hidden pipelined ingestion.

Author: Mahammad Azhar (RenKairo Systems & Cloud Intelligence Lab)
License: Apache 2.0 / MIT
"""

__version__ = "1.0.0"
__author__ = "Mahammad Azhar"

import os
import sys

_parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from rdtp.protocol import (
    RDTPPacketHeader,
    CodecType,
    encode_packet,
    decode_packet,
    MAGIC_HEADER,
    HEADER_SIZE,
)
from rdtp.producer import RDTPProducer, RDTPStreamDataset, RDTPStreamLoader
from rdtp.consumer import RDTPConsumer
from rdtp.telemetry import RDTPTelemetry, Theorem1Audit
from rdtp.peripheral import PeripheralStreamCapture

__all__ = [
    "RDTPPacketHeader",
    "CodecType",
    "encode_packet",
    "decode_packet",
    "MAGIC_HEADER",
    "HEADER_SIZE",
    "RDTPProducer",
    "RDTPStreamDataset",
    "RDTPStreamLoader",
    "RDTPConsumer",
    "RDTPTelemetry",
    "Theorem1Audit",
    "PeripheralStreamCapture",
]

