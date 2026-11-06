"""Shared types every provider and service depends on.

Business code and other providers import ONLY these types — never a vendor
SDK object (Keycloak's JWT claims dict, a psycopg row, etc.). Adapters are
responsible for translating into these shapes. See CLAUDE.md "Provider
wrappers" rule and team-responsibility-split.md's shared contracts §2.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Literal


class Program(str, Enum):
    ADULT_ACT = "adult_act"
    YOUTH_ACT = "youth_act"
    HEALTH_HOME = "health_home"
    APT_TREATMENT = "apt_treatment"
    ARTICLE31 = "article31"


Severity = Literal["Critical", "Warning", "Informational"]
Status = Literal["Meets standards", "Meets standards with warnings", "Needs attention"]


@dataclass(frozen=True)
class Principal:
    """The verified identity of the caller. Never built from the request body."""

    user_id: str
    name: str
    roles: list[str] = field(default_factory=list)
    programs: list[Program] = field(default_factory=list)

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def can_access(self, program: Program) -> bool:
        return program in self.programs


@dataclass(frozen=True)
class Source:
    doc_id: str
    section: str
    url: str


@dataclass(frozen=True)
class Issue:
    """Fixed AI output schema, CLAUDE.md req 21."""

    issue: str
    element: str
    rule: str
    source: str
    severity: Severity
    suggestion: str


@dataclass(frozen=True)
class Passage:
    source_id: str
    section: str
    url: str
    text: str
    score: float = 0.0


@dataclass(frozen=True)
class NoteDraft:
    note_id: str
    draft_text: str
    blanks: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Assessment:
    status: Status
    issues: list[Issue] = field(default_factory=list)
    prompt_version: str | None = None
    ruleset_version: str | None = None
    kb_manifest_hash: str | None = None


@dataclass(frozen=True)
class AuditEvent:
    """What P2's AuditProvider.append() takes. `actor` is a Principal.user_id,
    supplied by the caller from a verified token — never from a request body.
    """

    actor: str
    action: Literal["draft", "assess", "edit", "approve", "login", "followup_answer"]
    note_id: str | None
    version_id: str | None = None
    payload: dict = field(default_factory=dict)
    occurred_at: datetime | None = None
