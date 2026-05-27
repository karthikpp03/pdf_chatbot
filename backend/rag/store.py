"""
Shared mutable vector-store state.

All modules import from here so there is a single in-process namespace for
all_chunks, chunk_meta, and faiss_index.  Mutate the lists in-place to keep
references valid across modules.
"""
from typing import List

try:
    import faiss  # type: ignore  # not available in all envs (CPU-only installs)
except ImportError:
    faiss = None  # type: ignore

all_chunks: List[str]  = []
chunk_meta: List[dict] = []
faiss_index             = None   # faiss.Index | None
