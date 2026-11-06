"""AUTH_PROVIDER=oidc: validates a real bearer token against an OIDC issuer.

Works against Keycloak today. Per docs/architecture.md §2.8/§7, switching to
Entra ID later must be a config change only: OIDC_ISSUER, OIDC_AUDIENCE,
OIDC_ROLE_CLAIM (Keycloak: "realm_access.roles", Entra: "roles"), plus
OIDC_TENANT_ID to additionally check the `tid` claim. Nothing here should
hard-code a Keycloak-specific claim shape beyond the configurable role path.
"""
from __future__ import annotations

import jwt
from jwt import PyJWKClient

from backend.providers.auth.base import AuthError, AuthProvider
from backend.providers.types import Principal, Program

_PROGRAM_ROLE_PREFIX = "program:"
_ROLE_TO_PROGRAM = {f"{_PROGRAM_ROLE_PREFIX}{p.value}": p for p in Program}


def _dig(claims: dict, dotted_path: str) -> list[str]:
    """Walk a dotted claim path, e.g. 'realm_access.roles' -> claims['realm_access']['roles']."""
    node = claims
    for part in dotted_path.split("."):
        if not isinstance(node, dict) or part not in node:
            return []
        node = node[part]
    return list(node) if isinstance(node, list) else []


class OIDCAuthProvider(AuthProvider):
    def __init__(
        self,
        issuer: str,
        audience: str,
        role_claim: str = "realm_access.roles",
        tenant_id: str | None = None,
    ) -> None:
        self._issuer = issuer.rstrip("/")
        self._audience = audience
        self._role_claim = role_claim
        self._tenant_id = tenant_id
        self._jwks_client = PyJWKClient(f"{self._issuer}/protocol/openid-connect/certs")

    def verify(self, token: str) -> Principal:
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self._audience,
                issuer=self._issuer,
            )
        except jwt.PyJWTError as exc:
            raise AuthError(str(exc)) from exc

        if self._tenant_id and claims.get("tid") != self._tenant_id:
            raise AuthError("Token tenant (tid) does not match the configured JB tenant")

        raw_roles = _dig(claims, self._role_claim)
        roles = [r for r in raw_roles if not r.startswith(_PROGRAM_ROLE_PREFIX)]
        programs = [
            _ROLE_TO_PROGRAM[r] for r in raw_roles if r in _ROLE_TO_PROGRAM
        ]

        user_id = claims.get("preferred_username") or claims.get("sub")
        if not user_id:
            raise AuthError("Token has no subject/username claim")

        return Principal(
            user_id=user_id,
            name=claims.get("name", user_id),
            roles=roles,
            programs=programs,
        )
