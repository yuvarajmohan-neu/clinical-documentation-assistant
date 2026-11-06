# Clinical Documentation Assistant — Team Responsibility Split

## Context
The repo is greenfield: only `CLAUDE.md`, `docs/architecture.md`, diagrams and the brand/azure skills exist. This plan assigns ownership across four people so each can build against agreed contracts without blocking the others. It contains responsibilities only, with no schedule.

| Person | Ownership |
|---|---|
| **P1** | React web application, submission documents |
| **P2** | Keycloak, DB, Audit log, synthetic demo data |
| **P3** | Backend orchestrator, prompts, LLM adapters, citation check, evaluation script, demo-visible extras |
| **P4** | RAG pipeline, search, rules engine code, **plus all regulation/documentation collection** (sources, program frameworks, rules content). Rule drafting is done with Claude, then verified against each source section. P4 takes this from P3 because the orchestrator and the regulation work were too much for one person. |

Note: P2 and P4 share the load, so P4's search work leans on P2's table schema early. If P4 is overloaded, move the rules engine code to P2 and keep P4 on regulations, rules and ingest.

## Shared contracts (agreed by all four before building)
1. **Repo scaffold** (P3): `backend/`, `frontend/`, `infra/`, `rules/`, `prompts/`, `knowledge-base/`, `synthetic-data/`, `.env.example`, `.gitignore` (incl. `.env`).
2. **Shared types** in `backend/providers/types.py`: `Passage`, `Principal`, `Issue` (exact schema from CLAUDE.md req 21), `Program` enum, `NoteDraft`, `Assessment` (status, issues[], prompt_version, ruleset_version, kb_manifest_hash).
3. **OpenAPI contract** `docs/api.yaml`:
   - `GET /programs`, `GET /sessions?program=`, `GET /sessions/{id}`
   - `POST /draft` → `{note_id, draft_text, blanks[]}`
   - `POST /assess` → `{status, issues[]}` (draft or pasted text)
   - `POST /followups` → `{questions[]}`
   - `PUT /notes/{id}`, `POST /notes/{id}/approve` (409 while a Critical is open)
   - `GET /notes/{id}/versions`, `GET /audit?note_id=`
4. **DB schema** (proposed by P2, signed off by all): `notes`, `note_versions`, `assessments`, `audit_log`, `kb_documents`, `kb_chunks`.
5. **Provider ABCs** in `backend/providers/<cap>/base.py`: `LLMProvider.complete_structured`, `SearchProvider.search(query, programs, k) -> list[Passage]`, `AuditProvider.record(event)`, `AuthProvider.verify(token) -> Principal`.
6. **Mock API server** (P3) returning canned JSON so P1 can build without waiting.
7. **Rule file format** (P3 defines, P4 consumes): every rule has `id, element, type, severity, requirement, source`; `source` must point to a collected document and section.
8. **ET time helper** `backend/util/time_et.py` (P3): 12-hour Eastern, e.g. `11/6/2026 2:05 PM ET`.

---

## P1 — React web application (+ evaluation, submission)

**Web app** (`frontend/`, Vite + React + TypeScript)
- Load the **jewish-board-brand skill** (`.claude/skills/jewish-board-brand/references/web-guide.md`, `scripts/jb_brand.py`) before any styling. Logo, colours and fonts via brand tokens only.
- Typed API client generated from `docs/api.yaml`; develop against P3's mock first, then the real API.
- Components in `src/components/`:
  1. `ProgramSelector.tsx`: five programs; locked when the Keycloak role implies the program.
  2. Session picker: lists synthetic sessions and pre-fills client, date, time, service type and modality (12-hour ET).
  3. **Two pages** under one app shell: **Write a note** (`pages/WriteNote.tsx`) and **Check a note** (`pages/CheckNote.tsx`). Separate pages, no mode toggle.
     - `DictationBox.tsx` (Write page): type or **dictate** with the browser Web Speech API (interim text, unsupported-browser fallback). Calls `/draft` then `/assess`.
     - `PasteBox.tsx` (Check page): paste a finished note, pick the note type, optional date of service. Calls `/assess` only.
     - Both pages hand off to the same shared review screen (items 4–7 below), driven by one `useNoteReview` hook.
  4. `NoteEditor.tsx` (shared): editable draft or pasted note, `[NOT PROVIDED]` blanks highlighted and navigable, goal links visible, save via `PUT /notes/{id}`.
  5. `IssuesPanel.tsx`: per issue, what's wrong, the requirement with a clickable source, how to fix it, and a severity badge (icon plus colour, not colour alone). Click an issue to jump to the text. Follow-up questions with answer boxes that feed back into the draft.
  6. `StatusBanner.tsx`: Meets standards / Meets standards with warnings / Needs attention, shown before finalization.
  7. Approve flow: confirm dialog, button disabled while a Critical is open, version history drawer.
  8. `src/auth/`: `react-oidc-context` against Keycloak, bearer token on every call, role → program.
