# Project Documentation Standards — The Jewish Board Azure

Every workload repository must contain a `docs/` folder with these five files.
They are created at project kickoff and kept current — not written at the end.

---

## Required Documents

| File | Purpose | Updated when |
|------|---------|-------------|
| `ARCHITECTURE.md` | What the system is and how it's built | New resources, major design changes |
| `SECURITY.md` | Auth, network, secrets, and compliance posture | Any security-relevant change |
| `IMPLEMENTATION.md` | How to deploy, configure, and operate it | Deployment process changes |
| `CHANGELOG.md` | What changed, when, and why | Every deployment or script override |
| `RUNBOOK.md` | How to respond when things go wrong | New failure modes discovered |

---

## ARCHITECTURE.md

**Purpose**: The single authoritative description of what this system does and
how it is built. A new IT team member should be able to understand the full
system from this document alone.

```markdown
# Architecture — <Workload Name>

## Overview
<2–3 sentence description of what the system does and who uses it>

## Architecture Diagram
<Embed or link to a diagram. Minimum: ASCII diagram showing compute → data flow>

## Components

| Resource | Name (Dev) | Name (Prod) | Purpose |
|----------|-----------|-------------|---------|
| App Service | app-<workload>-dev-eus-001 | app-<workload>-prod-eus-001 | Hosts the API |
| SQL Database | sqldb-<workload>-dev-eus-001 | ... | Primary data store |
| Key Vault | kv-<workload>-dev-eus-001 | ... | Secret management |
| ...

## Resource Groups

| RG | Subscription | Contains |
|----|-------------|---------|
| rg-<workload>-dev-eus-001 | Dev | All workload resources |
| rg-shared-dev-eus-001 | Dev | VNet, subnets, DNS (shared) |

## Networking
- VNet Integration: App Service routes all outbound through snet-appservice-dev-eus-001
- Private Endpoints: SQL, Key Vault, Storage accessed via PEs in workload RG
- DNS: Resolved via Private DNS Zones in rg-shared-dev-eus-001

## Authentication
- User-facing: Entra ID Easy Auth (App Registration: <workload>-dev-app)
- Service-to-service: System-Assigned Managed Identity
- External users: <None / B2C — explain if applicable>

## Dependencies
- Upstream: <systems this app calls>
- Downstream: <systems that call this app>

## Pipeline
- Platform: GitHub Actions / Azure DevOps
- Dev deploys: automatic on merge to develop
- Prod deploys: manual approval gate on merge to main
- Pipeline files: .github/workflows/ or .azuredevops/
```

---

## SECURITY.md

**Purpose**: Documents the security posture of the workload. Reviewed whenever
a security-relevant change is made. Reference for audits and incident response.

```markdown
# Security — <Workload Name>

## Authentication & Authorization

| Surface | Method | Notes |
|---------|--------|-------|
| User-facing app | Entra ID Easy Auth | Single tenant, Jewish Board only |
| API (machine calls) | Managed Identity + Bearer token | |
| SQL access | Managed Identity (contained DB user) | No SQL auth passwords |
| Key Vault access | Managed Identity (RBAC: Secrets User) | |
| Storage access | Managed Identity (RBAC: Blob Data Contributor) | |

## Network Security

| Resource | Public Access | Access Method |
|----------|--------------|---------------|
| App Service | Yes (Entra ID required) | Public HTTPS |
| Azure SQL | Disabled | Private Endpoint only |
| Key Vault | Disabled | Private Endpoint only |
| Storage | Disabled | Private Endpoint only |

## Secrets Management
- All secrets stored in: kv-<workload>-dev-eus-001 / kv-<workload>-prod-eus-001
- App Settings reference secrets via Key Vault references (never plaintext)
- Developers access dev Key Vault via: Entra ID group assignment (Key Vault Secrets Officer)
- No secrets in source code, pipeline variables, or parameter files

## Data Classification
<Describe what data this system handles — PII, PHI, HR records, etc.>
<Reference relevant HIPAA / organizational data handling policies>

## Compliance Notes
<Any specific compliance requirements, audit findings, or exceptions>

## Security Contacts
- Workload owner: <name>
- IT Security review: <name or process>

## Change History
| Date | Change | Reviewed by |
|------|--------|------------|
| YYYY-MM-DD | Initial security design | |
```

---

## IMPLEMENTATION.md

**Purpose**: The step-by-step guide for deploying, configuring, and operating
this workload. Anyone on the IT team should be able to deploy a new environment
from this document.

```markdown
# Implementation Guide — <Workload Name>

## Prerequisites

- [ ] Azure CLI installed and authenticated (`az login`)
- [ ] Access to Dev/Prod subscriptions (Contributor on workload RG)
- [ ] GitHub / ADO repo access
- [ ] Shared RG (`rg-shared-dev-eus-001`) exists with VNet and DNS zones

## First-Time Setup

### 1. Create the Workload Resource Group
```bash
az group create \
  --name rg-<workload>-dev-eus-001 \
  --location eastus \
  --tags Environment=Dev Workload=<WORKLOAD> Owner=IT CostCenter=IT-Infrastructure CreatedBy=Manual
```

### 2. Configure OIDC for the Pipeline
<Link to pipelines.md or describe the steps>

### 3. Deploy Infrastructure
```bash
# Via pipeline (standard)
git push origin develop

