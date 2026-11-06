"""Partial provider registry — P2's slice only (auth, audit).

P3 owns the full registry.py that also wires llm/search/parser/embeddings/
blob/speech/secrets. These two functions are written so P3 can merge them in
directly: same pattern (dict keyed by the *_PROVIDER setting), same return
contract (never a vendor SDK object).
"""
from __future__ import annotations

from sqlmodel import Session

from backend.providers.audit.base import AuditProvider
from backend.providers.audit.db_hashchain import PostgresAuditProvider
from backend.providers.auth.base import AuthProvider
from backend.providers.auth.dev import DevAuthProvider
from backend.providers.auth.oidc import OIDCAuthProvider
from backend.settings import Settings, get_settings


def auth_provider(settings: Settings | None = None) -> AuthProvider:
    settings = settings or get_settings()
    if settings.auth_provider == "dev":
        return DevAuthProvider(default_user=settings.dev_user)
    if settings.auth_provider == "oidc":
        return OIDCAuthProvider(
            issuer=settings.oidc_issuer,
            audience=settings.oidc_audience,
            role_claim=settings.oidc_role_claim,
            tenant_id=settings.oidc_tenant_id,
        )
    raise ValueError(f"Unknown AUTH_PROVIDER: {settings.auth_provider!r}")


def audit_provider(session: Session, settings: Settings | None = None) -> AuditProvider:
    settings = settings or get_settings()
    if settings.audit_provider == "postgres":
        return PostgresAuditProvider(session)
    raise ValueError(f"Unknown AUDIT_PROVIDER: {settings.audit_provider!r}")
