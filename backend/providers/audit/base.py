"""AuditProvider interface. See docs/architecture.md §2.4/§2.10, CLAUDE.md req 24."""
from __future__ import annotations

from typing import Protocol

from backend.providers.types import AuditEvent


class AuditProvider(Protocol):
    def append(self, event: AuditEvent) -> str:
        """Append one event to the chain. Returns the new row's id."""
        ...

    def verify_chain(self) -> tuple[bool, str | None]:
        """Recompute the hash chain. Returns (ok, first_broken_row_id_or_None)."""
        ...
