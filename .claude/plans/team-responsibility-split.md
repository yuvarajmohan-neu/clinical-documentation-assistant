# Clinical Documentation Assistant — Team Responsibility Split

## Context
The repo is greenfield: only `CLAUDE.md`, `docs/architecture.md`, diagrams and the brand/azure skills exist. This plan assigns ownership across four people so each can build against agreed contracts without blocking the others. It contains responsibilities only, with no schedule.

| Person | Ownership |
|---|---|
| **P1** | React web application, submission documents |
| **P2** | DB (native Postgres), Auth (`dev` stub default; Keycloak stretch), Audit log, synthetic demo data |
| **P3** | Backend orchestrator, prompts, LLM adapters, citation check, evaluation script, demo-visible extras, **plus all regulation/documentation collection** (sources, program frameworks, rules content) **and the rules engine**. Rule drafting is done with Claude, then verified against each source section. P3 is the senior person on the team and takes this whole vertical — orchestrator through rules — rather than splitting it with P4. |
| **P4** | **One self-contained feature: the KB ingest pipeline** — parser, embeddings, chunking, hybrid search, the ingest CLI, and the retrieval quality check. Deliberately scoped so P4 can build and finish it independently, with no ownership of rules, regulation content, or the orchestrator. |

Note: P4's only external dependency is P2's `kb_chunks`/`kb_documents` table shape (vector column + keyword index) — agree that schema early, everything else about the pipeline is self-contained. P4 also needs *some* real documents to validate retrieval against; until P3 delivers at least Article 31's manifest, P4 builds and tests against a couple of sample documents.

