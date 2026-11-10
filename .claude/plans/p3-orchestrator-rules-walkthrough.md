# P3 walkthrough — what the orchestrator/rules/regulations owner builds

## Context
Team-lead briefing on P3's scope, from `.claude/plans/team-responsibility-split.md` (P3 row) and `docs/architecture.md` (§2.1–2.4, §2.7, §2.10, §2.12). Mirrors the structure of `p1-react-walkthrough.md`, `p2-infra-data-walkthrough.md` and `p4-kb-pipeline-walkthrough.md`.

P3 is deliberately the senior person's full vertical, not four separate hand-offs: **orchestrator → prompts/LLM → rules engine → the regulation content those rules cite**, plus the evaluation script and the demo-visible extras that used to sit with P1. The point of keeping it one person is that rule content and rule *execution* can't drift apart, and the orchestrator can't be designed against rules that don't exist yet. Already built, by P2, and P3 consumes rather than re-decides: `backend/providers/types.py` (`Program`, `Principal`, `Issue`, `Passage`, `NoteDraft`, `Assessment`, `AuditEvent`), `backend/providers/auth/`, `backend/providers/audit/`, `backend/db/`, `backend/util/time_et.py`, `backend/settings.py`. P4 owes P3 exactly one thing: a `SearchProvider.search()` that returns `Passage` objects — P3 owns the `RuleEngine` and `ContentChecker` that consume them.

## 1. P3's deliverable, as four layers
Four things that must work together, built in this order because each is the previous one's input:
1. **Regulation collection** (`knowledge-base/sources/<program>/`, `docs/frameworks/<program>.md`) — the raw material.
2. **Rules content** (`rules/<program>.yaml`, `rules/_common_medicaid_nys.yaml`) — claims about what those documents require, each citing back to step 1.
3. **Rules engine** (`backend/rules_engine/`) — executes step 2's deterministic rules and feeds the `llm_content` ones to the content checker.
4. **Orchestrator** (`backend/app/`, `backend/api/`, `backend/services/`, `backend/providers/llm/`, `prompts/`) — the API surface P1 calls, which runs drafting and ties the rule engine + content checker + citation check together into `/assess`.

Plus two things that ride on top of all four: **evaluation** (`scripts/evaluate.py`) and the **demo-visible extras** moved from P1 (provenance highlighting, clickable citations, evaluation scoreboard, audit verify).

## 2. The work, in build order

### A. Regulation and documentation collection (all 5 programs)
Per program (Adult ACT, Youth ACT, Health Home Care Coordination, Apartment Treatment Housing, Article 31 — Article 31 first, per the stated build order):
1. **Download** the publicly available NYS regulations, OMH/OASAS/DOH program guidance, and Medicaid documentation standards into `knowledge-base/sources/<program>/`, plus the shared `_common_medicaid_nys` set.
2. **Manifest** `manifest.yaml`: `id, title, url, date, version, sha256` per document. This is the one file P4 needs from P3 to run ingest — nothing else about the collection work touches P4.
3. **Documentation framework** write-up per program in `docs/frameworks/<program>.md`: note types (progress note, treatment plan update), required elements, timelines, format (SOAP vs. narrative).
4. Hand the manifest to P4 (ingest), hand the rule list (next section) to P2 (so fail notes target real rule ids).

### B. Rules content (`rules/<program>.yaml`, `rules/_common_medicaid_nys.yaml`)
- One YAML file per program plus the shared Medicaid/NYS file, each entry shaped per architecture §2.2:
  ```yaml
  - id: ACT-A-001
    element: "Client response to intervention"
    type: llm_content | required_field | timeline | signature | pattern
    params: { field: service_date }          # or { max_days_after_service: 2 }
    severity: Critical
    requirement: "Progress note must document client response…"
    source: { doc_id: "omh-act-guidelines-2023", section: "IV.B", url: "…" }
    status: draft | reviewed
    reviewed_by: null
  ```
- **No rule without a source** — the loader in part D rejects any that lack one.
- Workflow: draft each rule's wording with Claude from the collected documents, then **manually verify it against the actual source section** before committing. `status`/`reviewed_by` tracks that this happened (architecture §2.10) — this is real compliance risk if skipped, not busywork.
- A rule's `type` determines who evaluates it: `required_field`, `timeline`, `signature`, `pattern` are evaluated by the deterministic `RuleEngine` (part D); `llm_content` rules are batched to the `ContentChecker` (part D) together with retrieved passages.

### C. Rules engine (`backend/rules_engine/`)
- **Loader/validator**: parses `rules/<program>.yaml` + the common file, merges them, rejects any rule missing `source`, and produces a `ruleset_version` (hash or semver from the files) that gets stamped onto every assessment.
- **Deterministic rule types**, each in plain Python, no LLM call:
  - `required_field` — field present in the parsed note/session.
  - `timeline` — e.g. note signed within N days of service, plan review due by date; uses `backend/util/time_et.py` so tests are reproducible against a fixed clock.
  - `signature` — credentials/signature block present.
  - `pattern` — structural/format checks (e.g. SOAP section headers present).
