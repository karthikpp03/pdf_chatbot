"""
FAISS index construction and disk persistence.
Operates on rag.store's shared mutable state.
"""

import pickle
from typing import List

try:
    import faiss  # type: ignore
except ImportError:
    faiss = None  # type: ignore

from backend.utils.config import FAISS_PATH, CHUNKS_PATH
from backend.utils.logger import logger
from backend.rag import store


def build_faiss_index(chunks: List[str]):
    embeddings = store.embedding_model.encode(
        chunks, convert_to_numpy=True, normalize_embeddings=True
    )
    dim = embeddings.shape[1]
    idx = faiss.IndexFlatIP(dim)
    idx.add(embeddings)
    return idx, embeddings


def persist_vectors() -> None:
    """Write FAISS index + chunk metadata to disk."""
    if store.faiss_index is not None and store.all_chunks:
        try:
            faiss.write_index(store.faiss_index, str(FAISS_PATH))
            with open(CHUNKS_PATH, "wb") as f:
                pickle.dump({"chunks": store.all_chunks, "meta": store.chunk_meta}, f)
            logger.info("Persisted %d chunks to %s", len(store.all_chunks), CHUNKS_PATH.parent)
        except Exception as e:
            logger.error("Failed to persist vectors: %s", e)
