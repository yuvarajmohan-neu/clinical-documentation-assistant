from backend.db.repo import AssessmentRepo, NotesRepo


def test_note_version_and_approve_flow(db_session):
    notes = NotesRepo(db_session)
    assessments = AssessmentRepo(db_session)

    note = notes.create_note(
        program="article31", note_type="progress_note", created_by="art31.clinician"
    )
    v1 = notes.add_version(note_id=note.id, text="SOAP draft v1", created_by="art31.clinician")
    assert v1.version_number == 1

    assessments.create(
        note_id=note.id,
        note_version_id=v1.id,
        status="Needs attention",
        issues=[{"issue": "No client response documented", "severity": "Critical",
                 "element": "Intervention and response", "rule": "A31-RESPONSE-001",
                 "source": "omh-article31-guidance#IV.B", "suggestion": "Document client response."}],
    )
    assert assessments.has_open_critical(note.id) is True

    v2 = notes.add_version(note_id=note.id, text="SOAP draft v2, response added", created_by="art31.clinician")
    assert v2.version_number == 2

    assessments.create(note_id=note.id, note_version_id=v2.id, status="Meets standards", issues=[])
    assert assessments.has_open_critical(note.id) is False

    approved = notes.approve(note.id, approved_by="art31.clinician")
    assert approved.status == "approved"
    assert approved.approved_by == "art31.clinician"

    versions = notes.list_versions(note.id)
    assert [v.version_number for v in versions] == [1, 2]
