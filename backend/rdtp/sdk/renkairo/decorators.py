"""
RenKairo Decorators
Enables @renkairo.dataset to wrap training functions or custom pipelines.
"""

from functools import wraps
from typing import Callable, Optional
from .client import load_data, stream

def dataset(
    func: Optional[Callable] = None,
    *,
    batch_size: int = 32,
    codec: str = "jpeg",
    host: Optional[str] = None,
    port: Optional[int] = None,
    as_batches: bool = False,
):
    """
    Decorator that supplies the RenKairo on-demand dataset as the first argument.

    Usage:
        import renkairo

        @renkairo.dataset
        def process(images):
            for img in images:
                ...

        process()
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if as_batches:
                data_gen = stream(batch_size=batch_size, codec=codec, host=host, port=port)
            else:
                data_gen = load_data(batch_size=batch_size, codec=codec, host=host, port=port)
            return fn(data_gen, *args, **kwargs)
        return wrapper

    if func is not None:
        return decorator(func)
    return decorator
