import json
from typing import List

from sqlalchemy.orm import Session
from backend.db.database import AuditLog


def audit(
    db:      Session,
    username: str,
    action:   str,
    detail:   str,
    ip:       str = "",
    sources:  List[str] = None,
) -> None:
    db.add(AuditLog(
        username     = username,
        action       = action,
        detail       = detail,
        sources_used = json.dumps(sources or []),
        ip           = ip,
    ))
    db.commit()
