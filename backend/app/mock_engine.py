"""Deterministic stand-ins for /draft and /assess. MOCK ONLY — no AI, no KB, no rule files.

Guardrail kept even in the mock: nothing clinical is invented. Drafting only *places*
the clinician's own sentences into note sections (verbatim); anything not found is
left as "[NOT PROVIDED]". Checks are simple text heuristics shaped like the real
RuleEngine (rule checks) and ContentChecker (content checks) outputs.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from backend.util.time_et import now

from .mock_data import MEDICAID_SOURCE, ProgramConfig

NP = "[NOT PROVIDED]"

_RE_PLAN = re.compile(r"\b(plan|next session|continue|follow[- ]?up|schedule|homework|next week)\b", re.I)
_RE_RESPONSE = re.compile(r"\b(responded|respond|response|demonstrated|was able to|receptive to)\b", re.I)
_RE_INTERVENTION = re.compile(
    r"\b(reviewed|role[- ]?play\w*|taught|practiced|explored|provided|introduced|psychoeducation|"
    r"intervention|coached|modeled|processed|discussed barriers|referred|coordinated)\b",
    re.I,
)
_RE_OBJECTIVE = re.compile(
    r"\b(appeared|affect|oriented|calm|engaged|on time|eye contact|distress|observed|presented|"
    r"groomed|logged in|alert)\b",
    re.I,
)
_RE_MED_NECESSITY = re.compile(
    r"\b(symptom\w*|diagnos\w*|anxiety|panic|depress\w*|mood|medically necessary|functioning|psychosis|"
    r"a1c|diabetes|housing)\b",
    re.I,
)
_RE_DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
_STOP = {"the", "and", "a", "an", "to", "of", "from", "for", "in", "on", "with", "per", "all", "each"}


# ---------------------------------------------------------------- helpers
def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _words(s: str) -> set[str]:
    return {w.rstrip("s") for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in _STOP and len(w) > 2}


def _join(sents: list[str]) -> str:
    return " ".join(s if s.endswith((".", "!", "?")) else s + "." for s in sents) if sents else NP


def _section(key: str, heading: str, text: str, editable: bool = True) -> dict:
    return {"key": key, "heading": heading, "text": text, "editable": editable}


# ---------------------------------------------------------------- draft
def draft_sections(input_text: str, goals: list[dict]) -> list[dict]:
    buckets: dict[str, list[str]] = {"subjective": [], "objective": [], "intervention": [], "response": [], "plan": []}
    for s in _sentences(input_text):
        if _RE_PLAN.search(s):
            buckets["plan"].append(s)
        elif _RE_RESPONSE.search(s):
            buckets["response"].append(s)
        elif _RE_INTERVENTION.search(s):
            buckets["intervention"].append(s)
        elif _RE_OBJECTIVE.search(s):
            buckets["objective"].append(s)
        else:
            buckets["subjective"].append(s)

    # Goal progress: a subjective/objective sentence sharing >= 2 meaningful words with the goal.
    candidates = buckets["subjective"] + buckets["objective"]
    assessment_lines = []
    for g in goals:
        gw = _words(g["description"])
        best = max(candidates, key=lambda s: len(gw & _words(s)), default=None)
        found = best if best and len(gw & _words(best)) >= 2 else None
        assessment_lines.append(f"{g['goal_id']} — {g['description']}: {_join([found]) if found else NP}")
    assessment_lines.append(f"Intervention: {_join(buckets['intervention'])}")
    assessment_lines.append(f"Client response: {_join(buckets['response'])}")

    return [
        _section("subjective", "Subjective", _join(buckets["subjective"])),
        _section("objective", "Objective", _join(buckets["objective"])),
        _section("assessment", "Assessment", "\n".join(assessment_lines)),
        _section("plan", "Plan", _join(buckets["plan"])),
        _section(
            "signature", "Signature",
            "Your signature, credentials and the date and time are added when you approve.",
            editable=False,
        ),
    ]


# ---------------------------------------------------------------- pasted notes
_KNOWN_SECTIONS = {
    "subjective", "objective", "assessment", "plan", "data", "signature", "interventions",
    "intervention", "response", "goals", "progress", "summary",
}
_META_KEYS = {"client", "date of service", "service type", "modality", "duration", "clinician", "date", "time"}


def parse_pasted(text: str) -> tuple[str | None, list[list[str]], list[dict]]:
    """Split a pasted note into (title, meta pairs, sections). Text is kept as written."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    title = None
    meta: list[list[str]] = []
    sections: list[dict] = []
    current: dict | None = None
    signature_lines: list[str] = []

    for raw in text.splitlines():
        line = raw.strip()
        if not line or set(line) <= {"-", "_", "="}:
            if current is not None and current["_lines"] and current["_lines"][-1] != "":
                current["_lines"].append("")
            continue
        clean = line.replace("**", "").replace("__", "")
        bare = clean.lstrip("#").strip().rstrip(":").strip()
        if re.match(r"^signed\b", bare, re.I):
            signature_lines.append(clean)
            continue
        if bare.lower() in _KNOWN_SECTIONS:
            current = {"key": bare.lower(), "heading": bare.title(), "_lines": []}
            sections.append(current)
            continue
        if title is None and not sections and (line.startswith("#") or "note" in bare.lower()) and not meta:
            title = bare
            continue
        m = re.match(r"^([A-Za-z ]{3,24}):\s*(.+)$", clean)
        if not sections and m and m.group(1).strip().lower() in _META_KEYS:
            meta.append([m.group(1).strip(), m.group(2).strip()])
            continue
        if current is None:
            current = {"key": "note", "heading": "Note", "_lines": []}
            sections.append(current)
        current["_lines"].append(clean)

    out = []
    used: set[str] = set()
    for s in sections:
        key = s["key"] if s["key"] not in used else f"{s['key']}-{len(used)}"
        used.add(key)
        if key == "signature":
            signature_lines = s["_lines"] + signature_lines
            continue
        body = "\n".join(s["_lines"]).strip()
        body = re.sub(r"\n{3,}", "\n\n", body)
        out.append(_section(key, s["heading"], body))
    out.append(_section("signature", "Signature", "\n".join(l for l in signature_lines if l).strip()))
    return title, meta, out