- Loading, empty and error states; keyboard and screen-reader accessibility.

**Submission pack** (`docs/submission/`): problem, solution, impact metrics (time per note, first-pass compliance, audit findings), implementation approach, cost and value, risks/oversight/security/assumptions, and the demo script.

**Depends on:** P3 (OpenAPI, mock, real API), P2 (Keycloak realm), P2 (synthetic data for evaluation).

---

## P2 — Keycloak, DB, Audit log (+ synthetic data)

**Infra** (`infra/`)
- `docker-compose.yml`: Postgres with **pgvector** and Keycloak, healthchecks, named volumes.
- `keycloak/realm-jb-demo.json`: realm, SPA client (PKCE), API audience, **synthetic users only**, one role per program (`program:adult_act`, `program:youth_act`, `program:health_home`, `program:apt_treatment`, `program:article31`) plus `clinician` and `supervisor`, role claim mapper. Document `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_ROLE_CLAIM` in `.env.example`.

**Auth provider** (`backend/providers/auth/`): `base.py`, `oidc.py` (JWKS, issuer/audience/expiry checks, role → program → `Principal`), `dev.py` (`AUTH_PROVIDER=dev` offline fallback), FastAPI `current_principal` dependency, contract tests in `tests/providers/`.

**Database** (`backend/db/`)
- SQLModel models and migrations for the agreed schema.
- `note_versions` immutable; each version stores prompt version, rule-set version and KB manifest hash.
- Vector column and keyword (GIN) index on `kb_chunks` (P4 owns the ingest logic that fills them).
- Repository layer (`notes_repo`, `assessment_repo`) for P3 to call.
- Seed script that loads synthetic clients and sessions.

**Audit log** (`backend/providers/audit/`)
- `base.py` and `db_hashchain.py`: append-only `audit_log` with `prev_hash`/`hash` (SHA-256 over canonical event plus previous hash).
- Events: draft, assess, edit, approve, login, follow-up answer; actor, timestamp, note id, version.
- App DB role has no UPDATE/DELETE on the table; `verify_chain()` and `GET /audit/verify`.
- Test: tampering with a row makes verification fail.

**Synthetic data** (`synthetic-data/<program>/`): `clients.json`, `sessions.json`, `notes/pass_*.md`, `notes/fail_*.md`, `expected.json` for all 5 programs, with at least one passing and one failing note each. Fail notes are built against the rules P3 collects, with `expected.json` listing the rule ids they must trigger. No real client information.

**Production notes** for `docs/submission/`: HIPAA safeguards, BAA, role-based access, audit logging, JB Azure mapping (use the **azure-standards skill**). Describe only.

**Depends on:** shared schema; P3's rules (for fail notes). **Delivers to:** P1 (realm, login), P3 (repos, principal, audit), P4 (kb tables), P1 (evaluation data).

---

## P3 — Backend orchestrator + regulation/documentation collection

### A. Orchestrator (`backend/`)
- `app/main.py` and `api/` routers per the OpenAPI contract; error model; CORS for Vite; settings from env; `providers/registry.py` choosing adapters from `*_PROVIDER` settings.
- `providers/llm/`: `base.py`, `anthropic.py` (use the **claude-api skill** for current model ids and structured output), `azure_foundry.py` stub, `fake.py` for tests and offline demos. Claude is reachable only through `complete_structured(prompt_id, vars, schema)`.
- `prompts/draft.md`, `assess_content.md`, `followup.md` with version front matter; every output records the prompt version.
- `services/draft.py`: loads session and program framework, retrieves passages via P4's `SearchProvider`, calls Claude, pre-fills known fields, links interventions to treatment plan goals, sets gaps to `[NOT PROVIDED]` and returns `blanks[]`. Enforces "no invented clinical content".
- `services/assess.py`: runs P4's `RuleEngine` and `ContentChecker` (Claude, grounded in retrieved passages), merges and de-duplicates issues, validates against the `Issue` schema, computes status.
- `services/followup.py`: turns gaps and issues into targeted questions.
- Approve gate: `POST /notes/{id}/approve` re-assesses and returns 409 while a Critical is open; every action writes to the audit log.
- Versioning stamped on every draft and assessment: prompt version, rule-set version, KB manifest hash.
- Tests: status computation, ET time, approve-blocked-on-Critical, LLM output schema validation.

