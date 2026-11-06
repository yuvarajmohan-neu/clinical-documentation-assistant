"""Central settings, read once from the environment.

Every *_PROVIDER switch named in docs/architecture.md §2.7 lives here, even
though P2 only implements the auth/audit/db pieces — P3's registry.py reads
the rest (llm, search, parser, …) from this same object.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://cda:cda-dev-password@localhost:5432/cda"

    # Auth
    auth_provider: str = "dev"
    dev_user: str = "art31.clinician"
    oidc_issuer: str = "http://localhost:8080/realms/jb-demo"
    oidc_audience: str = "cda-api"
    oidc_role_claim: str = "realm_access.roles"
    oidc_tenant_id: str | None = None

    # Audit
    audit_provider: str = "postgres"


@lru_cache
def get_settings() -> Settings:
    return Settings()