## Shared contracts (agreed by all four before building)
1. **Repo scaffold** (P3): `backend/`, `frontend/`, `infra/`, `rules/`, `prompts/`, `knowledge-base/`, `synthetic-data/`, `.env.example`, `.gitignore` (incl. `.env`).
2. **Shared types** in `backend/providers/types.py`: `Passage`, `Principal`, `Issue` (exact schema from CLAUDE.md req 21), `Program` enum, `NoteDraft`, `Assessment` (status, issues[], prompt_version, ruleset_version, kb_manifest_hash).
3. **OpenAPI contract** `docs/api.yaml`:
   - `GET /programs`, `GET /sessions?program=`, `GET /sessions/{id}`
   - `POST /draft` → single orchestrated call: drafts the note, then internally runs the rule engine, content checker, and follow-up generation. Returns `{note_id, draft_text, issues[], followup_questions[]}`. This is the only call the Write page's initial Draft action makes.
   - `POST /assess` → `{draft_text, issues[], followup_questions[], status}` (draft or pasted text). On the Write page, this is also the single call behind the **Re-assess** button for every subsequent loop: request carries the clinician's current note text plus current follow-up answers together; the backend persists both as a new version (both land in the audit log), then re-runs draft-merge (LLM decides how to incorporate answers, treating the submitted note text as authoritative), rule engine, content checker, and follow-up generation, in that one request.
   - `/followups` is not a frontend-facing route — follow-up generation happens only as an internal step inside `/draft` and `/assess`.
   - `PUT /notes/{id}`, `POST /notes/{id}/approve` (409 while a Critical is open — approve re-assesses server-side on purpose, since nothing auto-reassesses on keystroke and the client's last-known status can go stale after further edits)
   - `GET /notes/{id}/versions`, `GET /audit?note_id=`
4. **DB schema** (proposed by P2, signed off by all): `notes`, `note_versions`, `assessments`, `audit_log`, `kb_documents`, `kb_chunks`.
5. **Provider ABCs** in `backend/providers/<cap>/base.py`: `LLMProvider.complete_structured`, `SearchProvider.search(query, programs, k) -> list[Passage]`, `AuditProvider.record(event)`, `AuthProvider.verify(token) -> Principal`.
6. **Mock API server** (P3) returning canned JSON so P1 can build without waiting.
7. **Rule file format** (P3 defines and authors, end to end): every rule has `id, element, type, severity, requirement, source`; `source` must point to a collected document and section. No handoff to P4 — P3 owns this file from definition through content.
8. **ET time helper** `backend/util/time_et.py` (P3): 12-hour Eastern, e.g. `11/6/2026 2:05 PM ET`.
9. **`Passage` shape** (P4 defines, P3 consumes): `source_id, section, url, text, score` — this is the one contract P4 hands upward into P3's `ContentChecker`/`assess` service.

---

## P1 — React web application (+ evaluation, submission)

**Web app** (`frontend/`, Vite + React + TypeScript)
- Load the **jewish-board-brand skill** (`.claude/skills/jewish-board-brand/references/web-guide.md`, `scripts/jb_brand.py`) before any styling. Logo, colours and fonts via brand tokens only.
- Typed API client generated from `docs/api.yaml`; develop against P3's mock first, then the real API.
- Components in `src/components/`:
  1. `ProgramSelector.tsx`: five programs; locked when the signed-in role (dev stub by default, Keycloak if the stretch is built) implies the program.
  2. Session picker: lists synthetic sessions and pre-fills client, date, time, service type and modality (12-hour ET).
  3. **Two pages** under one app shell: **Write a note** (`pages/WriteNote.tsx`) and **Check a note** (`pages/CheckNote.tsx`). Separate pages, no mode toggle.
     - `DictationBox.tsx` (Write page): type or **dictate** with the browser Web Speech API (interim text, unsupported-browser fallback). Calls `/draft` only — the backend orchestrates checks and follow-ups internally, so there is no separate frontend call to `/assess` right after.
     - `PasteBox.tsx` (Check page): paste a finished note, pick the note type, optional date of service. Calls `/assess` only.
     - Both pages hand off to the same shared review screen (items 4–7 below), driven by one `useNoteReview` hook.
  4. `NoteEditor.tsx` (shared): editable draft or pasted note, `[NOT PROVIDED]` blanks highlighted and navigable, goal links visible. No standalone save button — edits are persisted as part of the Re-assess call (item 5), which performs save-then-recheck atomically.
  5. `IssuesPanel.tsx`: per issue, what's wrong, the requirement with a clickable source, how to fix it, and a severity badge (icon plus colour, not colour alone). Click an issue to jump to the text. Follow-up questions with answer boxes (Write page only) — no separate submit button; answers are sent together with the note text on the next **Re-assess** click (single `POST /assess` call that saves both and returns updated draft/issues/follow-ups).
  6. `StatusBanner.tsx`: Meets standards / Meets standards with warnings / Needs attention, shown before finalization.
  7. Approve flow: confirm dialog, button disabled while a Critical is open, version history drawer. The server re-assesses on approve by design (catches edits made after the last Re-assess click) — not a redundant call.
  8. `src/auth/`: dev-stub sign-in by default (no redirect needed), bearer token on every call, role → program; `react-oidc-context` against Keycloak is an optional stretch swap.
- Loading, empty and error states; keyboard and screen-reader accessibility.

**Submission pack** (`docs/submission/`): problem, solution, impact metrics (time per note, first-pass compliance, audit findings), implementation approach, cost and value, risks/oversight/security/assumptions, and the demo script.

**Depends on:** P3 (OpenAPI, mock, real API), P2 (dev-stub auth working first, Keycloak realm if the stretch is picked up), P2 (synthetic data for evaluation).

---

## P2 — DB, Auth (dev stub default), Audit log (+ synthetic data)

**Database** (native Postgres, no container runtime required; a dev's own Postgres install or a managed/cloud instance both work)
- Enable the `pgvector` extension locally.

**Auth provider** (`backend/providers/auth/`): `base.py`, `dev.py` (`AUTH_PROVIDER=dev`, the default offline fallback — build and wire this first so P1/P3 are never blocked), FastAPI `current_principal` dependency, contract tests in `tests/providers/`.

**Stretch (only after `dev` works and if time allows): real Keycloak `oidc` adapter**
- `infra/docker-compose.yml` (already in the repo, runs via Docker or Podman): Postgres with **pgvector** and Keycloak, healthchecks, named volumes — optional, for anyone who wants containers or wants to demo real OIDC.
- `keycloak/realm-jb-demo.json`: realm, SPA client (PKCE), API audience, **synthetic users only**, one role per program (`program:adult_act`, `program:youth_act`, `program:health_home`, `program:apt_treatment`, `program:article31`) plus `clinician` and `supervisor`, role claim mapper. Document `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_ROLE_CLAIM` in `.env.example`.
- `oidc.py` (JWKS, issuer/audience/expiry checks, role → program → `Principal`).

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

**Depends on:** shared schema; P3's rules (for fail notes). **Delivers to:** P1 (dev-stub login, realm if built), P3 (repos, principal, audit), P4 (kb tables), P1 (evaluation data).

---

## P3 — Backend orchestrator, regulation collection, rules engine (senior, full vertical)

### A. Orchestrator (`backend/`)
- `app/main.py` and `api/` routers per the OpenAPI contract; error model; CORS for Vite; settings from env; `providers/registry.py` choosing adapters from `*_PROVIDER` settings.
- `providers/llm/`: `base.py`, `anthropic.py` (use the **claude-api skill** for current model ids and structured output), `azure_foundry.py` stub, `fake.py` for tests and offline demos. Claude is reachable only through `complete_structured(prompt_id, vars, schema)`.
- `prompts/draft.md`, `assess_content.md`, `followup.md` with version front matter; every output records the prompt version.
- `services/draft.py`: loads session and program framework, retrieves passages via P4's `SearchProvider`, calls Claude, pre-fills known fields, links interventions to treatment plan goals, sets gaps to `[NOT PROVIDED]` and returns `blanks[]`. Enforces "no invented clinical content". `POST /draft`'s handler calls this, then `assess.py`, then `followup.py` in sequence within the same request, returning `{note_id, draft_text, issues[], followup_questions[]}` — `/draft` is the only call the Write page's initial Draft action makes.
- `services/assess.py`: runs P3's own `RuleEngine` and `ContentChecker` (Claude, grounded in passages retrieved through P4's `SearchProvider`), merges and de-duplicates issues, validates against the `Issue` schema, computes status. `POST /assess`'s handler is also what the Write page's **Re-assess** button calls: given note text plus follow-up answers, it persists both as a new version (`PUT`-equivalent save folded into the same request), reruns `draft.py`'s merge step (LLM decides how to incorporate the answers, treating the submitted note text as authoritative), then this service, then `followup.py` — one request, one response with the same shape as `/draft`.
- `services/followup.py`: turns gaps and issues into targeted questions. Not exposed as its own frontend-facing route — it's an internal step called from both `draft.py`'s and `assess.py`'s request handlers.
- Approve gate: `POST /notes/{id}/approve` re-assesses and returns 409 while a Critical is open; every action writes to the audit log.
- Versioning stamped on every draft and assessment: prompt version, rule-set version, KB manifest hash.
- Tests: status computation, ET time, approve-blocked-on-Critical, LLM output schema validation.

### B. Evaluation and demo-visible extras — moved from P1
- **Evaluation** (`scripts/evaluate.py`): runs every synthetic note through `/assess` and checks that each pass note has 0 Critical issues and each fail note hits its `expected.json` rule ids, across all 5 programs. Also the test that sparse input stays `[NOT PROVIDED]`. Depends on P2's data and P3's own rules.
- **Demo-visible extras** (architecture §2.12): provenance highlighting (`source_spans`), clickable citations (retrieved passage with document, section, page), an evaluation scoreboard, and the audit **Verify** flow (`GET /audit/verify`) for the tamper demo. Stretch: rule explorer. P1 still builds the UI for these once P3 exposes the data/endpoints.

### C. Regulation and documentation collection (all programs)
For each of the five programs (Adult ACT, Youth ACT, Health Home Care Coordination, Apartment Treatment Housing, Article 31 clinic):
1. **Download** the publicly available NYS regulations, program guidance and documentation requirements, plus Medicaid and NYS documentation standards into `knowledge-base/sources/<program>/`.
2. **Manifest** `manifest.yaml` per program: `id, title, url, date, version, sha256` per document.
3. **Documentation framework** per program: note types, required elements, timelines, rules. Write it up in `docs/frameworks/<program>.md`.
4. **Rules content**: `rules/<program>.yaml` and `rules/_common_medicaid_nys.yaml`, where **every rule links to a source document and section**. Rules are drafted with Claude from the collected documents, then manually verified against each source section before being committed.
5. Hand the manifests to P4 for ingest (P4 doesn't do the collecting, just the indexing). Hand the rule list to P2 so fail notes target real rules.

### D. Rules engine (`backend/rules_engine/`)
- Loader and validator for P3's own rule files (section C above); rejects any rule without a source.
- Rule types: required field present, timeline (uses the ET time helper), format (SOAP sections), signature/credentials.
- Emits `Issue` objects; produces a rule-set version.
- `ContentChecker` input contract agreed with P4 (P4's retrieved passages in, `Issue[]` out); P3 owns the prompt and the rule content, P4 owns only the retrieval feeding it.
- Unit tests per rule type.

**Depends on:** P2 (repos, auth, audit), P4 (`SearchProvider` for retrieval). Develop against the ABCs and `fake` implementations so nothing blocks.

---

## P4 — One feature: the KB ingest pipeline

A single, self-contained deliverable so P4 can build and finish it independently, with no ownership of rules, regulation content, or the orchestrator.

**Knowledge base pipeline** (`backend/kb/ingest.py` and providers `parser`, `embeddings`, `search`, `blob`)
- `parser/docling.py`: Docling parse into structured sections, keeping page and section metadata (pypdf as a fallback).
- `embeddings/bge_small.py`: local bge-small, batched.
- `search/pgvector_hybrid.py`: Postgres full-text plus vector search with rank fusion, filtered by program, returns `Passage` (`source_id`, `section`, `url`, `text`, score).
- Section-aware chunking that keeps the heading path. Idempotent ingest keyed by `sha256` from P3's manifests, and a computed **KB manifest hash** for versioning.
- CLI: `python -m backend.kb.ingest --program <program>`.
- Retrieval quality checks (`scripts/eval_retrieval.py`): a small question set per program asserting the right section appears in the top results (hit@5).
- Provider contract tests for parser, embeddings and search in `tests/providers/`.

**Depends on:** P2 (`kb_chunks`/`kb_documents` tables, pgvector), P3 (manifests — but can build and test against a couple of sample documents before P3 delivers the real ones). **Delivers to:** P3 (`SearchProvider` only — P3's `RuleEngine` and `ContentChecker` are P3's own now).

---

## Verification (definition of done)
- Native Postgres running locally and `AUTH_PROVIDER=dev` selecting a synthetic Article 31 user sets the Article 31 program (no container runtime required). If the Keycloak stretch is built, `docker compose -f infra/docker-compose.yml up` plus logging in as that same synthetic user is an equivalent check.
- `pytest` passes: rule engine, ET time, status, audit tamper test, provider contract tests.
- `scripts/evaluate.py`: every pass note has 0 Critical issues; every fail note hits its expected rule ids, across all 5 programs.
- Sparse input stays `[NOT PROVIDED]`; approve returns 409 while a Critical is open.
- Manual run: select program and session, dictate, draft, review issues and status, answer follow-ups, approve; the audit log shows every step and verifies.
- No secrets committed, `.env` ignored, times shown as `11/6/2026 2:05 PM ET`, UI follows JB brand.
