"""
DocMind RAG API — main entry point.

Responsibilities
----------------
* Create FastAPI app and register all routers.
* Wire up startup / shutdown lifecycle events:
    - create DB tables
    - seed default users
    - load persisted FAISS index + chunk metadata
    - load ML models (embedding, reranker, LLM, OCR)
* Configure CORS and rate-limiting middleware.
* Expose GET / and GET /status convenience endpoints.

Everything else lives in the domain routers (auth, chat, admin).
"""

from __future__ import annotations

import json
import os
import pickle

try:
    import faiss  # type: ignore
except ImportError:
    faiss = None  # type: ignore
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ── Internal imports ──────────────────────────────────────────────────────────
from backend.utils.logger import logger
from backend.utils.config import (
    FAISS_PATH,
    CHUNKS_PATH,
    DEMO_USERS_FILE,
    MODEL_NAME,
)
from backend.db.database import create_tables, SessionLocal, User
from backend.auth.security import hash_pw
from backend.rag import store  # shared mutable namespace

# Routers — imported after shared state modules to avoid circular refs
from backend.auth.router        import router as auth_router
from backend.auth.dependencies  import get_current_user
from backend.chat.router        import router as chat_router
from backend.admin.router       import router as admin_router

# ── Rate limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── Startup helpers ───────────────────────────────────────────────────────────

def _create_db_tables() -> None:
    create_tables()
    logger.info("Database tables ensured.")


def _seed_users() -> None:
    """Create admin + any demo users on first run. DB is authoritative afterwards."""
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(
                username   = "admin",
                hashed_pw  = hash_pw("admin123"),
                role       = "admin",
                department = "",
            ))
            db.commit()
            logger.info("Default admin created (admin / admin123).")

        if os.path.exists(DEMO_USERS_FILE):
            with open(DEMO_USERS_FILE) as f:
                demo_users = json.load(f)
            for u in demo_users:
                if not db.query(User).filter(User.username == u["username"]).first():
                    db.add(User(
                        username   = u["username"],
                        hashed_pw  = hash_pw(u["password"]),
                        role       = u.get("role", "employee"),
                        department = u.get("department", ""),
                    ))
            db.commit()
            logger.info("Demo users seeded from %s.", DEMO_USERS_FILE)
    finally:
        db.close()


def _load_persisted_vectors() -> None:
    """Restore FAISS index and chunk metadata from disk if available."""
    if FAISS_PATH.exists() and CHUNKS_PATH.exists():
        try:
            store.faiss_index = faiss.read_index(str(FAISS_PATH))
            with open(CHUNKS_PATH, "rb") as f:
                data = pickle.load(f)
            # Mutate in-place so all modules sharing the reference stay in sync
            store.all_chunks.clear()
            store.chunk_meta.clear()
            store.all_chunks.extend(data["chunks"])
            store.chunk_meta.extend(data["meta"])
            logger.info(
                "Loaded %d persisted chunks from %s.",
                len(store.all_chunks),
                CHUNKS_PATH.parent,
            )
        except Exception as exc:
            logger.warning(
                "Could not load persisted vectors (%s) — starting fresh.", exc
            )
            store.all_chunks.clear()
            store.chunk_meta.clear()
            store.faiss_index = None
    else:
        logger.info("No persisted vectors found — starting fresh.")


def _load_ml_models() -> None:
    """
    Load heavy ML models and attach them to the store module so routers can
    import them from a single, already-initialised namespace.

    Models loaded here:
        store.ocr              – PaddleOCR
        store.embedding_model  – SentenceTransformer
        store.reranker         – CrossEncoder
        store.tokenizer        – HF tokenizer
        store.llm              – HF causal-LM (on GPU if available)
    """
    import torch
    from paddleocr import PaddleOCR  # type: ignore
    from sentence_transformers import SentenceTransformer, CrossEncoder
    from transformers import AutoTokenizer, AutoModelForCausalLM

    from backend.utils.config import EMBEDDING_MODEL, RERANKER_MODEL

    logger.info("Loading PaddleOCR…")
    store.ocr = PaddleOCR(use_angle_cls=True, lang="en")

    logger.info("Loading embedding model: %s", EMBEDDING_MODEL)
    store.embedding_model = SentenceTransformer(EMBEDDING_MODEL)

    logger.info("Loading reranker: %s", RERANKER_MODEL)
    store.reranker = CrossEncoder(RERANKER_MODEL)

    logger.info("Loading LLM: %s", MODEL_NAME)
    store.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    store.tokenizer.pad_token = store.tokenizer.eos_token

    device = "cuda" if torch.cuda.is_available() else "cpu"
    store.llm = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
    ).to(device)
    store.llm.eval()
    logger.info("LLM loaded on %s: %s", device.upper(), MODEL_NAME)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────────────────────────────────────
    logger.info("=== DocMind startup ===")
    _create_db_tables()
    _seed_users()
    _load_persisted_vectors()
    _load_ml_models()
    logger.info("=== DocMind ready ===")

    yield  # application runs here

    # ── shutdown ─────────────────────────────────────────────────────────────
    logger.info("=== DocMind shutdown ===")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "DocMind RAG API",
    description = "Enterprise document Q&A with RBAC, hybrid chunking, and persistent FAISS.",
    version     = "2.0.0",
    lifespan    = lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request, exc):
    return JSONResponse(
        status_code = 429,
        content     = {"detail": "Rate limit exceeded: 20 queries/minute"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router,  prefix="/auth",  tags=["auth"])
app.include_router(chat_router,  prefix="/chat",  tags=["chat"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])

# ── Health endpoints ──────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    return {"message": "DocMind RAG Backend Running"}


@app.get("/status", tags=["health"])
async def status(user=Depends(get_current_user)):
    return {
        "active_model":    MODEL_NAME,
        "total_chunks":    len(store.all_chunks),
        "embedder_loaded": hasattr(store, "embedding_model"),
        "reranker_loaded": hasattr(store, "reranker"),
        "username":        user.username,
        "role":            user.role,
    }
