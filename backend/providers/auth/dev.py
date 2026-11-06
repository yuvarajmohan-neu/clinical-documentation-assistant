"""AUTH_PROVIDER=dev: offline fallback. No network call, no JWT parsing.

Exists so P1/P3 can build before Keycloak is ready, and so the live demo
survives if Keycloak misbehaves (docs/architecture.md §2.8 "Fallback").

NEVER select this provider for anything beyond the local hackathon demo —
it trusts the caller completely and performs no real verification.
"""
from __future__ import annotations

from backend.providers.auth.base import AuthError, AuthProvider
from backend.providers.types import Principal, Program

# Mirrors infra/keycloak/realm-jb-demo.json's synthetic demo users exactly,
# so `AUTH_PROVIDER=dev` and `AUTH_PROVIDER=oidc` behave identically for the
# same username.
_DEMO_PRINCIPALS: dict[str, Principal] = {
    "art31.clinician": Principal(
        user_id="art31.clinician",
        name="Alex RiveraDemo",
        roles=["clinician"],
        programs=[Program.ARTICLE31],
    ),
    "act.clinician": Principal(
        user_id="act.clinician",
        name="Jordan KimDemo",
        roles=["clinician"],
        programs=[Program.ADULT_ACT, Program.YOUTH_ACT],
    ),
    "supervisor": Principal(
        user_id="supervisor",
        name="Sam TaylorDemo",
        roles=["supervisor"],
        programs=list(Program),
    ),
}


class DevAuthProvider(AuthProvider):
    """`token` is interpreted as a demo username (e.g. "art31.clinician"),
    not a real bearer token. `default_user` is used when no token is given,
    so the dev server can run with zero client-side setup.
    """

    def __init__(self, default_user: str = "art31.clinician") -> None:
        if default_user not in _DEMO_PRINCIPALS:
            raise ValueError(f"Unknown dev demo user: {default_user!r}")
        self._default_user = default_user

    def verify(self, token: str) -> Principal:
        username = token.strip() or self._default_user
        try:
            return _DEMO_PRINCIPALS[username]
        except KeyError as exc:
            raise AuthError(f"Unknown dev demo user: {username!r}") from exc
