"""AUDIT_PROVIDER=postgres: append-only, hash-chained audit_log table.

Each row stores sha256(canonical_event_json + prev_hash). Tampering with any
row breaks the chain from that point forward — the "tamper demo"
(docs/architecture.md §2.12 item 4).

IMPORTANT (not enforced by this code): the Postgres role the app connects as
must have no UPDATE/DELETE grant on audit_log. That has to be a DB-level
GRANT, applied in a migration — this class merely never issues those
statements, which is not the same guarantee.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from backend.providers.audit.base import AuditProvider
from backend.providers.types import AuditEvent
from backend.db.models import AuditLog


def _canonical(event: AuditEvent, prev_hash: str | None) -> bytes:
    """Deterministic encoding so the same event always hashes the same way."""
    body = {
        "actor": event.actor,
        "action": event.action,
        "note_id": event.note_id,
        "version_id": event.version_id,
        "payload": event.payload,
        "prev_hash": prev_hash,
    }
    return json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")


class PostgresAuditProvider(AuditProvider):
    def __init__(self, session: Session) -> None:
        self._session = session

    def append(self, event: AuditEvent) -> str:
        last = self._session.exec(
            select(AuditLog).order_by(AuditLog.seq.desc())
        ).first()
        prev_hash = last.hash if last else None
        next_seq = (last.seq + 1) if last and last.seq is not None else 1

        digest = hashlib.sha256(_canonical(event, prev_hash)).hexdigest()

        row = AuditLog(
            seq=next_seq,
            prev_hash=prev_hash,
            hash=digest,
            actor=event.actor,
            action=event.action,
            note_id=event.note_id,
            version_id=event.version_id,
            payload=event.payload,
            created_at=event.occurred_at or datetime.now(timezone.utc),
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row.id

    def verify_chain(self) -> tuple[bool, str | None]:
        rows = self._session.exec(select(AuditLog).order_by(AuditLog.seq)).all()
        prev_hash = None
        for row in rows:
            reconstructed = AuditEvent(
                actor=row.actor,
                action=row.action,  # type: ignore[arg-type]
                note_id=row.note_id,
                version_id=row.version_id,
                payload=row.payload,
            )
            expected = hashlib.sha256(_canonical(reconstructed, prev_hash)).hexdigest()
            if expected != row.hash or row.prev_hash != prev_hash:
                return False, row.id
            prev_hash = row.hash
        return True, None
