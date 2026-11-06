# P2 walkthrough — what the Keycloak/DB/Audit/synthetic-data owner builds

## Context
Team-lead briefing on P2's scope, from `.claude/plans/team-responsibility-split.md`, `docs/architecture.md` (§2.4, 2.6–2.11, 3, 7) and the azure-standards skill. Nothing is built yet: the repo has only docs, diagrams and skills (plus the frontend scaffold P1 already started). No code changes are proposed here. Mirrors the structure of `p1-react-walkthrough.md`.

## 1. P2's deliverables
1. **Infra** (`infra/docker-compose.yml`, `infra/keycloak/realm-jb-demo.json`) — Postgres+pgvector and Keycloak, wired together.
2. **Auth provider** (`backend/providers/auth/`) — the `oidc` and `dev` adapters behind `AuthProvider`.
3. **Database** (`backend/db/`) — SQLModel schema, migrations, repository layer, seed script.
4. **Audit log** (`backend/providers/audit/`) — hash-chained, append-only, with verify.
5. **Synthetic data** (`synthetic-data/<program>/`) — clients, sessions, pass/fail notes, `expected.json` for all 5 programs.
6. **Production notes** for `docs/submission/` — HIPAA, BAA, RBAC, audit, Azure mapping (describe only).

P2 is the one role that touches all four layers underneath the orchestrator (auth, data, audit, demo content) rather than one vertical slice — so the main risk isn't depth, it's sequencing: everyone else is waiting on pieces of this.

## 2. The four pieces, in build order

