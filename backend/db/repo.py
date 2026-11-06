"""Repository layer. P3's services call these instead of writing raw SQL —
this is the seam that keeps the orchestrator storage-agnostic
(team-responsibility-split.md §2 "Database" under P2).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from backend.db.models import Assessment, Note, NoteVersion


class NotesRepo:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_note(
        self,
        *,
        program: str,
        note_type: str,
        created_by: str,
        client_id: str | None = None,
        session_id: str | None = None,
        source: str = "drafted",
    ) -> Note:
        note = Note(
            program=program,
            note_type=note_type,
            client_id=client_id,
            session_id=session_id,
            source=source,
            created_by=created_by,
            created_at=datetime.now(timezone.utc),
        )
        self._session.add(note)
        self._session.commit()
        self._session.refresh(note)
        return note

    def add_version(
        self,
        *,
        note_id: str,
        text: str,
        created_by: str,
        prompt_version: str | None = None,
        ruleset_version: str | None = None,
        kb_manifest_hash: str | None = None,
    ) -> NoteVersion:
        last = self._session.exec(
            select(NoteVersion)
            .where(NoteVersion.note_id == note_id)
            .order_by(NoteVersion.version_number.desc())
        ).first()
        next_number = (last.version_number + 1) if last else 1

        version = NoteVersion(
            note_id=note_id,
            version_number=next_number,
            text=text,
            prompt_version=prompt_version,
            ruleset_version=ruleset_version,
            kb_manifest_hash=kb_manifest_hash,
            created_by=created_by,
            created_at=datetime.now(timezone.utc),
        )
        self._session.add(version)

        note = self._session.get(Note, note_id)
        if note is not None:
            note.current_version_id = version.id
            self._session.add(note)

        self._session.commit()
        self._session.refresh(version)
        return version

    def get_note(self, note_id: str) -> Note | None:
        return self._session.get(Note, note_id)

    def list_versions(self, note_id: str) -> list[NoteVersion]:
        return list(
            self._session.exec(
                select(NoteVersion)
                .where(NoteVersion.note_id == note_id)
                .order_by(NoteVersion.version_number)
            )
        )

    def approve(self, note_id: str, *, approved_by: str) -> Note:
        """Caller (P3's service) must already have checked for open Criticals —
        this repo only writes the result, it doesn't gate it.
        """
        note = self._session.get(Note, note_id)
        if note is None:
            raise ValueError(f"No such note: {note_id}")
        note.status = "approved"
        note.approved_by = approved_by
        note.approved_at = datetime.now(timezone.utc)
        self._session.add(note)
        self._session.commit()
        self._session.refresh(note)
        return note


class AssessmentRepo:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        note_id: str,
        note_version_id: str,
        status: str,
        issues: list[dict],
        prompt_version: str | None = None,
        ruleset_version: str | None = None,
        kb_manifest_hash: str | None = None,
    ) -> Assessment:
        assessment = Assessment(
            note_id=note_id,
            note_version_id=note_version_id,
            status=status,
            issues=issues,
            prompt_version=prompt_version,
            ruleset_version=ruleset_version,
            kb_manifest_hash=kb_manifest_hash,
            created_at=datetime.now(timezone.utc),
        )
        self._session.add(assessment)
        self._session.commit()
        self._session.refresh(assessment)
        return assessment

    def latest_for_note(self, note_id: str) -> Assessment | None:
        return self._session.exec(
            select(Assessment)
            .where(Assessment.note_id == note_id)
            .order_by(Assessment.created_at.desc())
        ).first()

    def has_open_critical(self, note_id: str) -> bool:
        latest = self.latest_for_note(note_id)
        if latest is None:
            return False
        return any(issue.get("severity") == "Critical" for issue in latest.issues)
