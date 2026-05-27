"""
Admin router.

Routes
------
POST   /admin/upload                    – upload + index a document
DELETE /admin/documents/{filename}      – remove a document
GET    /admin/documents                 – list all documents (RBAC filtered)
POST   /admin/users                     – create user
GET    /admin/users                     – list users
PATCH  /admin/users/{username}          – update user
DELETE /admin/users/{username}          – delete user
GET    /admin/audit                     – audit log
DELETE /admin/reset                     – wipe all documents
"""

import json
import shutil
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.db.database import get_db, User, Document, AuditLog
from backend.auth.dependencies import get_current_user, require_admin
from backend.auth.security import hash_pw
from backend.services.audit import audit
from backend.services.rbac import user_can_access_chunk
from backend.utils.config import (
    UPLOADS_DIR, FAISS_PATH, CHUNKS_PATH, VALID_UPLOAD_ROLES
)
from backend.utils.logger import logger
from backend.rag import store
from backend.rag.extraction import extract_text
from backend.rag.chunking import structured_chunking, clean_text
from backend.rag.indexing import build_faiss_index, persist_vectors

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username:   str     = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$")
    password:   str     = Field(..., min_length=6, max_length=128)
    role:       Literal["guest", "employee", "manager", "admin"] = "employee"
    department: str     = Field(default="", max_length=100)


