from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.utils.config import DATABASE_URL

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()


# ── ORM Models ────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id          = Column(Integer, primary_key=True, index=True)
    username    = Column(String, unique=True, index=True)
    hashed_pw   = Column(String)
    role        = Column(String, default="employee")
    department  = Column(String, default="")
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"
    id            = Column(Integer, primary_key=True, index=True)
    filename      = Column(String, unique=True, index=True)
    department    = Column(String, default="public")
    allowed_roles = Column(String, default="guest")
    uploaded_by   = Column(String)
    chunks        = Column(Integer, default=0)
    uploaded_at   = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    id          = Column(Integer, primary_key=True, index=True)
    username    = Column(String, index=True)
    question    = Column(Text)
    answer      = Column(Text)
    model_used  = Column(String)
    chunks_used = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    # Soft-delete: comma-separated list of usernames who hid this conversation.
    # Admin rows are NEVER physically deleted — only hidden from the owner's view.
    hidden_for  = Column(Text, default="")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String)
    action       = Column(String)
    detail       = Column(Text)
    sources_used = Column(Text, default="[]")
    ip           = Column(String, default="")
    created_at   = Column(DateTime, default=datetime.utcnow)


# ── Session dependency ────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