# ---------------------------------------------------------------- assess
def _text(sections: list[dict]) -> str:
    return "\n".join(s["text"] for s in sections if s["key"] != "signature")


def _find_section(sections: list[dict], *keys: str) -> dict | None:
    for k in keys:
        for s in sections:
            if s["key"] == k:
                return s
    return None


def _first_date(text: str) -> date | None:
    m = _RE_DATE.search(text or "")
    if not m:
        return None
    mo, d, y = map(int, m.groups())
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def assess(note: dict, program: ProgramConfig) -> list[dict]:
    p = program.rule_prefix
    prog_src = (program.source_label, program.source_url)
    sections = note["sections"]
    pasted = note["origin"] == "pasted"
    full = _text(sections)
    issues: list[dict] = []

    def add(rule, severity, element, issue, requirement, suggestion, section, source=prog_src,
            check="rule", missing_label=None, followup=None):
        issues.append({
            "id": f"{rule}:{len(issues)}",
            "issue": issue, "element": element, "rule": rule,
            "source": source[0], "source_url": source[1],
            "severity": severity, "suggestion": suggestion, "requirement": requirement,
            "check_type": check, "section": section,
            "missing_label": missing_label if pasted else None,
            "followup": followup,
        })

    # 1. Client response to the intervention (Critical, rule check)
    resp_ok = False
    resp_section = "assessment"
    for s in sections:
        for line in s["text"].splitlines():
            if line.lower().startswith("client response:"):
                resp_section = s["key"]
                resp_ok = NP not in line and len(line.split(":", 1)[1].strip()) > 3
    if not resp_ok and pasted and _RE_RESPONSE.search(full):
        resp_ok = True
    if not resp_ok:
        if pasted:
            sec = _find_section(sections, "assessment", "interventions", "intervention", "data", "note")
            resp_section = sec["key"] if sec else sections[0]["key"]
        add(f"{p}-RESPONSE-001", "Critical", "Client response",
            "Client response to the intervention is missing",
            "Progress notes must describe the client's response to the services provided.",
            "Describe how the client responded to the intervention — what they said or did, and whether "
            "they could use the skill." + ("" if pasted else " See the follow-up question."),
            resp_section, missing_label="the client's response to the intervention",
            followup={"question": "How did the client respond to the intervention?",
                      "line_prefix": "Client response"})

    # 2. Goal progress blanks (Warning, content check)
    for s in sections:
        for line in s["text"].splitlines():
            m = re.match(r"^(G\d+)\b.*?:\s*(.*)$", line)
            if m and NP in m.group(2):
                gid = m.group(1)
                desc = line.split("—", 1)[1].rsplit(":", 1)[0].strip() if "—" in line else gid
                add(f"{p}-GOALPROG-004", "Warning", "Goal progress",
                    f"No progress recorded for Goal {gid}",
                    "Notes should record progress toward each treatment plan goal addressed in the session.",
                    f"Add the client's progress toward {gid}, or remove {gid} from this session.",
                    s["key"], check="content",
                    followup={"question": f"What progress did the client make toward {gid} ({desc.rstrip('.')})?",
                              "line_prefix": gid})

    # 3. Other blank sections (Warning, rule check)
    prompts = {
        "subjective": "What did the client report since the last session?",
        "objective": "What did you observe about the client in the session (appearance, affect, engagement)?",
        "plan": "What is the plan for next steps and the next session?",
    }
    for s in sections:
        if s["key"] in prompts and s["text"].strip() in ("", NP):
            add(f"{p}-REQ-005", "Warning", s["heading"],
                f"{s['heading']} section is blank",
                f"Each note must document the {s['heading'].lower()} portion of the program's note format.",
                f"Add the {s['heading'].lower()} information from the session.",
                s["key"], missing_label=f"{s['heading'].lower()} information",
                followup={"question": prompts[s["key"]], "line_prefix": ""})

    if pasted:
        meta = {k.lower(): v for k, v in note.get("meta", [])}
        # 4. Required fields (Critical, rule check)
        for field_name in ("Date of service", "Service type", "Duration"):
            if field_name.lower() not in meta and not (field_name == "Date of service" and note.get("date_of_service")):
                add(f"{p}-REQFIELD-006", "Critical", field_name, f"{field_name} is missing",
                    f"Each note must record the {field_name.lower()}.",
                    f"Add a line '{field_name}: …' at the top of the note.", sections[0]["key"],
                    missing_label=field_name.lower())
        # 5. Signature (Critical, rule check)
        sig = _find_section(sections, "signature")
        sig_text = sig["text"] if sig else ""
        signed = bool(re.search(r"signed", sig_text, re.I) and _first_date(sig_text))
        if not signed:
            add(f"{p}-SIGN-002", "Critical", "Signature", "Note is not signed",
                "Each note must be signed by the clinician who provided the service, with credentials and date.",
                "Add your signature, credentials and the date and time signed at the end of the note.",
                "signature", missing_label="clinician signature, credentials, and date and time signed",
                followup={"question": "Who signed this note, and on what date and time?", "line_prefix": ""})
        # 6. Timeliness (Warning, rule check)
        dos = None
        if note.get("date_of_service"):
            dos = date.fromisoformat(note["date_of_service"])
        else:
            dos = _first_date(meta.get("date of service", ""))
        if dos:
            limit = timedelta(days=program.timeliness_days)
            signed_on = _first_date(sig_text) if signed else None
            today = now().date()
            late = (signed_on - dos > limit) if signed_on else (today - dos > limit)
            if late:
                ds = f"{dos.month}/{dos.day}/{dos.year}"
                add(f"{p}-TIMELY-003", "Warning", "Timeliness", "Note wasn't completed on time",
                    f"Notes must be completed within the program's required timeframe "
                    f"({program.timeliness_days} day{'s' if program.timeliness_days > 1 else ''}) after the service.",
                    (f"Service was on {ds} and the note is still unsigned. Sign it now and mark it as a late entry."
                     if not signed_on else f"Service was on {ds}; mark the note as a late entry."),
                    "signature")

    # 7. Measurable progress (Informational, content check) — progress lines, not the plan.
    for s in sections:
        if s["key"] in ("plan", "signature"):
            continue
        for line in s["text"].splitlines():
            gm = re.search(r"\b(G\d+)\b", line)
            if not gm or NP in line:
                continue
            body = line.split(":", 1)[1] if (line.startswith(gm.group(1)) and ":" in line) else line
            if not re.search(r"\d", re.sub(r"\bG\d+\b", "", body)):
                add("MEASURABLE-001", "Informational", "Measurable progress",
                    f"Progress on {gm.group(1)} isn't measured against its target",
                    "Progress should be measurable against the treatment plan goal.",
                    f"Consider stating progress toward {gm.group(1)} with a number that matches the goal's target.",
                    s["key"], source=MEDICAID_SOURCE, check="content")

    # 8. Medical necessity (Informational, content check)
    if full.strip() and not _RE_MED_NECESSITY.search(full):
        add("MED-NECESSITY-002", "Informational", "Medical necessity", "Medical necessity could be clearer",
            "Medicaid-billed services must be documented as medically necessary.",
            "Consider a sentence linking today's intervention to the symptoms in the treatment plan.",
            "assessment" if _find_section(sections, "assessment") else sections[0]["key"],
            source=MEDICAID_SOURCE, check="content")

    order = {"Critical": 0, "Warning": 1, "Informational": 2}
    issues.sort(key=lambda i: order[i["severity"]])
    return issues


