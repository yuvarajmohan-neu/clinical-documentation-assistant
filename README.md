# Clinical Documentation Assistant

A web application that helps clinicians **draft** progress notes and treatment plan updates, and **assess** them against New York State documentation requirements for five community mental health programs.

## Problem & Solution

Clinicians spend substantial time on documentation compliance, often rewriting notes to meet regulatory requirements. This assistant:

- **Drafts** notes in the required format (SOAP, progress notes, treatment plans)
- **Assesses** every draft against program-specific NYS requirements
- **Guides** clinicians through compliance gaps with specific fixes and sources
- **Keeps clinicians in control** — they review, edit, and approve every change

**Goal:** Reduce documentation burden while maintaining compliance and quality.

---

## Key Features

### 📝 Write a Note
- Select a program (Adult ACT, Youth ACT, Health Home, Article 31, Apartment Treatment)
- Input session details (text or voice dictation)
- Auto-fill from session records
- AI-drafted progress notes with blanks flagged
- Follow-up questions to fill gaps

### ✅ Check a Note
- Paste a finished note
- Instant compliance assessment
- See issues with severity levels and guidance

### 🎯 Compliance Checking
- **Deterministic rules** for required fields, timelines, formats
- **AI content checks** for clinical quality (interventions, progress, medical necessity)
- **Grounded in sources** — every issue links to the regulation or guidance document
- **Issue schema** with: what's missing, requirement, source, severity, fix suggestion

### 🔐 Security & Control
- Authentication via Keycloak (OIDC)
- Audit trail of all drafts, edits, and approvals
- Synthetic data only (no real PHI)
- Hash-chain versioning of all changes

---

## Tech Stack

**Backend**
- Python 3.11+, FastAPI
- PostgreSQL + pgvector (via SQLModel)
- Keycloak (OIDC auth)
- Docling (document parsing)
- bge-small (local embeddings)

**Frontend**
- React 18, TypeScript, Vite
- TailwindCSS (brand-themed)
- Web Speech API (dictation)

**Infrastructure**
- Docker Compose (local dev)
- Postgres + Keycloak containers

**AI**
- Claude (via Anthropic API)
- Structured output with fixed JSON schemas

---

## Project Structure

```
clinical-documentation-assistant/
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── main.py              # Entry point
│   │   ├── api/                 # Route handlers
│   │   └── services/            # draft, assess, followup logic
│   ├── db/                      # Database models, migrations, seed
│   ├── providers/               # Plugin architecture (LLM, auth, embeddings, etc.)
│   ├── kb/                      # Knowledge base ingestion
│   ├── rules_engine/            # Deterministic compliance checks
│   ├── util/                    # Helpers (ET time, etc.)
│   └── settings.py              # Configuration
│
├── frontend/                     # React/Vite application
│   ├── src/
│   │   ├── pages/               # WriteNote, CheckNote screens
│   │   ├── components/          # Reusable UI components
│   │   ├── auth/                # OIDC integration
│   │   └── App.tsx              # Main app
│   ├── index.html
│   └── vite.config.ts
│
├── infra/                        # Infrastructure
│   ├── docker-compose.yml       # Local dev services
│   └── keycloak/                # Auth realm config
│
├── knowledge-base/              # (Out of scope for prototype)
│   └── sources/                 # NYS regulations & guidance docs
│
├── rules/                        # Compliance rules (YAML)
│   ├── adult_act.yaml
│   ├── youth_act.yaml
│   ├── health_home.yaml
│   ├── apt_treatment.yaml
│   ├── article31.yaml
│   └── _common_medicaid_nys.yaml
│
├── prompts/                      # AI prompts (versioned)
│   ├── draft.md
│   ├── assess_content.md
│   └── followup.md
│
├── synthetic-data/              # Demo data (no real PHI)
│   ├── adult_act/
│   ├── youth_act/
│   ├── health_home/
│   ├── apt_treatment/
│   └── article31/
│
├── tests/                        # Unit & contract tests
│   ├── providers/               # Auth, audit contracts
│   ├── db/
│   └── rules_engine/
│
├── docs/                         # Architecture, submission docs
│   ├── architecture.md
│   └── diagrams/
│
├── CLAUDE.md                     # Team instructions & non-negotiables
├── .env.example                  # Configuration template
└── README.md                     # This file
```

