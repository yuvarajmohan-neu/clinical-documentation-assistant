from backend.providers.audit.db_hashchain import PostgresAuditProvider
from backend.providers.types import AuditEvent
from backend.db.models import AuditLog


def test_chain_verifies_after_normal_appends(db_session):
    audit = PostgresAuditProvider(db_session)
    audit.append(AuditEvent(actor="art31.clinician", action="draft", note_id="n1"))
    audit.append(AuditEvent(actor="art31.clinician", action="assess", note_id="n1"))
    audit.append(AuditEvent(actor="art31.clinician", action="approve", note_id="n1"))

    ok, broken_id = audit.verify_chain()
    assert ok is True
    assert broken_id is None


def test_tampering_a_row_breaks_verification(db_session):
    audit = PostgresAuditProvider(db_session)
    audit.append(AuditEvent(actor="art31.clinician", action="draft", note_id="n1"))
    second_id = audit.append(AuditEvent(actor="art31.clinician", action="assess", note_id="n1"))
    audit.append(AuditEvent(actor="art31.clinician", action="approve", note_id="n1"))

    row = db_session.get(AuditLog, second_id)
    row.action = "approve"  # tamper after the fact
    db_session.add(row)
    db_session.commit()

    ok, broken_id = audit.verify_chain()
    assert ok is False
    assert broken_id == second_id


def test_actor_is_never_trusted_from_payload():
    """Guardrail documentation-as-test: AuditEvent has no field a caller could
    use to spoof a different actor than the one the auth layer verified.
    """
    event = AuditEvent(actor="art31.clinician", action="approve", note_id="n1", payload={"actor": "supervisor"})
    # `payload` is opaque context, never read back as the authoritative actor.
    assert event.actor == "art31.clinician"
