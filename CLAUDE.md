# CLAUDE.md — Clinical Documentation Assistant

Jewish Board hackathon project (Idea **C**). Team of four.

## Project overview

An assistant that helps clinicians **draft** progress notes and treatment plan updates and **assess** them against each program's NY State documentation requirements. The goal is to cut documentation burden. The clinician reviews and approves every step.

### Programs in scope
1. Adult ACT
2. Youth ACT
3. Health Home Care Coordination
4. Apartment Treatment Housing
5. Article 31 outpatient clinic therapy visits

---

## Non-negotiable rules (always follow)

- **Synthetic data only.** Use synthetic, role-played, or explicitly authorized data. Never use real client information, PHI, or employee-confidential data.
- **Never invent clinical content.** Clinical facts come only from what the clinician or the session record provided. Anything not provided is left **blank and flagged**.
- **The human stays in control.** The clinician reviews, edits, and approves every change and every final document. Nothing is final without clinician approval.
- **No secrets in code.** API keys go in environment variables or a secrets vault. `.env` stays in `.gitignore`.
- **Brand.** Everything users see follows Jewish Board brand standards (logo, colors, fonts) via the **JB brand skill**.
- **Time format.** Show times in 12-hour format, Eastern time. Example: `11/6/2026 2:05 PM ET`.
- **AI model.** Claude, used through the JB-approved AI toolchain in the company-defined way.

---

## Functional requirements

### Program frameworks
- Download the publicly available NYS regulations, program guidance, and documentation requirements for each of the five programs.
- Build a documentation framework for each program: **note types, required elements, timelines, rules**.
- **Every rule links to its source document and section.**
- The clinician selects the program, or the program is set by their role. The assistant then applies that program's framework.

### Writing
5. The clinician dictates, types, or pastes session notes.
6. The assistant drafts progress notes and treatment plan updates in the program's required format (SOAP where used).
7. Known session details are pre-filled from the synthetic record: client, date, time, service type, modality.
8. Interventions and progress are linked to treatment plan goals.
9. No invented clinical content. Gaps are left blank and flagged.

### Assessing
10. Every draft is checked against program requirements, Medicaid standards, and NYS documentation standards.
11. Each issue shows **what's missing or wrong**, **the requirement and its source**, and **how to fix it**.
12. Each issue has a severity: **Critical** (must fix), **Warning**, or **Informational**.
13. The assistant can also assess a note written elsewhere and pasted in.
14. The assistant asks follow-up questions to fill gaps, e.g. *"How did the client respond to the intervention?"*

### Review
15. The clinician reviews, edits, and approves every change.
16. An overall status (**Meets standards** / **Needs attention**) is shown before finalization.

---

## Technical requirements

17. **Web app** with a program selector, two pages (**Write a note**: text + dictation; **Check a note**: paste a finished note), and a shared review screen (draft view, issues panel, status, approve).
18. **Speech-to-text** for dictation.
19. **Retrieval knowledge base**: program regulations are indexed and searchable. Drafting and checks are grounded in retrieved source text, not in general model knowledge.
20. **Hybrid checking:**
    - A deterministic rule set per program (required fields, timelines).
    - Claude content checks (intervention and response, measurable progress, medical necessity).
21. **Fixed AI output schema** for each issue:
    ```json
    { "issue": "", "element": "", "rule": "", "source": "", "severity": "Critical|Warning|Informational", "suggestion": "" }
    ```
22. **Versioning**: prompts, rule sets, and source documents are all versioned.
23. **Demo data**: synthetic sessions and notes for all 5 programs, with **at least one passing and one failing example per program**.
24. **Production (describe only; out of scope for the prototype)**: HIPAA safeguards, a BAA for AI and speech services, EHR integration, and audit logging of every draft, edit, and approval.

### Common technical requirements
- Prototypes must not expose patient-identifiable, employee-confidential, or other sensitive information.
- Anything proposed for real use needs organizational, clinical, privacy, security, and legal review first.
- Production requires HIPAA safeguards, a signed BAA with every vendor that handles client data, role-based access, audit logging, and **JB Azure standards**.

---

## Submission checklist

- [ ] **Problem**: who experiences it and why it matters
- [ ] **Solution**: what was built
- [ ] **Impact**: how improvement would be measured (e.g., time per note, first-pass compliance rate, audit findings)
- [ ] **Working prototype / demo**
- [ ] **Implementation approach**: what a pilot would need
- [ ] **Cost and value**: to build, operate, and maintain
- [ ] **Risks, human oversight needs, security considerations, and assumptions**

