from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.db.database import get_db, User
from backend.auth.security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

ROLE_HIERARCHY = {
    "admin":    ["admin", "manager", "employee", "guest"],
    "manager":  ["manager", "employee", "guest"],
    "employee": ["employee", "guest"],
    "guest":    ["guest"],
}


def get_current_user(
    token: str = Depends(oauth2),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(token)
    user    = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
