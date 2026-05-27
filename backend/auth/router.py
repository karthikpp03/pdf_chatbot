import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.db.database import get_db, User, AuditLog
from backend.auth.security import verify_pw, create_token
from backend.auth.dependencies import get_current_user
from backend.utils.logger import logger

router = APIRouter()


def _audit(db: Session, username: str, action: str, detail: str, ip: str = "") -> None:
    db.add(AuditLog(username=username, action=action, detail=detail, ip=ip,
                    sources_used="[]"))
    db.commit()


@router.post("/login")
async def login(
    form:    OAuth2PasswordRequestForm = Depends(),
    db:      Session = Depends(get_db),
    request: Request = None,
):
    ip   = request.client.host if request else ""
    user = db.query(User).filter(User.username == form.username).first()

    if not user or not verify_pw(form.password, user.hashed_pw) or not user.is_active:
        logger.warning("Failed login: username=%s ip=%s", form.username, ip)
        _audit(db, form.username, "login", "FAILED", ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"sub": user.username, "role": user.role})
    logger.info("Login success: username=%s role=%s ip=%s", user.username, user.role, ip)
    _audit(db, user.username, "login", "SUCCESS", ip)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "username":     user.username,
        "role":         user.role,
        "department":   user.department,
    }


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "username":   user.username,
        "role":       user.role,
        "department": user.department,
        "is_active":  user.is_active,
    }
