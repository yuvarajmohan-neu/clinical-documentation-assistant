# frontend

React + Vite + TypeScript, built from `docs/mockups/` and `.claude/plans/p1-react-walkthrough.md`.

## Run the demo

Two terminals, both from the repo root:

```sh
# 1. Mock API (in-memory, no Keycloak/DB/KB/AI) on :8000
python -m pip install fastapi uvicorn tzdata
python -m uvicorn backend.app.main:app --reload --port 8000

# 2. Web app on :5173 (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

```sh
npm test         # vitest + React Testing Library
npm run lint
```

## What's built

All four screens: Sign-in → Session setup (program picker + sessions) → Write a note / Check a note
→ shared review screen (note editor with `[NOT PROVIDED]` blanks, issues panel, follow-up
questions, status banner, Re-assess, Approve with 409 handling, version history).

The API is a **mock** (`backend/app/`): drafting places the clinician's own sentences into the
note format without rewriting them, and checks are deterministic text heuristics. Rule IDs and
citations are placeholders until `rules/*.yaml` exist. Auth is the dev stub in `src/auth/`.
