"""SQLModel schema for the shared contract (team-responsibility-split.md §4):
notes, note_versions, assessments, audit_log, kb_documents, kb_chunks —
plus Client/ClinicalSession, which back the synthetic data P2 seeds and
`GET /sessions` serves.

`kb_chunks.embedding` is a plain JSON float list for now so this schema runs
on sqlite in tests without the pgvector extension. P4 swaps it for
`pgvector.sqlalchemy.Vector(dim)` plus a migration once the embedding
dimension is fixed — table shape (not the column type) is the P2/P4 contract.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import JSON, Column, Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


class Client(SQLModel, table=True):
    """Synthetic client record. Never real PHI — CLAUDE.md non-negotiable rule."""

    __tablename__ = "clients"

    id: str = Field(default_factory=_uuid, primary_key=True)
    program: str = Field(index=True)
    external_id: str = Field(index=True)  # e.g. "ART31-C001", human-readable in synthetic-data/*
    name: str
    dob: str  # ISO date string; synthetic, no real DOB math needed
    diagnosis_summary: Optional[str] = None
    goals: list = Field(default_factory=list, sa_column=Column(JSON))  # [{goal_id, description, target_date, status}]


class ClinicalSession(SQLModel, table=True):
    """A synthetic clinical session, pre-filling client/date/time/service/modality (CLAUDE.md req 7)."""

    __tablename__ = "clinical_sessions"

    id: str = Field(default_factory=_uuid, primary_key=True)
    program: str = Field(index=True)
    client_id: str = Field(foreign_key="clients.id", index=True)
    scheduled_at: datetime  # stored UTC; display via util/time_et.py
    service_type: str
    modality: str
    duration_minutes: int
    goal_ids: list = Field(default_factory=list, sa_column=Column(JSON))


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: str = Field(default_factory=_uuid, primary_key=True)
    program: str = Field(index=True)
    note_type: str  # "progress_note" | "treatment_plan_update"
    client_id: Optional[str] = Field(default=None, foreign_key="clients.id")
    session_id: Optional[str] = Field(default=None, foreign_key="clinical_sessions.id")
    source: str = Field(default="drafted")  # "drafted" (Write page) | "pasted" (Check page)
    status: str = Field(default="in_progress")  # "in_progress" | "approved"
    created_by: str
    created_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    current_version_id: Optional[str] = None  # set after the first NoteVersion is written


class NoteVersion(SQLModel, table=True):
    """Immutable. An approved note is never edited — later changes are new
    versions (addenda), each with its own audit entry (architecture §2.10).
    """

    __tablename__ = "note_versions"

    id: str = Field(default_factory=_uuid, primary_key=True)
    note_id: str = Field(foreign_key="notes.id", index=True)
    version_number: int
    text: str
    prompt_version: Optional[str] = None
    ruleset_version: Optional[str] = None
    kb_manifest_hash: Optional[str] = None
    created_by: str
    created_at: datetime


class Assessment(SQLModel, table=True):
    __tablename__ = "assessments"

    id: str = Field(default_factory=_uuid, primary_key=True)
    note_id: str = Field(foreign_key="notes.id", index=True)
    note_version_id: str = Field(foreign_key="note_versions.id")
    status: str  # "Meets standards" | "Meets standards with warnings" | "Needs attention"
    issues: list = Field(default_factory=list, sa_column=Column(JSON))  # list[Issue] (req 21 shape)
    prompt_version: Optional[str] = None
    ruleset_version: Optional[str] = None
    kb_manifest_hash: Optional[str] = None
    created_at: datetime


class AuditLog(SQLModel, table=True):
    """Append-only, hash-chained. The DB role the app connects as must have
    no UPDATE/DELETE grant on this table — enforced outside the ORM, see
    infra/ setup notes. `actor` always comes from a verified Principal.
    """

    __tablename__ = "audit_log"

    id: str = Field(default_factory=_uuid, primary_key=True)
    seq: Optional[int] = Field(default=None, index=True)  # monotonic order; set on insert by the repo layer
    prev_hash: Optional[str] = None
    hash: str
    actor: str
    action: str  # "draft" | "assess" | "edit" | "approve" | "login" | "followup_answer"
    note_id: Optional[str] = None
    version_id: Optional[str] = None
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime


class KBDocument(SQLModel, table=True):
    __tablename__ = "kb_documents"

    id: str = Field(default_factory=_uuid, primary_key=True)
    program: str = Field(index=True)
    doc_id: str = Field(index=True)  # matches manifest.yaml id
    title: str
    url: str
    version: str
    sha256: str
    date: str


class KBChunk(SQLModel, table=True):
    __tablename__ = "kb_chunks"

    id: str = Field(default_factory=_uuid, primary_key=True)
    document_id: str = Field(foreign_key="kb_documents.id", index=True)
    program: str = Field(index=True)
    section: str
    text: str
    token_count: int = 0
    embedding: Optional[list] = Field(default=None, sa_column=Column(JSON))