---

## Setup & Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone and Install

```bash
git clone https://github.com/yuvarajmohan-neu/clinical-documentation-assistant.git
cd clinical-documentation-assistant

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -e .

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup

```bash
# Root directory
cp .env.example .env
# Edit .env with your settings (API keys, database URL, etc.)

# Frontend
cd frontend
cp .env.example .env.local
# Edit .env.local for your environment
```

### 3. Start Infrastructure

```bash
# From root directory
docker compose -f infra/docker-compose.yml up -d
# Starts Postgres (port 5432) and Keycloak (port 8080)
```

Keycloak imports the synthetic `jb-demo` realm from
[`infra/keycloak/realm-jb-demo.json`](./infra/keycloak/realm-jb-demo.json) on first startup.
Open the admin console at <http://localhost:8080/admin/> and sign in with
`admin` / `admin-dev-password` (the local-only credentials configured in
[`infra/docker-compose.yml`](./infra/docker-compose.yml)). Demo realm users all use
`demo-pass-not-real`:

| Username | Role / program access |
|---|---|
| `art31.clinician` | Clinician, Article 31 |
| `act.clinician` | Clinician, Adult ACT and Youth ACT |
| `supervisor` | Supervisor, all five programs |

Use the `jb-demo` realm for these accounts. To stop the local services, run
`docker compose -f infra/docker-compose.yml down`; add `-v` only when you intend
to delete the local database and Keycloak data.

### 4. Initialize Database

```bash
cd backend
python -m backend.db.seed
# Creates tables and loads synthetic data
```

### 5. Start Backend

```bash
cd backend
uvicorn backend.app.main:app --reload
# API runs on http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### 7. Access the App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Keycloak Admin:** http://localhost:8080/admin/ (admin / admin-dev-password)

The current frontend authentication screen is still a development stub; the
local Keycloak realm and backend OIDC provider are configured, but the frontend
does not yet perform the Keycloak redirect/login flow.

---

## Development Workflow

### Adding a New Program

1. **Create rules** in `rules/<program>.yaml`
   - Define required fields, timelines, formats
   - Link each rule to its source document and section

2. **Add synthetic data** in `synthetic-data/<program>/`
   - `clients.json` — sample patient records
   - `sessions.json` — sample session notes
   - `notes/pass_*.md` — example notes that pass all checks
   - `notes/fail_*.md` — example notes that fail specific rules
   - `expected.json` — expected compliance issues for each note

3. **Test** with the evaluation script:
   ```bash
   python scripts/evaluate.py <program>
   ```
   Verifies: every pass note has 0 Critical issues, every fail note hits expected rules

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Run tests:**
   ```bash
   pytest tests/
   ```

3. **Format & lint:**
   ```bash
   # Backend
   cd backend
   black . && isort . && flake8 .
   
   # Frontend
   cd frontend
   npm run lint && npm run format
   ```

4. **Commit & push:**
   ```bash
   git commit -m "Clear commit message"
   git push origin feature/your-feature-name
   ```

5. **Open a pull request** with:
   - What changed
   - Why (the problem)
   - How to test it
   - Any security/compliance implications

---

## Testing

### Unit Tests
```bash
# Backend
cd backend
pytest tests/
pytest tests/providers/  # Contract tests for auth, audit
pytest tests/db/         # Database model tests

# Frontend
cd frontend
npm run test
```

### Evaluation (Compliance)
```bash
# Verify all synthetic notes pass/fail as expected
python scripts/evaluate.py

# Test a specific program
python scripts/evaluate.py adult_act
```

### Manual Testing
- **Write a note:** Fill in a session, see the draft, address issues
- **Check a note:** Paste a finished note, verify assessment
- **Dictation:** Test voice input (Chrome/Edge required)
- **Auth:** Sign in with dev user (see Keycloak realm config)

