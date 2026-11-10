# Software & vendor approval request — Clinical Documentation Assistant (hackathon prototype)

For: IT approval review
From: Clinical Documentation Assistant team (Jewish Board hackathon, Idea C)

All data used in this prototype is synthetic/role-played — no real client or
employee data touches any of the software or services listed below.

## 1. Local developer tooling (standard installs, no data leaves the machine)
| Software | Purpose | License |
|---|---|---|
| Python 3.11+ | Backend runtime (FastAPI) | PSF |
| Node.js 20 LTS + npm | Frontend runtime (React/Vite) | MIT |
| PostgreSQL 16 (+ pgvector extension), native install | Data store | PostgreSQL License |
| Git | Version control | GPLv2 |
| VS Code / Claude Code | IDE | Free / per existing Anthropic agreement |

No container runtime (Docker Desktop, Podman, etc.) is required to run the
prototype. Sign-in defaults to an offline `AUTH_PROVIDER=dev` stub (a fixed
synthetic demo user, no network call), so Keycloak is not needed to stand up
or demo the app.

## 2. Open-source components (pulled via package managers — need registry/proxy access, not accounts)
| Component | Source | License | Notes |
|---|---|---|---|
| FastAPI, SQLModel, Pydantic, PyJWT, psycopg | PyPI | MIT/BSD | Backend libraries |
| React, Vite, TypeScript, react-oidc-context, oidc-client-ts | npm | MIT | Frontend libraries |
| Docling | PyPI | MIT | Document parsing for the regulation library |
| sentence-transformers + `BAAI/bge-small-en-v1.5` | PyPI + Hugging Face Hub | Apache-2.0 / MIT | Embeddings, runs locally on CPU — needs outbound access to huggingface.co once to download ~130MB of model weights, no account required, ungated model |
| Keycloak (optional, stretch goal only) | quay.io image, run via Docker/Podman if a contributor picks this up | Apache-2.0 | Only needed to demo the real `oidc` adapter instead of the `dev` auth stub; not required to run or demo the prototype |
| Qdrant (optional, provider-swap demo only) | Container image, source TBD if picked up | Apache-2.0 | Stretch goal only |
| faster-whisper (optional, offline speech fallback) | PyPI | MIT | Only needed if Web Speech API is disallowed |

**Ask of IT:** confirm PyPI, npm, and huggingface.co are reachable from dev machines (or routed through an approved proxy/mirror).

## 3. Vendor/cloud services needing explicit approval
| Service | What it's for | Why IT needs to weigh in |
|---|---|---|
| Anthropic Claude API (or Azure AI Foundry, if that's the JB-approved route for Claude) | Drafting notes + content checks | Needs an API key/account, and the project's AI model rule requires this go through the JB-approved AI toolchain. Confirm which route (direct Anthropic API vs. Azure AI Foundry) is sanctioned, even though only synthetic data will ever be sent |
| Google (via Chrome's Web Speech API) | Browser dictation in the demo | Chrome sends audio to Google's servers for transcription. Only synthetic/role-played speech will ever be used, but this is a real external data flow worth a line item — flag for approval or fall back to local Whisper |
| GitHub (or JB's internal git/CI platform) | Source control, PR workflow, CI running `pytest`/`evaluate.py` | Confirm which platform is the approved one for this project (GitHub.com, GitHub Enterprise, Azure DevOps) |

## 4. Out of scope for the prototype (production-only — flagging so IT isn't surprised later)
Entra ID, Azure AI Foundry, Azure AI Search, Azure SQL, Azure Key Vault, Azure
Blob Storage, a BAA with every vendor touching client data, EHR integration.
None of these are built in the hackathon prototype — they appear only in the
submission's "production" section as what a real pilot would require.

## Open question for IT
Which route Claude access should go through (direct Anthropic API vs. Azure
AI Foundry) — the one vendor dependency with real governance implications
even for a synthetic-data-only demo.
