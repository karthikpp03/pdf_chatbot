import os
import pathlib
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL    = os.getenv("DATABASE_URL",           "sqlite:///./docmind.db")
SECRET_KEY      = os.getenv("JWT_SECRET",             "change-me-in-production-32chars!!")
ALGORITHM       = "HS256"
TOKEN_HOURS     = int(os.getenv("TOKEN_HOURS",        "8"))
MODEL_NAME      = os.getenv("MODEL_NAME",             "Qwen/Qwen2.5-1.5B-Instruct")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL",        "BAAI/bge-base-en-v1.5")
RERANKER_MODEL  = os.getenv("RERANKER_MODEL",         "BAAI/bge-reranker-base")

STORAGE_DIR     = pathlib.Path(os.getenv("STORAGE_DIR", "storage"))
UPLOADS_DIR     = pathlib.Path(os.getenv("UPLOAD_DIR",  "uploads"))
STORAGE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

FAISS_PATH  = pathlib.Path(os.getenv("FAISS_INDEX_PATH", str(STORAGE_DIR / "faiss.index")))
CHUNKS_PATH = pathlib.Path(os.getenv("CHUNKS_PATH",      str(STORAGE_DIR / "chunks.pkl")))

DEMO_USERS_FILE    = "demo_users.json"
VALID_ROLES        = {"guest", "employee", "manager", "admin"}
VALID_UPLOAD_ROLES = {"guest", "employee", "manager", "admin"}