# Via script (override — log in CHANGELOG.md)
az deployment group create \
  --resource-group rg-<workload>-dev-eus-001 \
  --template-file infra/main.bicep \
  --parameters infra/main.dev.bicepparam
```

### 4. Post-Deployment Configuration
- [ ] Verify Private Endpoint connectivity: `nslookup sql-<workload>-dev-eus-001.database.windows.net`
  → Should resolve to a 10.x.x.x address
- [ ] Create SQL contained user for Managed Identity (see auth.md)
- [ ] Verify Easy Auth is active: browse to app, confirm Entra ID login prompt
- [ ] Confirm Key Vault references resolve: check App Service → Configuration → show values

## Deploying a Code Change
1. Create feature branch from `develop`
2. Make changes, push, open PR to `develop`
3. PR validation pipeline runs automatically
4. After approval and merge, deploy-dev pipeline runs automatically
5. Smoke test in Dev
6. Open PR from `develop` → `main`
7. After approval and merge, prod pipeline waits for manual approval
8. Approve in GitHub (Environments) or ADO (Environments)
9. Smoke test in Prod
10. Update CHANGELOG.md

## Environment Variables & Configuration

| Setting | Dev Value | Prod Value | Source |
|---------|-----------|------------|--------|
| SQL connection | Key Vault ref | Key Vault ref | kv-<workload>-*-eus-001 |
| App Insights | appi-<workload>-dev... | appi-<workload>-prod... | Bicep output |

## Known Gotchas
<Document anything that bit you during deployment — DNS not resolving, Easy Auth
redirect URI mismatches, Managed Identity not yet propagated, etc.>
```

---

## CHANGELOG.md

**Purpose**: A running log of every meaningful change to the workload — code
releases, infrastructure changes, and script overrides. Newest entry at top.

```markdown
# Changelog — <Workload Name>

All notable changes to this workload are documented here.
Format: [Version or label] Date — Description

---

## [1.0.0] 2025-03-05
**Type**: Initial deployment
**Environment**: Dev
**Deployed by**: Srikanth (GitHub Actions — deploy-dev.yml)
**Changes**:
- Initial infrastructure deployment (App Service, SQL, Key Vault, Private Endpoints)
- Easy Auth configured with Entra ID
- Application Insights wired up

---

## [Script Override] 2025-03-04
**Script**: scripts/seed-reference-data.ps1
**Environment**: dev
**Reason**: One-time data seed ahead of first deployment
**Run by**: Srikanth
**Reviewed by**: N/A (dev only)
**Outcome**: 142 rows inserted into sqldb-<workload>-dev-eus-001

---
```

**Rules**:
- Every pipeline deployment gets an entry (version number, date, what changed)
- Every script override gets a `[Script Override]` entry
- Every infra-only change (new resource, config change) gets an entry
- Breaking changes must be flagged clearly: `⚠️ BREAKING CHANGE`

---

## RUNBOOK.md

**Purpose**: Step-by-step response procedures for known failure modes. Updated
whenever a new incident teaches a lesson.

```markdown
# Runbook — <Workload Name>

## Contacts
- Workload owner: <name, contact>
- On-call: <escalation path>
- Azure subscription access: <who has break-glass Prod access>

---

## Issue: App returns 401 / authentication errors

**Symptoms**: Users get redirect loop or 401 on the app
**Likely causes**:
1. Easy Auth misconfigured or app registration expired
2. Token audience mismatch

**Steps**:
1. Check App Service → Authentication blade — is the provider still active?
2. Verify the App Registration in Entra ID hasn't had its client secret rotated
3. Check the redirect URI matches `https://<app-name>.azurewebsites.net/.auth/login/aad/callback`
4. Review App Insights for auth-specific errors

---

## Issue: App cannot connect to SQL / Key Vault

**Symptoms**: 500 errors, timeout errors, "could not connect to server"
**Likely causes**:
1. Private Endpoint NIC not reachable
2. DNS resolving to public IP instead of private IP
3. Managed Identity not yet propagated after fresh deploy

**Steps**:
1. From App Service Kudu console (or via `az webapp ssh`):
   ```bash
   nslookup sql-<workload>-dev-eus-001.database.windows.net
   # Should return 10.x.x.x — if returning public IP, DNS is broken
   ```
2. Verify WEBSITE_VNET_ROUTE_ALL=1 and WEBSITE_DNS_SERVER=168.63.129.16 in App Settings
3. Check Private Endpoint provisioning state in Azure portal — must be "Succeeded"
4. If Managed Identity issue: restart the App Service and wait 2 minutes

---

## Issue: Pipeline failing on Bicep deployment

**Symptoms**: GitHub Actions / ADO pipeline fails at ARM deploy step
**Steps**:
1. Check error in pipeline logs — most common: missing parameter, wrong RG name
2. Run what-if locally:
   ```bash
   az deployment group what-if \
     --resource-group rg-<workload>-dev-eus-001 \
     --template-file infra/main.bicep \
     --parameters infra/main.dev.bicepparam
   ```
3. If pipeline itself is broken (break-glass): use script override per
   `references/pipelines.md` → Script Override Protocol. Log in CHANGELOG.md.

---

## Break-Glass: Manual Prod Access

If a Prod incident requires direct resource access outside of normal process:
1. Activate PIM role (Contributor on prod workload RG) — time-limited
2. Document the incident in CHANGELOG.md with `[Incident]` label
3. Deactivate PIM role immediately after
4. Create a follow-up task to address root cause via normal pipeline process
```
