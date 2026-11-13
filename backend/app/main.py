"""Clinical Documentation Assistant — DEMO API (mock).

Everything here is in-memory and deterministic: no Keycloak, no database, no KB
ingest, no rule files, no Claude. It exists so the React app can be demoed end to
end. Endpoint shapes follow docs/architecture.md §2.4 so P3's real implementation can
replace it: /programs, /sessions, /draft, /assess (also the single Re-assess call:
note text + follow-up answers in one request), PUT /notes/{id}, /notes/{id}/approve.
Routes are served at both "/" (as documented) and "/api" (what the Vite proxy uses).

Run from the repo root:
    python -m uvicorn backend.app.main:app --reload --port 8000
"""
from __future__ import annotations

import copy
import itertools
from datetime import date

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.util.time_et import format_et, now

from . import mock_engine as engine
from .mock_data import DEV_PRINCIPAL, PROGRAMS, PROGRAMS_BY_ID, clients, find_session, raw_sessions, sample_notes

app = FastAPI(title="CDA demo API (mock)", version="0.1.0-mock")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()
VERSIONS_INFO = {"kb_manifest": "3f9a2c1"}
NOTES: dict[str, dict] = {}
_ids = itertools.count(142)


# ---------------------------------------------------------------- request models
class DraftRequest(BaseModel):
    session_id: str
    input_text: str


class SectionEdit(BaseModel):
    key: str
    text: str


class AssessRequest(BaseModel):
    # Re-assess an existing note: current editor text + follow-up answers, one request.
    note_id: str | None = None
    sections: list[SectionEdit] | None = None
    followup_answers: dict[str, str] | None = None
    # Check a note: pasted text.
    program: str | None = None
    note_type: str | None = None
    text: str | None = None
    date_of_service: str | None = None  # YYYY-MM-DD
    session_id: str | None = None


class NoteUpdate(BaseModel):
    sections: list[SectionEdit]


# ---------------------------------------------------------------- helpers
def _program(pid: str):
    p = PROGRAMS_BY_ID.get(pid)
    if not p:
        raise HTTPException(404, f"Unknown program {pid}")
    if pid not in DEV_PRINCIPAL["programs"]:
        raise HTTPException(403, "Your role doesn't cover this program.")
    return p


def _note(note_id: str) -> dict:
    n = NOTES.get(note_id)
    if not n:
        raise HTTPException(404, "Note not found")
    return n


def _session_view(s: dict) -> dict:
    program = PROGRAMS_BY_ID[s["program"]]
    client = clients(s["program"]).get(s["client_external_id"], {})
    goals = [g for g in client.get("goals", []) if g["goal_id"] in s.get("goal_ids", [])]
    existing = [n for n in NOTES.values() if n.get("session_id") == s["session_id"]]
    latest = existing[-1] if existing else None
    return {
        "session_id": s["session_id"],
        "program": s["program"],
        "client": {"id": s["client_external_id"], "name": client.get("name", s["client_external_id"])},
        "date_time": format_et(s["scheduled_at_dt"]),
        "scheduled_at": s["scheduled_at"],
        "service_type": s["service_type"],
        "modality": s["modality"],
        "duration_minutes": s["duration_minutes"],
        "goals": goals,
        "note_type": program.note_type,
        "note_status": ("Approved" if latest["approved"] else "Draft") if latest else "Not started",
        "note_id": latest["note_id"] if latest else None,
    }


def _snapshot(note: dict, event: str) -> None:
    note["history"].append({
        "version": note["version"],
        "event": event,
        "at": format_et(now()),
        "status": note.get("status"),
        "sections": copy.deepcopy(note["sections"]),
    })