---

## Key Non-Negotiables

⚠️ **These rules are enforced:**

1. **Synthetic data only** — no real patient info, employee data, or secrets
2. **Never invent clinical content** — all facts come from clinician or session record
3. **Clinician stays in control** — every change needs their review and approval
4. **No secrets in code** — API keys only in `.env` (in `.gitignore`)
5. **Brand compliance** — all UI follows Jewish Board standards
6. **Time format** — 12-hour ET (e.g., `11/6/2026 2:05 PM ET`)

---

## Architecture Deep Dive

See [docs/architecture.md](docs/architecture.md) for:
- **Detailed flow diagrams** (write, check, assess)
- **Provider plugin system** (how to swap LLM, auth, embedding providers)
- **Database schema** (notes, versions, audit log)
- **API specifications**
- **Compliance checking** (deterministic rules + AI content checks)

---

## Team Responsibilities

| Role | Focus | Lead |
|------|-------|------|
| **A** | Regulations & rules | Documentation requirements |
| **B** | Backend & AI | FastAPI, providers, Keycloak |
| **C** | Frontend & brand | React, OIDC, Jewish Board UI |
| **D** | Data & evaluation | Synthetic data, demo script, submission |

---

## Roadmap

### Phase 1: Article 31 (In Progress)
- ✅ Single program end-to-end
- ✅ Backend infrastructure
- ✅ Frontend auth & core pages
- ⏳ AI drafting & assessment

### Phase 2: Remaining Programs
- Health Home Care Coordination
- Adult ACT
- Youth ACT
- Apartment Treatment Housing

### Phase 3: Polish & Demo
- Brand refinement
- Dictation & speech-to-text
- Demo script & synthetic scenarios
- Submission materials

### Phase 4: Production (Out of Scope)
- HIPAA safeguards
- BAAs with AI/speech vendors
- EHR integration
- Audit logging & role-based access
- Deployment on Azure (JB standards)

---

## Production Considerations

This is a **prototype for evaluation only**. Moving to production requires:

- ✅ **Organizational review** (leadership, compliance)
- ✅ **Clinical review** (clinicians, supervisors)
- ✅ **Privacy review** (legal, compliance)
- ✅ **Security audit** (penetration testing, BAAs)
- ✅ **EHR integration** (PHI handling, audit logging)

See [docs/it-software-request.md](docs/it-software-request.md) for implementation roadmap.

---

## Troubleshooting

### Backend won't start
```bash
# Check Postgres is running
docker-compose -f infra/docker-compose.yml ps

# Check .env has DATABASE_URL
cat .env | grep DATABASE_URL

# Try migrations
alembic upgrade head
```

### Frontend can't reach backend
```bash
# Check VITE_API_URL in frontend/.env.local
# Should be http://localhost:8000 for local dev

# Check backend is running
curl http://localhost:8000/docs
```

### Keycloak login fails
```bash
# Check admin console
http://localhost:8080/admin (admin/admin)

# Verify realm is loaded
# Check frontend auth config uses correct issuer & audience
```

### Database errors
```bash
# Reset database
cd backend
rm data/postgres_data  # if using volume
python -m backend.db.seed
```

---

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) for non-negotiables and team guidelines
2. Check [docs/architecture.md](docs/architecture.md) for technical context
3. Open an issue for bugs or feature requests
4. Submit a PR with tests and documentation
5. Link to the relevant compliance requirement or issue

---

## License

Internal use only (Jewish Board project). See LICENSE for details.

---

## Questions?

- **Architecture:** See [docs/architecture.md](docs/architecture.md)
- **Compliance rules:** Check `rules/` directory
- **API endpoints:** http://localhost:8000/docs (Swagger)
- **Team guidance:** [CLAUDE.md](CLAUDE.md)
- **Submission docs:** [docs/submission/](docs/submission/)

---

**Last updated:** November 6, 2026  
**Status:** Prototype in development  
**Team:** A, B, C, D (Jewish Board hackathon)
