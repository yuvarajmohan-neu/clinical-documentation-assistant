"""Contract test for AuthProvider. Runs against `dev` directly; `oidc` needs a
live Keycloak, so it's covered by the manual access tests in docs/architecture.md §6,
not here.
"""
import pytest

from backend.providers.auth.base import AuthError
from backend.providers.auth.dev import DevAuthProvider
from backend.providers.types import Program


def test_dev_provider_known_user_returns_expected_programs():
    provider = DevAuthProvider()
    principal = provider.verify("art31.clinician")
    assert principal.user_id == "art31.clinician"
    assert "clinician" in principal.roles
    assert principal.programs == [Program.ARTICLE31]


def test_dev_provider_supervisor_sees_all_programs():
    provider = DevAuthProvider()
    principal = provider.verify("supervisor")
    assert "supervisor" in principal.roles
    assert set(principal.programs) == set(Program)


def test_dev_provider_empty_token_falls_back_to_default_user():
    provider = DevAuthProvider(default_user="act.clinician")
    principal = provider.verify("")
    assert principal.user_id == "act.clinician"


def test_dev_provider_unknown_user_raises():
    provider = DevAuthProvider()
    with pytest.raises(AuthError):
        provider.verify("not.a.real.user")


def test_wrong_program_access_is_the_frontends_job_not_the_providers():
    """AuthProvider only identifies the caller. The 403-for-wrong-program
    check (architecture §6 access test) belongs to a `require_program`
    FastAPI dependency in P3's routers, which checks Principal.can_access().
    """
    principal = DevAuthProvider().verify("art31.clinician")
    assert principal.can_access(Program.ARTICLE31) is True
    assert principal.can_access(Program.ADULT_ACT) is False
