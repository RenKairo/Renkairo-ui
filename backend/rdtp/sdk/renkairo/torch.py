"""
RenKairo PyTorch DataLoader Integration
Provides RenKairoStreamDataset for seamless PyTorch pipeline integration.
"""

from typing import Optional, Callable
from .client import stream

try:
    from torch.utils.data import IterableDataset
except ImportError:
    class IterableDataset:  # type: ignore
        pass

class RenKairoStreamDataset(IterableDataset):
    """
    PyTorch IterableDataset backed by the live RenKairo on-demand RDTP stream.
    """
    def __init__(
        self,
        transform: Optional[Callable] = None,
        batch_size: int = 32,
        codec: str = "jpeg",
        host: Optional[str] = None,
        port: Optional[int] = None,
    ):
        self.transform = transform
        self.batch_size = batch_size
        self.codec = codec
        self.host = host
        self.port = port

    def __iter__(self):
        for _hdr, batch in stream(batch_size=self.batch_size, codec=self.codec, host=self.host, port=self.port):
            for img_bytes in batch:
                if self.transform is not None:
                    yield self.transform(img_bytes)
                else:
                    yield img_bytes