def status_for(issues: list[dict]) -> str:
    sev = {i["severity"] for i in issues}
    if "Critical" in sev:
        return "Needs attention"
    if "Warning" in sev:
        return "Meets standards with warnings"
    return "Meets standards"


def followups_for(issues: list[dict]) -> list[dict]:
    out = []
    for i in issues:
        f = i.get("followup")
        if not f:
            continue
        out.append({
            "id": f"fq-{len(out) + 1}",
            "question": f["question"],
            "fills": f"{i['element']} · {i['rule']}",
            "section": i["section"],
            "line_prefix": f["line_prefix"],
        })
    return out


def apply_answers(sections: list[dict], followups: list[dict], answers: dict[str, str]) -> int:
    """Put the clinician's own answers into the matching [NOT PROVIDED] blank. Returns count applied."""
    applied = 0
    for fq in followups:
        answer = (answers.get(fq["id"]) or "").strip()
        if not answer:
            continue
        for s in sections:
            if s["key"] != fq["section"] or not s.get("editable", True):
                continue
            if not fq["line_prefix"]:
                if s["text"].strip() in ("", NP):
                    s["text"] = answer
                    applied += 1
                continue
            lines = s["text"].splitlines()
            for idx, line in enumerate(lines):
                if line.lower().startswith(fq["line_prefix"].lower()) and NP in line:
                    lines[idx] = line.replace(NP, answer, 1)
                    applied += 1
                    break
            s["text"] = "\n".join(lines)
    return applied