def _run_assess(note: dict) -> None:
    program = PROGRAMS_BY_ID[note["program"]]
    issues = engine.assess(note, program)
    note["issues"] = issues
    note["followups"] = engine.followups_for(issues)
    note["status"] = engine.status_for(issues)
    note["counts"] = {
        "critical": sum(i["severity"] == "Critical" for i in issues),
        "warning": sum(i["severity"] == "Warning" for i in issues),
        "informational": sum(i["severity"] == "Informational" for i in issues),
    }
    note["checked_at"] = format_et(now())


def _draft_text(note: dict) -> str:
    parts = [f"# {note['title']}"]
    parts += [f"## {s['heading']}\n{s['text']}" for s in note["sections"]]
    return "\n\n".join(parts)


def _public(note: dict) -> dict:
    """Shared /draft + /assess response shape (architecture §2.4), plus structured sections for the UI."""
    out = {k: v for k, v in note.items() if k not in ("history", "followups")}
    out["issues"] = [{k: v for k, v in i.items() if k != "followup"} for i in note["issues"]]
    out["draft_text"] = _draft_text(note)
    out["followup_questions"] = note["followups"]
    return out


def _apply_edits(note: dict, edits: dict[str, str]) -> bool:
    changed = False
    for s in note["sections"]:
        if s["key"] in edits and s.get("editable", True) and s["text"] != edits[s["key"]]:
            s["text"] = edits[s["key"]]
            changed = True
    return changed


def _new_note(program, origin: str, **fields) -> dict:
    note_id = f"n-{next(_ids):04d}"
    prompt = "draft.md v1.0" if origin == "drafted" else "assess_content.md v1.0"
    note = {
        "note_id": note_id,
        "program": program.id,
        "program_name": program.name,
        "origin": origin,
        "version": 1,
        "approved": False,
        "approved_at": None,
        "created_at": format_et(now()),
        "versions_info": {
            "prompt": prompt,
            "rules": f"{program.id}.yaml {program.rules_version} + _common_medicaid_nys.yaml v0.2",
            **VERSIONS_INFO,
        },
        "history": [],
        **fields,
    }
    NOTES[note_id] = note
    return note


# ---------------------------------------------------------------- routes
@router.get("/health")
def health():
    return {"ok": True, "mode": "mock", "time": format_et(now())}


@router.get("/me")
def me():
    return DEV_PRINCIPAL


@router.get("/programs")
def programs():
    return [
        {
            "id": p.id, "name": p.name, "short": p.short, "subtitle": p.subtitle,
            "note_type": p.note_type, "note_types": p.note_types,
            "accessible": p.id in DEV_PRINCIPAL["programs"],
            "session_count": len(raw_sessions(p.id)),
        }
        for p in PROGRAMS
    ]


@router.get("/programs/{pid}/sessions")
def sessions(pid: str):
    _program(pid)
    items = sorted(raw_sessions(pid), key=lambda s: s["scheduled_at_dt"], reverse=True)
    return [_session_view(s) for s in items]


@router.get("/sessions")
def sessions_query(program: str):
    return sessions(program)


@router.get("/programs/{pid}/samples")
def samples(pid: str):
    _program(pid)
    return sample_notes(pid)


