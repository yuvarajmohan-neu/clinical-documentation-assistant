"""Static demo configuration + loaders for synthetic-data/.

MOCK ONLY. Program configs, rule ids and section citations here are placeholders
until P4's rules/<program>.yaml and the KB pipeline exist. Source document titles
and URLs come from knowledge-base/sources/<program>/manifest.yaml.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC = REPO_ROOT / "synthetic-data"

MEDICAID_SOURCE = (
    "18 NYCRR §504.3 Provider records",
    "https://www.law.cornell.edu/regulations/new-york/18-NYCRR-504.3",
)


@dataclass(frozen=True)
class ProgramConfig:
    id: str
    name: str
    short: str
    subtitle: str
    rule_prefix: str
    note_type: str
    note_title: str
    source_label: str
    source_url: str
    timeliness_days: int
    rules_version: str = "v0.3"
    note_types: list[str] = field(default_factory=lambda: ["Progress note", "Treatment plan update"])


# Display order matches docs/mockups/02-session-setup.png.
PROGRAMS: list[ProgramConfig] = [
    ProgramConfig(
        id="adult_act", name="Adult ACT", short="Adult ACT", subtitle="Assertive Community Treatment",
        rule_prefix="AACT", note_type="ACT contact note", note_title="ACT Contact Note — Adult ACT",
        source_label="OMH Adult ACT Program Guidelines (2025)",
        source_url="https://omh.ny.gov/omhweb/act/act-program-guidelines.pdf", timeliness_days=2,
    ),
    ProgramConfig(
        id="youth_act", name="Youth ACT", short="Youth ACT", subtitle="Assertive Community Treatment",
        rule_prefix="YACT", note_type="ACT contact note", note_title="ACT Contact Note — Youth ACT",
        source_label="OMH Youth ACT Program and Billing Guidance (2024)",
        source_url="https://omh.ny.gov/omhweb/guidance/youth-act-program-guidance.pdf", timeliness_days=2,
    ),
    ProgramConfig(
        id="health_home", name="Health Home Care Coordination", short="Health Home",
        subtitle="Care management", rule_prefix="HH", note_type="Care management note",
        note_title="Care Management Note — Health Home",
        source_label="NYS DOH Health Home Standards and Requirements (2022)",
        source_url="https://healthweb-back.health.ny.gov/health_care/medicaid/program/medicaid_health_homes/docs/hh_mco_cm_standards.pdf",
        timeliness_days=3,
    ),
    ProgramConfig(
        id="apt_treatment", name="Apartment Treatment Housing", short="Apartment Treatment",
        subtitle="Residential", rule_prefix="ATH", note_type="Residential progress note",
        note_title="Progress Note — Apartment Treatment Housing",
        source_label="14 NYCRR 595.14 Case records and reports",
        source_url="https://www.law.cornell.edu/regulations/new-york/14-NYCRR-595.14", timeliness_days=3,
    ),
    ProgramConfig(
        id="article31", name="Article 31 Outpatient Clinic", short="Article 31", subtitle="Therapy visits",
        rule_prefix="A31", note_type="Progress note (SOAP)",
        note_title="Progress Note — Article 31 Outpatient Clinic",
        source_label="14 NYCRR Part 599 · §599.11 Clinical records",
        source_url="https://omh.ny.gov/omhweb/clinic_restructuring/part599/mhotrs-regulations.pdf",
        timeliness_days=1,
    ),
]
PROGRAMS_BY_ID = {p.id: p for p in PROGRAMS}

# Mirrors frontend/src/auth/AuthContext.tsx DEV_PRINCIPAL (AUTH_PROVIDER=dev).
DEV_PRINCIPAL = {
    "user_id": "demo.clinician",
    "name": "Demo Clinician",
    "display_name": "Demo Clinician (synthetic)",
    "roles": ["clinician"],
    "programs": ["article31", "health_home"],
}


def _load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _display_date(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d.month}/{d.day}/{d.year}"


@lru_cache
def clients(program: str) -> dict[str, dict]:
    path = SYNTHETIC / program / "clients.json"
    if not path.exists():
        return {}
    out = {}
    for c in _load_json(path):
        c = dict(c)
        c["goals"] = [
            {**g, "target_date_display": _display_date(g["target_date"])} for g in c.get("goals", [])
        ]
        out[c["external_id"]] = c
    return out


@lru_cache
def raw_sessions(program: str) -> list[dict]:
    path = SYNTHETIC / program / "sessions.json"
    if not path.exists():
        return []
    result = []
    for i, s in enumerate(_load_json(path), start=1):
        s = dict(s)
        s["session_id"] = f"{program}-{i:02d}"
        s["program"] = program
        s["scheduled_at_dt"] = datetime.fromisoformat(s["scheduled_at"])
        result.append(s)
    return result


def find_session(session_id: str) -> dict | None:
    program = session_id.rsplit("-", 1)[0]
    for s in raw_sessions(program):
        if s["session_id"] == session_id:
            return s
    return None


def sample_notes(program: str) -> list[dict]:
    """Synthetic pass/fail notes for the Check-a-note page (synthetic-data/<program>/notes)."""
    notes_dir = SYNTHETIC / program / "notes"
    out = []
    if not notes_dir.exists():
        return out
    for path in sorted(notes_dir.glob("*.md")):
        if not (path.name.startswith("pass_") or path.name.startswith("fail_")):
            continue
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()
        kind = "pass" if path.name.startswith("pass_") else "fail"
        out.append({
            "id": path.stem,
            "kind": kind,
            "label": f"{'Passing' if kind == 'pass' else 'Failing'} example ({path.stem})",
            "text": text,
        })
    return out
