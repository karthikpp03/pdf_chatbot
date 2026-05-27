"""
RBAC enforcement.

A chunk is accessible ONLY IF both conditions are true:
  1. Role gate  — chunk's allowed_roles intersects the user's role hierarchy
  2. Dept gate  — chunk's department is "public" / "all"  OR  in user's assigned departments

Role hierarchy grants inheritance but does NOT bypass department restrictions.
"""

from typing import List
from backend.db.database import User
from backend.auth.dependencies import ROLE_HIERARCHY


def _parse_departments(raw) -> List[str]:
    """Normalise department field — handles str, comma-list, or list."""
    if isinstance(raw, list):
        return [d.strip().lower() for d in raw if d.strip()]
    return [d.strip().lower() for d in str(raw).split(",") if d.strip()]


def _parse_roles(raw) -> List[str]:
    """Normalise allowed_roles field — handles str, comma-list, or list."""
    if isinstance(raw, list):
        return [r.strip().lower() for r in raw if r.strip()]
    return [r.strip().lower() for r in str(raw).split(",") if r.strip()]


def user_can_access_chunk(user: User, meta: dict) -> bool:
    # ── Admin bypass ──────────────────────────────────────────────────────────
    if user.role == "admin":
        return True

    # ── Gate 1: role hierarchy ────────────────────────────────────────────────
    # chunk.allowed_roles stores the MINIMUM role(s) required.
    # A user passes if ANY of their inheritable roles is listed in chunk_roles.
    chunk_roles      = _parse_roles(meta.get("allowed_roles", "guest"))
    allowed_for_user = ROLE_HIERARCHY.get(user.role, [])   # roles this user can act as

    if not any(cr in allowed_for_user for cr in chunk_roles):
        return False

    # ── Gate 2: department ────────────────────────────────────────────────────
    # "public" and "all" are universally readable.
    chunk_depts = _parse_departments(meta.get("department", "public"))

    if any(d in ("public", "all") for d in chunk_depts):
        return True

    # User's own departments (may be comma-separated string in DB)
    user_depts = _parse_departments(user.department or "")

    # At least one chunk department must appear in the user's assigned list
    return any(cd in user_depts for cd in chunk_depts)


def filter_chunks_rbac(chunks_with_meta: list, user: User) -> List[str]:
    return [c for c, m in chunks_with_meta if user_can_access_chunk(user, m)]