@router.post("/draft")
def draft(req: DraftRequest):
    s = find_session(req.session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    program = _program(s["program"])
    if not req.input_text.strip():
        raise HTTPException(422, "Add some session notes before drafting.")
    view = _session_view(s)
    note = _new_note(
        program, "drafted",
        session_id=s["session_id"],
        note_type="Progress note",
        title=program.note_title,
        input_text=req.input_text,
        context={
            "client_name": view["client"]["name"],
            "client_id": view["client"]["id"],
            "date_time": view["date_time"],
            "service_type": view["service_type"],
            "modality": view["modality"],
            "duration": f"{view['duration_minutes']} minutes",
            "clinician": DEV_PRINCIPAL["display_name"],
        },
        meta=[],
        goals=view["goals"],
        sections=engine.draft_sections(req.input_text, view["goals"]),
        drafted_at=format_et(now()),
    )
    _run_assess(note)
    _snapshot(note, "Drafted and checked")
    return _public(note)


@router.post("/assess")
def assess(req: AssessRequest):
    if req.note_id:
        note = _note(req.note_id)
        if note["approved"]:
            raise HTTPException(409, "Approved notes are locked.")
        edited = _apply_edits(note, {e.key: e.text for e in req.sections or []})
        answered = 0
        if req.followup_answers and note["origin"] == "drafted":
            # Mock draft-merge: the clinician's answers go verbatim into the matching blanks.
            answered = engine.apply_answers(note["sections"], note["followups"], req.followup_answers)
        if edited or answered:
            note["version"] += 1
        _run_assess(note)
        bits = (["edits saved"] if edited else []) + (
            [f"{answered} follow-up answer{'s' if answered > 1 else ''} added"] if answered else [])
        _snapshot(note, "Re-assessed" + (f" ({', '.join(bits)})" if bits else ""))
        return _public(note)

    if not req.program or not (req.text or "").strip():
        raise HTTPException(422, "Paste a note and choose a program.")
    program = _program(req.program)
    title, meta, sections = engine.parse_pasted(req.text)
    # Goals: from the chosen session, or from a client id found in the pasted header.
    goals: list[dict] = []
    session = find_session(req.session_id) if req.session_id else None
    meta_d = {k.lower(): v for k, v in meta}
    client_line = meta_d.get("client", "")
    if session:
        goals = _session_view(session)["goals"]
    else:
        for cid, c in clients(program.id).items():
            if cid in client_line:
                goals = c.get("goals", [])
    if req.date_of_service:
        date.fromisoformat(req.date_of_service)  # validate
    note = _new_note(
        program, "pasted",
        session_id=session["session_id"] if session else None,
        note_type=req.note_type or "Progress note",
        title=title or f"{req.note_type or 'Progress note'} — {program.name}",
        context=None,
        meta=meta,
        goals=goals,
        sections=sections,
        date_of_service=req.date_of_service,
        drafted_at=None,
        summary_line=" · ".join(
            v for v in [client_line.split("—")[0].strip(), meta_d.get("service type"), meta_d.get("date of service")] if v
        ),
    )
    _run_assess(note)
    _snapshot(note, "Pasted and checked")
    return _public(note)


@router.put("/notes/{note_id}")
def update_note(note_id: str, body: NoteUpdate):
    note = _note(note_id)
    if note["approved"]:
        raise HTTPException(409, "Approved notes are locked. Add an addendum instead.")
    if _apply_edits(note, {e.key: e.text for e in body.sections}):
        note["version"] += 1
        _snapshot(note, "Edited by clinician")
    return _public(note)


@router.post("/notes/{note_id}/approve")
def approve(note_id: str):
    note = _note(note_id)
    if note["approved"]:
        return _public(note)
    _run_assess(note)  # server re-checks; the disabled button in the UI is only a convenience
    if note["counts"]["critical"]:
        return JSONResponse(
            status_code=409,
            content={"detail": "A Critical issue is still open. Fix it, then approve.", "note": _public(note)},
        )
    signed_at = format_et(now())
    for s in note["sections"]:
        if s["key"] == "signature" and note["origin"] == "drafted":
            s["text"] = f"Signed: {DEV_PRINCIPAL['display_name']} — {signed_at}"
        if s["key"] == "signature":
            s["editable"] = False
    note["approved"] = True
    note["approved_at"] = signed_at
    note["signature"] = f"{DEV_PRINCIPAL['display_name']} · Signed {signed_at}"
    _snapshot(note, "Approved and locked")
    return _public(note)


@router.get("/notes/{note_id}/versions")
def versions(note_id: str):
    note = _note(note_id)
    return [{k: v for k, v in h.items()} for h in reversed(note["history"])]


@router.post("/demo/reset")
def reset():
    NOTES.clear()
    return {"ok": True}


app.include_router(router)
app.include_router(router, prefix="/api")