---

## Architecture (full detail: [docs/architecture.md](docs/architecture.md))

**Stack:**
- Python **FastAPI** backend and **React (Vite)** frontend.
- **Postgres + pgvector** (SQLModel) for notes, versions, the hash-chained audit log, and the KB chunks and vectors.
- **Keycloak** (OIDC) for sign-in and roles. Program roles set the program.
- Content pipeline: **Docling** parse → section chunks → **bge-small** embeddings (run locally) → hybrid keyword + vector search.
- **Browser Web Speech API** for dictation.
- `infra/docker-compose.yml` runs Postgres and Keycloak.

**Provider wrappers (rule):** business code never imports a vendor SDK. Every external capability goes through an interface in `backend/providers/<capability>/base.py`:
- The capabilities are llm, auth, parser, embeddings, search, blob, speech, secrets and audit.
- `backend/providers/registry.py` picks each adapter from `*_PROVIDER` settings in `.env`.
- Adapters return project types (`Passage`, `Principal`, `Issue`), never SDK objects.
- A new provider means one adapter file, plus passing the contract tests in `tests/providers/`.
- Claude is called only through `LLMProvider.complete_structured(prompt_id, vars, schema)`, with `LLM_PROVIDER=anthropic|azure_foundry`.
- Auth uses generic OIDC, so on the backend moving from Keycloak to Entra ID is a configuration change (`OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_ROLE_CLAIM`, plus the tenant id for the `tid` check). The frontend moves from `react-oidc-context` to MSAL, as the JB Azure standard requires. `AUTH_PROVIDER=dev` is the offline demo fallback.

**Flow (Write a note page):** select program and session → clinician input (text/dictation) → `/draft` (pre-filled, follows the program format, linked to goals, blanks set to `[NOT PROVIDED]` and flagged) → `/assess` (deterministic RuleEngine + Claude ContentChecker grounded in retrieved passages) → follow-up questions with an answer box (`/followups` → re-runs `/draft`) → clinician edits (`PUT /notes/{id}`) → **Re-assess** button (`/assess` again) → **Approve** button (`/notes/{id}/approve`), blocked while a Critical issue is open.
**Flow (Check a note page):** paste a finished note, choose the note type → `/assess` → follow-up questions shown **display-only, no answer box** → clinician edits the pasted note directly to address them (`PUT /notes/{id}`) → **Re-assess** button → **Approve** button. No `/draft` call at any point.

**Status:** any open Critical → *Needs attention*. Only Warnings → *Meets standards with warnings*. Otherwise → *Meets standards*.

**Versioning:** each draft and assessment stores the prompt version, rule-set version and KB manifest hash.

**Repo layout**
```
backend/                  app/main.py, api/, services/{draft,assess,followup}.py, kb/ingest.py, rules_engine/, db/, util/time_et.py
backend/providers/        registry.py + {llm,auth,parser,embeddings,search,blob,speech,secrets,audit}/{base.py,<adapter>.py}
frontend/                 src/pages/{WriteNote,CheckNote}.tsx, src/components/{ProgramSelector,DictationBox,PasteBox,NoteEditor,IssuesPanel,StatusBanner}.tsx, src/auth/ (react-oidc-context)
infra/                    docker-compose.yml, keycloak/realm-jb-demo.json (synthetic users only)
knowledge-base/sources/   <program>/ docs + manifest.yaml (id, title, url, date, version, sha256)
rules/                    <program>.yaml + _common_medicaid_nys.yaml (every rule has id, element, type, severity, requirement, source)
prompts/                  draft.md, assess_content.md, followup.md (versioned front matter)
synthetic-data/           <program>/ clients.json, sessions.json, notes/pass_*.md, fail_*.md, expected.json
docs/                     architecture.md, submission/
.env.example              no secrets
```

**Team split:** A, regulations & rules (critical path) · B, backend & AI, provider registry, Keycloak · C, frontend & brand, OIDC login · D, synthetic data, content pipeline, evaluation, submission.

**Build order:** Article 31 end to end first, then the other 4 programs, then polish (brand, dictation, demo script, submission).

**Verification:** `pytest` (rule engine, ET time, status); `scripts/evaluate.py` (every pass note has 0 Critical issues and every fail note hits its expected rule ids, across all 5 programs); a test that sparse input stays `[NOT PROVIDED]`.