- **`ContentChecker`**: takes the `llm_content`-typed rules for the current program, the draft/pasted note text, and passages from P4's `SearchProvider.search()`; calls `LLMProvider.complete_structured` (part D) with a schema that returns `Issue[]`.
- All rule types emit the same `Issue` dataclass already defined in `backend/providers/types.py` — P3 doesn't redefine this shape, just populates it.
- Unit tests per rule type, run against fixed session/note fixtures — this is what `pytest` checks in the verification list below.

### D. Orchestrator, LLM layer, prompts (`backend/app/`, `backend/api/`, `backend/services/`, `backend/providers/llm/`, `prompts/`)
- `app/main.py` + `api/` routers implementing the OpenAPI contract (`docs/api.yaml`, already agreed): `GET /programs`, `GET /sessions`, `POST /draft`, `POST /assess`, `POST /followups`, `PUT /notes/{id}`, `POST /notes/{id}/approve`, `GET /notes/{id}/versions`, `GET /audit`. Error model, CORS for Vite, settings from `backend/settings.py` (already has the `*_PROVIDER` fields P2 left for P3).
- `providers/llm/`: `base.py` (`complete_structured(prompt_id, vars, schema) -> T`), `anthropic.py` (check the **claude-api skill** for current model ids before hard-coding one), `azure_foundry.py` stub, `fake.py` replaying recorded outputs for tests/offline demo (architecture §2.10 "deterministic demo"). Nothing outside `providers/llm/` ever imports the Anthropic SDK directly.
- `prompts/draft.md`, `assess_content.md`, `followup.md`, each with a version in front matter. Every draft and assessment stores which prompt version produced it.
- `services/draft.py`: loads session + program framework, retrieves passages via `SearchProvider`, calls Claude, pre-fills known session fields (client, date, time, service type, modality), links interventions/progress to treatment plan goals, and — this is the req-9 guard — sets any gap to `[NOT PROVIDED]` rather than inventing it, returning `blanks[]`. Post-check: every filled section must cite `source_spans` that actually appear in the clinician's input text; a section whose spans don't match gets flagged, not trusted.
- `services/assess.py`: runs the rule engine's deterministic rules, runs the `ContentChecker`'s LLM rules, merges + de-duplicates issues, runs the **citation check** (an `Issue.source` must match a manifest document and one of the actually-retrieved passages, or it's dropped and logged — Claude cannot invent a section cite), computes overall status, and stamps `prompt_version`, `ruleset_version`, `kb_manifest_hash` onto the `Assessment`.
- `services/followup.py`: turns open gaps/issues into targeted questions (`FollowUp{question, element, rule_id}`).
- Approve gate: `POST /notes/{id}/approve` re-runs `/assess` and returns 409 while any Critical issue is open; every action (draft, assess, edit, approve, followup_answer) writes an `AuditEvent` through P2's `AuditProvider`.
- Tests: status computation (Critical→Needs attention, Warning-only→Meets standards with warnings, else→Meets standards), ET formatting, approve-blocked-on-Critical returns 409, LLM structured-output schema validation, invented-content guard (sparse input stays `[NOT PROVIDED]`).

### E. Evaluation and demo-visible extras (moved from P1)
- `scripts/evaluate.py`: runs every synthetic note (P2's `synthetic-data/<program>/notes/{pass,fail}_*.md`) through `/assess`; every `pass_*` note must produce 0 Critical issues, every `fail_*` note must hit the rule ids listed in its `expected.json`, across all 5 programs. Prints the pass/fail matrix — this doubles as the "Impact" evidence for the submission.
- Demo-visible extras (architecture §2.12), P3 exposes the data/endpoints and P1 builds the UI on top:
  1. Provenance highlighting — `source_spans` on draft sections.
  2. Clickable citations — retrieved passage with document, section, page, from the citation check's accepted `Issue.source` values.
  3. Evaluation scoreboard — `evaluate.py`'s matrix, served so the UI can render it.
  4. Audit **Verify** flow (`GET /audit/verify`) for the tamper demo, built on P2's hash-chained `audit_log`.
  5. Stretch: rule explorer (lists `rules/*.yaml` with source links and review status).

## 3. What P3 must NOT do (guardrails)
- **No invented clinical content, ever.** Anything not present in the clinician's input or the session record is `[NOT PROVIDED]` and flagged — never filled from general model knowledge, even to "help." This is CLAUDE.md's hardest rule and the one most likely to look like a bug if skipped.
- **No uncited rule.** A rule without `source: {doc_id, section, url}` is rejected by the loader, not a warning.
- **No uncited issue.** An `Issue` whose `source` doesn't match a real manifest doc + an actually-retrieved passage is dropped, not shown — the citation check exists specifically so Claude can't fabricate a plausible-looking section number.
- **No vendor SDK leakage.** `providers/llm/anthropic.py` is the only file that imports the Anthropic SDK; services and the rule engine only ever see `Issue`, `Passage`, `NoteDraft`, `Assessment` from `backend/providers/types.py`.
- **No skipping manual rule verification.** Claude drafts rule wording from the source documents; a human checks each rule against its actual section before it's committed with `status: reviewed`. `status: draft` rules are real but not yet trusted — don't let the evaluation script or the UI treat them as equivalent to `reviewed`.
- **No retrieval or indexing logic.** That's entirely P4's — P3 only consumes `SearchProvider.search()` and never touches `backend/kb/`.

## 4. Dependencies and ordering for P3
- **Depends on:** P2's `AuthProvider`/`AuditProvider`/DB repos (already built — see Context above) and P4's `SearchProvider` for retrieval. Develop against the provider ABCs and the `fake` LLM/search implementations so nothing blocks on P4's real ingest landing first.
- **P4 depends on P3** for manifests, but P4 builds against sample documents until P3 delivers Article 31's — so P3 isn't holding P4 up by sequencing Article 31 first, as long as the manifest for Article 31 lands reasonably early.
- **P2 depends on P3's rules** to write realistic `fail_*.md` notes with correct `expected.json` rule ids — this is the one place P3's pace can block P2's synthetic-data work, so the Article 31 rule set should land before P2 needs to write Article 31's fail notes.
- **P1 depends on P3's OpenAPI contract and mock server** to build the frontend without waiting for the real `/draft`/`/assess` implementation.
- Internally, the four layers in §2 are strictly ordered per program: collection → rules content → rules engine can run that program's deterministic rules → orchestrator's `/assess` can produce real (not fake) results for that program. The engine and orchestrator code itself is written once and is program-agnostic; only rule *content* and KB documents are per-program, which is why "the other four programs then add only rules, KB documents and synthetic data" (architecture §5) is true — P3's code doesn't get rewritten four more times.

## 5. Risks and open questions to raise with the team
1. **Compliance review bottleneck.** Manual verification of every Claude-drafted rule against its source section is the real critical-path risk for a hackathon timeline — budget for it explicitly rather than treating rule authoring as "mostly automatic."
2. **Citation check false negatives.** If retrieval (P4) returns a passage with a slightly different section label than the manifest's, correct issues could get silently dropped by the citation check. Worth a few early end-to-end runs against real P4 retrieval, not just the `fake` provider, before trusting `evaluate.py`'s numbers.
3. **Rule-type boundary calls.** Some real NYS requirements won't cleanly fit `required_field | timeline | signature | pattern | llm_content` (e.g., "reasonable clinical judgment" language) — decide early how those get force-fit or whether a new rule type is worth adding, since rule *content* authors (possibly not P3 alone, if help is pulled in) need the taxonomy settled first.
4. **Fake-LLM realism.** `LLM_PROVIDER=fake` needs recorded outputs that are representative enough that `evaluate.py` running in CI actually catches regressions — a lazy fake that always returns "no issues" would make the evaluation gate meaningless.
5. **Prompt/rule/KB version coupling.** All three versions get stamped onto every assessment — confirm with P2 early exactly which DB columns/JSON shape `note_versions`/`assessments` expect so this isn't redesigned after P2's schema is already in use.

## Verification (when built)
- `pytest` passes: rule engine (each deterministic type), ET time formatting, status computation, approve-blocked-on-Critical (409), LLM output schema validation, invented-content guard.
- `scripts/evaluate.py` across all 5 programs: every `pass_*` note has 0 Critical issues, every `fail_*` note hits its `expected.json` rule ids; prints the scoreboard.
- Manual run: select a program and session, dictate or type, draft, see issues with source links and severities, answer follow-ups, re-assess, approve (blocked while a Critical is open); the audit log shows every step and `GET /audit/verify` passes, then fails after a row is tampered with.
- Citation spot-check: pick a few `Issue`s from a real (non-fake) `/assess` run and manually confirm each `source` points to real text in the cited manifest doc/section.
- Provider-swap check: `LLM_PROVIDER` from `anthropic` to `fake`, `SEARCH_PROVIDER` from `pgvector` to `qdrant` (once P4 has it) — re-run `evaluate.py`, matrix unchanged in shape (fake LLM output values will differ, but Critical/Warning counts against the recorded fixtures should match).
- Every rule in every committed `rules/<program>.yaml` has `status: reviewed` before the demo, not `draft`.
