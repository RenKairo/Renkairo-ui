"""
RenKairo: Real-Time Integrated Dataset Streaming SDK
===================================================
Seamless on-demand dataset ingestion between RenKairo IDE and remote ML execution runtimes.

Usage:
    import renkairo

    # Generator:
    for img_bytes in renkairo.load_data():
        process(img_bytes)

    # Decorator:
    @renkairo.dataset
    def train(dataset):
        for img in dataset:
            count += 1
"""

from .client import load_data, load_batches, stream, unpack_images, CodecType, RDTPPacketHeader
from .decorators import dataset

__version__ = "1.0.0"
__author__ = "RenKairo Intelligence Lab"

__all__ = [
    "load_data",
    "load_batches",
    "stream",
    "unpack_images",
    "dataset",
    "CodecType",
    "RDTPPacketHeader",
]