### B. Evaluation and demo-visible extras — moved from P1
- **Evaluation** (`scripts/evaluate.py`): runs every synthetic note through `/assess` and checks that each pass note has 0 Critical issues and each fail note hits its `expected.json` rule ids, across all 5 programs. Also the test that sparse input stays `[NOT PROVIDED]`. Depends on P2's data and P4's rules.
- **Demo-visible extras** (architecture §2.12): provenance highlighting (`source_spans`), clickable citations (retrieved passage with document, section, page), an evaluation scoreboard, and the audit **Verify** flow (`GET /audit/verify`) for the tamper demo. Stretch: rule explorer. P1 still builds the UI for these once P3 exposes the data/endpoints.

### C. Regulation and documentation collection (all programs) — moved to P4, see the table above
For each of the five programs (Adult ACT, Youth ACT, Health Home Care Coordination, Apartment Treatment Housing, Article 31 clinic):
1. **Download** the publicly available NYS regulations, program guidance and documentation requirements, plus Medicaid and NYS documentation standards into `knowledge-base/sources/<program>/`.
2. **Manifest** `manifest.yaml` per program: `id, title, url, date, version, sha256` per document.
3. **Documentation framework** per program: note types, required elements, timelines, rules. Write it up in `docs/frameworks/<program>.md`.
4. **Rules content**: `rules/<program>.yaml` and `rules/_common_medicaid_nys.yaml`, where **every rule links to a source document and section**.
5. Hand the manifests to P4 for ingest and the rule files to P4 for engine validation. Hand the rule list to P2 so fail notes target real rules.

**Depends on:** P2 (repos, auth, audit), P4 (search, rules engine). Develop against the ABCs and `fake` implementations so nothing blocks.

---

## P4 — Backend pieces: RAG and rules engine

**Knowledge base pipeline** (`backend/kb/ingest.py` and providers `parser`, `embeddings`, `search`, `blob`)
- `parser/docling.py`: Docling parse into structured sections, keeping page and section metadata.
- `embeddings/bge_small.py`: local bge-small, batched.
- `search/pgvector_hybrid.py`: Postgres full-text plus vector search with rank fusion, filtered by program, returns `Passage` (`source_id`, `section`, `url`, `text`, score).
- Section-aware chunking that keeps the heading path. Idempotent ingest keyed by `sha256` from P3's manifests, and a computed **KB manifest hash** for versioning.
- CLI: `python -m backend.kb.ingest --program <program>`.
- Retrieval quality checks: a small question set per program asserting the right section appears in the top results.

**Rules engine** (`backend/rules_engine/`)
- Loader and validator for P3's rule files; rejects any rule without a source.
- Rule types: required field present, timeline (uses the ET time helper), format (SOAP sections), signature/credentials.
- Emits `Issue` objects; produces a rule-set version.
- `ContentChecker` input contract agreed with P3 (retrieved passages in, `Issue[]` out); P3 owns the prompt, P4 owns the retrieval feeding it.
- Provider contract tests for parser, embeddings and search in `tests/providers/`.
- Unit tests per rule type.

**Depends on:** P2 (kb tables, pgvector), P3 (manifests, rule files). **Delivers to:** P3 (`SearchProvider`, `RuleEngine`).

---

## Verification (definition of done)
- `docker compose -f infra/docker-compose.yml up` starts Postgres and Keycloak; logging in as a synthetic Article 31 user sets the Article 31 program.
- `pytest` passes: rule engine, ET time, status, audit tamper test, provider contract tests.
- `scripts/evaluate.py`: every pass note has 0 Critical issues; every fail note hits its expected rule ids, across all 5 programs.
- Sparse input stays `[NOT PROVIDED]`; approve returns 409 while a Critical is open.
- Manual run: select program and session, dictate, draft, review issues and status, answer follow-ups, approve; the audit log shows every step and verifies.
- No secrets committed, `.env` ignored, times shown as `11/6/2026 2:05 PM ET`, UI follows JB brand.