### 2a. Infra (`infra/docker-compose.yml`)
- Two services at minimum: `postgres` (image `pgvector/pgvector:pg16`, port 5432) and `keycloak` (`quay.io/keycloak/keycloak`, dev mode, realm import, port 8080). Healthchecks and named volumes so `docker compose up` is the one command that starts the whole local stack (CLAUDE.md's `infra/docker-compose.yml` requirement).
- Keycloak imports `infra/keycloak/realm-jb-demo.json` on startup — this file is committed, so the realm is reproducible, not clicked together by hand.
- Optional/stretch services other people might add later for provider-swap demos (`qdrant`, `whisper`) don't belong to P2 — only Postgres and Keycloak are P2's.

### 2b. Keycloak realm (`infra/keycloak/realm-jb-demo.json`)
This is the mechanism behind CLAUDE.md requirement "the program is set by their role":
- **Clients:** `cda-web` (public, PKCE — for the React app) and `cda-api` (the token audience the backend validates against).
- **Roles:** `clinician`, `supervisor`, plus one `program:*` role per program — `program:adult_act`, `program:youth_act`, `program:health_home`, `program:apt_treatment`, `program:article31`. A role claim mapper puts these into the token (Keycloak's default location is `realm_access.roles`).
- **Demo users (synthetic only, per CLAUDE.md's non-negotiable rule):**
  - `art31.clinician` — clinician, Article 31 only → program picker is skipped for them.
  - `act.clinician` — clinician, Adult **and** Youth ACT → gets a picker between just those two.
  - `supervisor` — all programs, used for the "supervisor can't approve a clinician's note" access test and the Critical-override story.
  - Passwords go in `.env.example` as obviously-fake demo values, never in the realm JSON itself if that file is meant to be widely shared — confirm with the team whether demo passwords live in the realm export or purely in `.env.example`.
- This realm is the thing P1 logs into and P3's `oidc` auth dependency validates against — both are blocked until this file exists, even in a minimal form.

### 2c. Auth provider (`backend/providers/auth/`)
Implements the `AuthProvider` interface from the shared contracts (`backend/providers/types.py` → `Principal{user_id, name, roles, programs}`):
- `base.py` — the Protocol: `verify(token) -> Principal`.
- `oidc.py` — fetches Keycloak's JWKS, checks `iss`/`aud`/expiry, maps the role claim to `Principal.programs` (the `program:*` roles) and `Principal.roles` (`clinician`/`supervisor`).
- `dev.py` — `AUTH_PROVIDER=dev`, an offline fallback that returns a fixed demo `Principal` with no network call at all. This exists specifically so the live demo survives if Keycloak misbehaves, and so P1/P3 can build before the realm is ready.
- A FastAPI dependency (`current_principal`) that routers use, plus `require_program(p)` / `require_role("clinician")` guards — these are what make "only a clinician can approve their own note" and the 403-for-wrong-program access test true.
- **Forward-looking constraint (architecture §2.8, §7):** switching to Entra ID later is `.env`-only on the backend (`OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_ROLE_CLAIM`, plus checking the `tid` claim for the JB tenant) — so the `oidc` adapter should be written generically against those four settings now, not hard-coded to Keycloak's claim shape, or the "no business-logic change" promise breaks later.
- Contract tests in `tests/providers/test_auth_contract.py` — the same test suite should pass against both `oidc` and `dev`.

### 2d. Database (`backend/db/`)
SQLModel models + migrations for the schema every other service reads/writes:
- `notes`, `note_versions` (immutable — each version stores prompt version, rule-set version, KB manifest hash, per req 22), `assessments`, `audit_log`, `kb_documents`, `kb_chunks`.
- `kb_chunks` needs a vector column (pgvector) and a keyword GIN index — P2 owns the table shape, P4 owns the ingest code that fills it. This is the one place P2 and P4's work has to be agreed early (noted explicitly in the team-split doc as the shared-load risk).
- Repository layer (`notes_repo`, `assessment_repo`) is what P3's services call instead of writing raw SQL — this is the seam that keeps the orchestrator provider-agnostic about storage.
- Seed script loads P2's own synthetic clients/sessions into the DB so `GET /sessions?program=` has something to return on day one.
- `note_versions` being immutable matters for two downstream guarantees: the version-history drawer P1 builds, and architecture §2.10's "approved notes are never edited, only addenda" rule.

### 2e. Audit log (`backend/providers/audit/`)
The hash-chained stand-in for an immutable production audit log (CLAUDE.md req 24, architecture §2.4/§2.10):
- `base.py` (`AuditProvider.append(event)`) and `db_hashchain.py` — each row stores `sha256(canonical_event + prev_hash)`, so any row tampered with after the fact breaks the chain from that point forward.
- Events logged: draft, assess, edit, approve, login, follow-up answer — each with actor, timestamp, note id, version. **Actor comes from the verified `Principal`, never from the request body** — this is the detail that makes the log trustworthy (a client can't claim to be someone else).
- The Postgres role the app connects as must have no `UPDATE`/`DELETE` grant on `audit_log` — append-only has to be enforced at the DB permission level, not just by the app never issuing those statements, or the "tamper the row, verification fails" demo (architecture §2.12, item 4) isn't really demonstrating anything.
- `verify_chain()` plus `GET /audit/verify` — this is one of the five demo-visible moments in architecture §2.12 ("Tamper demo"), so it has to actually work live, not just pass a unit test.
- Test: directly tamper a row in the DB, confirm `verify_chain()` reports failure.

### 2f. Synthetic data (`synthetic-data/<program>/`)
For all 5 programs (Adult ACT, Youth ACT, Health Home, Apartment Treatment, Article 31):
- `clients.json` — fictional clients **with treatment plan goals** (goals are needed because drafts link interventions to them — req 8).
- `sessions.json` — what `GET /sessions?program=` serves; needs client, date, time, service type, modality per CLAUDE.md req 7.
- `notes/pass_*.md` and `notes/fail_*.md` — at least one of each per program (CLAUDE.md req 23). Fail notes are built **against P4's actual rules**, not invented independently — each fail note's `expected.json` lists the specific rule ids it's designed to trip, which is what `scripts/evaluate.py` checks.
- This is a hard dependency on P4 (or whoever's finished regulation/rules work first): fail notes can't be finalized until the rule ids they target exist. Build order implication: P2 can draft clients/sessions and draft pass notes early, but fail notes + `expected.json` wait on at least Article 31's rule set (matches the stated build order — Article 31 end to end first).
- **Synthetic-only, no exceptions** — this is CLAUDE.md's first non-negotiable rule, and P2 is the person actually authoring the data, so it's the point where that rule is easiest to accidentally violate (e.g., lightly fictionalizing a real case instead of writing one from scratch).

## 3. What P2 must NOT do (guardrails)
- **No real client data anywhere**, including as "inspiration" for synthetic notes — CLAUDE.md's first rule, and P2 owns the one deliverable (synthetic data) where this is the main risk.
- **Audit rows are never updated or deleted by the app** — enforce via DB grants, not convention.
- **Actor identity always comes from the verified token, never the request body**, in both the audit log and anywhere `notes`/`note_versions` record who did what.
- **No secrets in the realm export or compose file** — demo Keycloak passwords are "obviously fake," and real secrets (API keys, DB passwords for anything beyond the local demo) stay in `.env`, which stays git-ignored.
- **`note_versions` rows are immutable** — an approve doesn't rewrite history; later changes are new versions/addenda with their own audit entry (architecture §2.10).

## 4. Dependencies and ordering for P2
- **Nobody is upstream of P2 for infra/auth/DB** — P1, P3, and P4 are all waiting on pieces of P2's work, which makes this the component to start immediately, in parallel with P4's regulation collection (the other named critical path).
- Order that unblocks the most people fastest:
  1. `docker-compose.yml` with Postgres + Keycloak (unblocks everyone running the stack locally).
  2. DB schema (shared contract #4) — needs sign-off from all four people, since P3's repos, P4's `kb_chunks`, and P1's version drawer all read it.
  3. `AUTH_PROVIDER=dev` stub first (unblocks P1 and P3 immediately without waiting on a working realm), then the real Keycloak realm + `oidc` adapter.
  4. Audit log (needed before P3 can wire `approve`/`edit` events, but not before P1/P3 can start building against mocks).
  5. Synthetic data: clients/sessions/pass-notes early; fail-notes + `expected.json` after P4 has at least Article 31's rules.
- **Depends on:** the shared DB schema sign-off (contract #4) and P4's rule ids (for fail notes). **Delivers to:** P1 (realm + demo users, synthetic sessions for the UI), P3 (repository layer, `Principal`, audit events), P4 (`kb_chunks`/`kb_documents` tables), P1 again (synthetic data doubles as evaluation fixtures).

## 5. Production notes (`docs/submission/`, describe-only)
CLAUDE.md req 24 and architecture §2.11 are explicit that this is description, not implementation, for the hackathon:
- HIPAA safeguards, a signed BAA with every vendor touching client data (Anthropic/Azure AI Foundry, any speech vendor), EHR integration, full audit logging of every draft/edit/approval.
- Map the prototype's stand-ins to their Azure production equivalents using the **azure-standards skill**: Keycloak → Entra ID, Postgres+pgvector → Azure SQL + Azure AI Search, hash-chained table → immutable Blob/Log Analytics, `.env` → Key Vault.
- Architecture §7 already has a first pass at this mapping (resource groups, naming, managed identity, private networking) — P2's submission section should point to that table rather than re-deriving it, and flag the same open items it lists for IT: AI Search/Speech/Foundry naming and DNS zones aren't in the current standard, and whether Dev may call Anthropic directly or must also go through Foundry.

## 6. Risks and open questions to raise with the team
1. **Shared-load risk (explicit in the team-split doc):** P2's `kb_chunks` table shape is a dependency for P4's search work, and if P2 gets overloaded, rules-engine code was proposed to move from P4 to P2 instead. Decide early which way that goes — it changes P2's scope materially.
2. **Realm password storage:** confirm whether demo user passwords live inside the committed `realm-jb-demo.json` or only in `.env.example` — committing them in the realm file is lower friction for `docker compose up` but is still a password-shaped string in git history, even if fake.
3. **Fail-note timing:** fail notes and `expected.json` are blocked on P4's rule ids per program. If P4 falls behind on programs 2–5, P2's synthetic-data deliverable for those programs stalls too — worth tracking alongside the "Article 31 first" build order rather than assuming it happens automatically.
4. **DB permission enforcement:** the audit tamper demo only proves what it claims to prove if the app's Postgres role genuinely lacks UPDATE/DELETE on `audit_log` at the grant level — worth a line item in `scripts/evaluate.py` or a dedicated test, not just manual confirmation.
5. **`AUTH_PROVIDER=dev` scope creep:** make sure the dev stub is clearly demo-only (e.g., refuses to run if an env flag says "production") so it can't accidentally end up as the auth path anywhere beyond the hackathon demo.

## Verification (when built)
`docker compose -f infra/docker-compose.yml up` starts Postgres and Keycloak; logging in as `art31.clinician` sets the Article 31 program with no picker; `art31.clinician` gets 403 calling `/draft` for Adult ACT; `supervisor` cannot approve a clinician's note; tampering with an `audit_log` row makes `verify_chain()`/`GET /audit/verify` fail; `scripts/evaluate.py` shows 0 Critical issues on every `pass_*` note and the expected rule ids on every `fail_*` note across all 5 programs; no secrets are committed (`grep` check); switching `AUTH_PROVIDER` from `oidc` to `dev` leaves the evaluation matrix unchanged.