class UpdateUserRequest(BaseModel):
    role:       Optional[Literal["guest", "employee", "manager", "admin"]] = None
    department: Optional[str]  = Field(default=None, max_length=100)
    is_active:  Optional[bool] = None


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file:          UploadFile = File(...),
    department:    str        = "public",
    allowed_roles: str        = "guest",
    user:          User       = Depends(require_admin),
    db:            Session    = Depends(get_db),
):
    parsed_roles = [r.strip() for r in allowed_roles.split(",") if r.strip()]
    invalid_roles = [r for r in parsed_roles if r not in VALID_UPLOAD_ROLES]
    if invalid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid roles: {invalid_roles}")

    existing = db.query(Document).filter(Document.filename == file.filename).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"'{file.filename}' already exists. Delete it first to re-upload.",
        )

    file_path = UPLOADS_DIR / file.filename
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    logger.info("Upload started: %s dept=%s roles=%s by %s",
                file.filename, department, allowed_roles, user.username)

    try:
        raw_text = extract_text(str(file_path))
        raw_text = clean_text(raw_text)
        chunks   = structured_chunking(raw_text)
    except HTTPException:
        if file_path.exists():
            file_path.unlink()
        raise
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        logger.error("Text extraction failed for %s: %s", file.filename, e)
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

    if not chunks:
        file_path.unlink()
        raise HTTPException(status_code=422, detail="No extractable content found in file.")

    # SECURITY: use the admin-selected department verbatim for ALL chunks.
    # Auto-detection (detect_chunk_department) is removed from the upload path
    # because it silently re-labelled chunks, causing department leakage.
    canonical_dept = department.strip().lower() or "public"

    for chunk in chunks:
        store.all_chunks.append(chunk)
        store.chunk_meta.append({
            "filename":      file.filename,
            "department":    canonical_dept,
            "allowed_roles": parsed_roles,
            "uploaded_by":   user.username,
        })

    try:
        store.faiss_index, _ = build_faiss_index(store.all_chunks)
    except Exception as e:
        logger.error("FAISS index build failed: %s", e)
        raise HTTPException(status_code=500, detail="Vector index build failed.")

    db.add(Document(
        filename      = file.filename,
        department    = department,
        allowed_roles = allowed_roles,
        uploaded_by   = user.username,
        chunks        = len(chunks),
    ))
    db.commit()

    persist_vectors()
    logger.info("Upload complete: %s — %d chunks indexed", file.filename, len(chunks))
    audit(db, user.username, "upload",
          f"{file.filename} dept={department} roles={allowed_roles} chunks={len(chunks)}")

    return {
        "success":       True,
        "filename":      file.filename,
        "department":    department,
        "allowed_roles": allowed_roles,
        "chunks":        len(chunks),
    }


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/documents")
async def get_documents(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    all_docs = db.query(Document).all()
    visible  = []
    for d in all_docs:
        meta = {"department": d.department, "allowed_roles": d.allowed_roles}
        if user_can_access_chunk(user, meta):
            visible.append({
                "source":        d.filename,
                "department":    d.department,
                "allowed_roles": d.allowed_roles,
                "uploaded_by":   d.uploaded_by,
                "uploaded_at":   str(d.uploaded_at),
                "chunks":        d.chunks,
            })
    return {"documents": visible}


@router.delete("/documents/{filename:path}")
async def delete_document(
    filename: str,
    admin:    User    = Depends(require_admin),
    db:       Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.filename == filename).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    keep_pairs = [
        (c, m) for c, m in zip(store.all_chunks, store.chunk_meta)
        if m.get("filename") != filename
    ]

    if keep_pairs:
        new_chunks, new_meta = zip(*keep_pairs)
        store.all_chunks[:] = list(new_chunks)
        store.chunk_meta[:] = list(new_meta)
        try:
            store.faiss_index, _ = build_faiss_index(store.all_chunks)
        except Exception as e:
            logger.error("FAISS rebuild failed after delete: %s", e)
            raise HTTPException(status_code=500, detail="Index rebuild failed after delete.")
    else:
        store.all_chunks.clear()
        store.chunk_meta.clear()
        store.faiss_index = None

    file_path = UPLOADS_DIR / filename
    if file_path.exists():
        file_path.unlink()

    db.delete(doc)
    db.commit()
    persist_vectors()

    logger.info("Document deleted: %s by admin %s", filename, admin.username)
    audit(db, admin.username, "admin", f"Deleted document: {filename}")
    return {"success": True, "filename": filename}


# ── Users ─────────────────────────────────────────────────────────────────────

@router.post("/users")
async def create_user(
    req:   RegisterRequest,
    admin: User    = Depends(require_admin),
    db:    Session = Depends(get_db),
):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    db.add(User(
        username   = req.username,
        hashed_pw  = hash_pw(req.password),
        role       = req.role,
        department = req.department,
    ))
    db.commit()
    logger.info("Admin %s created user %s role=%s", admin.username, req.username, req.role)
    audit(db, admin.username, "admin", f"Created user {req.username} role={req.role}")
    return {"success": True, "username": req.username, "role": req.role}


@router.get("/users")
async def list_users(
    admin: User    = Depends(require_admin),
    db:    Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at).all()
    return [
        {
            "id":         u.id,
            "username":   u.username,
            "role":       u.role,
            "department": u.department,
            "is_active":  u.is_active,
            "created_at": str(u.created_at),
        }
        for u in users
    ]


@router.patch("/users/{username}")
async def update_user(
    username: str,
    req:      UpdateUserRequest,
    admin:    User    = Depends(require_admin),
    db:       Session = Depends(get_db),
):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot modify the root admin account")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.role       is not None: user.role       = req.role
    if req.department is not None: user.department = req.department
    if req.is_active  is not None: user.is_active  = req.is_active
    db.commit()
    logger.info("Admin %s updated user %s", admin.username, username)
    audit(db, admin.username, "admin", f"Updated user {username}")
    return {"success": True}


@router.delete("/users/{username}")
async def delete_user(
    username: str,
    admin:    User    = Depends(require_admin),
    db:       Session = Depends(get_db),
):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete the root admin account")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    logger.info("Admin %s deleted user %s", admin.username, username)
    audit(db, admin.username, "admin", f"Deleted user {username}")
    return {"success": True}


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit")
async def get_audit_logs(
    limit:  int            = Query(default=100, le=500),
    action: Optional[str]  = Query(default=None),
    admin:  User           = Depends(require_admin),
    db:     Session        = Depends(get_db),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        q = q.filter(AuditLog.action == action)
    logs = q.limit(limit).all()
    return [
        {
            "id":           l.id,
            "username":     l.username,
            "action":       l.action,
            "detail":       l.detail,
            "sources_used": json.loads(l.sources_used or "[]"),
            "ip":           l.ip,
            "created_at":   str(l.created_at),
        }
        for l in logs
    ]


# ── Reset ─────────────────────────────────────────────────────────────────────

@router.delete("/reset")
async def reset_documents(
    admin: User    = Depends(require_admin),
    db:    Session = Depends(get_db),
):
    store.all_chunks.clear()
    store.chunk_meta.clear()
    store.faiss_index = None

    if FAISS_PATH.exists():  FAISS_PATH.unlink()
    if CHUNKS_PATH.exists(): CHUNKS_PATH.unlink()

    for f in UPLOADS_DIR.iterdir():
        if f.is_file():
            f.unlink()

    db.query(Document).delete()
    db.commit()

    logger.info("Admin %s cleared all documents", admin.username)
    audit(db, admin.username, "reset", "All documents cleared")
    return {"success": True}
