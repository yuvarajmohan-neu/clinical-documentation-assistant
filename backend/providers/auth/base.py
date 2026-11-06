"""AuthProvider interface. Business code depends only on this Protocol —
never on Keycloak/Entra SDK types. See docs/architecture.md §2.7-2.8.
"""
from __future__ import annotations

from typing import Protocol

from backend.providers.types import Principal


class AuthError(Exception):
    """Token missing, malformed, expired, or failing issuer/audience checks."""


class AuthProvider(Protocol):
    def verify(self, token: str) -> Principal:
        """Validate a bearer token and return the caller's Principal.

        Raises AuthError if the token is missing, expired, or invalid.
        """
        ...
