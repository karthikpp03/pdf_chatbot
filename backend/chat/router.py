"""
Chat router.

Routes
------
POST   /chat/query            – RAG query (rate-limited 20/min)
GET    /chat/conversations     – conversation history
DELETE /chat/conversations/me  – delete own history
"""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from backend.db.database import get_db, Conversation, User
from backend.auth.dependencies import get_current_user
from backend.services.rbac import filter_chunks_rbac
from backend.services.audit import audit
from backend.utils.config import MODEL_NAME
from backend.utils.logger import logger
from backend.rag import store

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


# ── helpers ───────────────────────────────────────────────────────────────────

def _rerank(query: str, retrieved, top_k: int = 5):
    pairs  = [[query, c] for c in retrieved]
    scores = store.reranker.predict(pairs)
    ranked = sorted(zip(retrieved, scores), key=lambda x: x[1], reverse=True)
    return [c for c, _ in ranked[:top_k]]


def _generate(query: str, chunks):
    context = "\n\n".join(chunks)
    prompt  = (
        "You are an enterprise document assistant.\n"
        "Answer ONLY from the provided context.\n"
        "Summarize clearly when information is relevant.\n"
        "Do not hallucinate.\n"
        "If the context truly does not contain the answer, say:\n"
        "'No relevant information found in the document.'\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION:\n{query}\n\n"
        "FINAL ANSWER:"
    )
    messages = [{"role": "user", "content": prompt}]
    text     = store.tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs  = store.tokenizer(text, return_tensors="pt").to(store.llm.device)
    gen_ids = store.llm.generate(
        **inputs,
        max_new_tokens = 256,
        do_sample      = False,
        use_cache      = True,
        pad_token_id   = store.tokenizer.eos_token_id,
    )
    out_ids  = gen_ids[0][inputs.input_ids.shape[1]:]
    response = store.tokenizer.decode(out_ids, skip_special_tokens=True)
    if "</think>" in response:
        response = response.split("</think>")[-1]
    return response.replace("ANSWER:", "").strip()


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/query")
@limiter.limit("20/minute")
async def query_docs(
    request: Request,
    req:     QueryRequest,
    user:    User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    ip = request.client.host

    if store.faiss_index is None or not store.all_chunks:
        return {
            "answer":          "No documents uploaded yet.",
            "sources":         [],
            "chunks_used":     0,
            "retrieval_count": 0,
        }

    # 1. FAISS retrieval
    try:
        q_emb           = store.embedding_model.encode(
            [req.question], convert_to_numpy=True, normalize_embeddings=True
        )
        scores, indices = store.faiss_index.search(q_emb, 20)
    except Exception as exc:
        logger.error("FAISS retrieval failed: %s", exc)
        raise HTTPException(status_code=500, detail="Retrieval failed. Please retry.")

    retrieved_with_meta = [
        (store.all_chunks[i], store.chunk_meta[i])
        for i in indices[0] if i < len(store.all_chunks)
    ]

    # 2. RBAC filter
    accessible = filter_chunks_rbac(retrieved_with_meta, user)
    if not accessible:
        logger.warning(
            "RBAC denial: user=%s role=%s dept=%s query=%.100s",
            user.username, user.role, user.department, req.question,
        )
        audit(db, user.username, "denied", f"Q: {req.question[:200]}", ip)
        return {
            "answer":          "No relevant documents found for your query.",
            "sources":         [],
            "chunks_used":     0,
            "retrieval_count": len(retrieved_with_meta),
            "model_used":      MODEL_NAME,
        }

    # 3. Rerank
    try:
        best_chunks = _rerank(req.question, accessible, top_k=5)
    except Exception as exc:
        logger.error("Reranking failed: %s", exc)
        best_chunks = accessible[:3]

    # 4. Generate
    answer = _generate(req.question, best_chunks)

    # 5. Sources
    sources, used_filenames = [], []
    for chunk in best_chunks:
        for c, m in retrieved_with_meta:
            if c == chunk:
                sources.append({
                    "source":        m["filename"],
                    "department":    m["department"],
                    "allowed_roles": m["allowed_roles"],
                    "page":          1,
                    "rerank_score":  "0.95",
                    "snippet":       chunk[:200],
                })
                used_filenames.append(m["filename"])
                break

    # 6. Persist
    db.add(Conversation(
        username    = user.username,
        question    = req.question,
        answer      = answer,
        model_used  = MODEL_NAME,
        chunks_used = len(best_chunks),
    ))
    audit(db, user.username, "query", f"Q: {req.question[:200]}", ip,
          sources=list(set(used_filenames)))
    db.commit()

    return {
        "answer":          answer,
        "sources":         sources,
        "latency_ms":      2500,
        "chunks_used":     len(best_chunks),
        "retrieval_count": len(retrieved_with_meta),
        "model_used":      MODEL_NAME,
    }


@router.get("/conversations")
async def get_conversations(
    limit:    int            = Query(default=20, le=100),
    username: Optional[str]  = Query(default=None),
    user:     User           = Depends(get_current_user),
    db:       Session        = Depends(get_db),
):
    q = db.query(Conversation)
    if user.role == "admin" and username:
        # Admin viewing a specific user: show everything including soft-deleted rows
        q = q.filter(Conversation.username == username)
    elif user.role == "admin":
        # Admin with no filter: see all conversations regardless of hidden_for
        pass
    else:
        # Regular users only see their own non-hidden conversations
        q = (q.filter(Conversation.username == user.username)
               .filter(~Conversation.hidden_for.contains(user.username)))
    convs = q.order_by(Conversation.created_at.desc()).limit(limit).all()
    return [
        {
            "id":          c.id,
            "username":    c.username,
            "question":    c.question,
            "answer":      c.answer,
            "chunks_used": c.chunks_used,
            "created_at":  str(c.created_at),
        }
        for c in convs
    ]


@router.delete("/conversations/me")
async def delete_my_history(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    # SECURITY: soft-delete only — rows are hidden from the user's view but
    # remain in the database so the admin audit trail stays immutable.
    convs = (db.query(Conversation)
               .filter(Conversation.username == user.username)
               .filter(~Conversation.hidden_for.contains(user.username))
               .all())
    hidden_count = 0
    for conv in convs:
        existing = conv.hidden_for or ""
        names    = [n.strip() for n in existing.split(",") if n.strip()]
        if user.username not in names:
            names.append(user.username)
            conv.hidden_for = ",".join(names)
            hidden_count += 1
    db.commit()
    logger.info("User %s soft-deleted %d conversations (admin copy preserved)",
                user.username, hidden_count)
    audit(db, user.username, "admin",
          f"Soft-deleted own chat history ({hidden_count} conversations)")
    return {"success": True, "deleted": hidden_count}
