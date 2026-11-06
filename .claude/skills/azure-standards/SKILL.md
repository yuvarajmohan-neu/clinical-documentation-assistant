---
name: azure-standards
description: >
  Enforces The Jewish Board's Azure architecture standards for ALL Azure work.
  This skill governs naming conventions, resource group placement, authentication
  (Entra ID / Azure AD), private networking, Key Vault usage, and environment
  separation across Dev and Prod subscriptions. Use this skill whenever the user
  is creating, designing, deploying, or reviewing ANY Azure resource — including
  App Services, Functions, Azure SQL, Storage, Key Vault, VNets, Private Endpoints,
  or anything else in Azure. Trigger even for quick "how should I name this?"
  questions, Bicep/Terraform scaffolding, architecture diagrams, runbooks, and
  deployment scripts. If Azure is involved, this skill applies.
---

# Azure Standards — The Jewish Board

This skill defines the repeatable, predictable blueprint for every Azure resource
at The Jewish Board. Follow it exactly unless the user explicitly overrides a
section with a business justification.

---

## 1. Subscription & Environment Model

| Environment | Subscription Purpose | Notes |
|-------------|----------------------|-------|
| **Dev**     | All development & testing work | Single subscription |
| **Prod**    | All production workloads | Single subscription |

**Hard rule**: Resources never cross subscription boundaries at runtime.
Dev resources talk only to Dev resources; Prod to Prod.

---

## 2. Resource Group Layout

See → [`references/resource-groups.md`](references/resource-groups.md)

### Quick Reference

#### Dev Subscription
| Resource Group | Purpose |
|----------------|---------|
| `rg-shared-dev-eus-001` | Shared networking (VNet, subnets, NSGs, Private DNS Zones, Private Endpoints) |
| `rg-<workload>-dev-eus-001` | Per-workload resources (App Service, Functions, SQL, Storage, etc.) |

#### Prod Subscription
| Resource Group | Purpose |
|----------------|---------|
| `rg-shared-prod-eus-001` | Shared networking (VNet, subnets, NSGs, Private DNS Zones, Private Endpoints) |
| `rg-<workload>-prod-eus-001` | Per-workload resources |

**Shared RG owns network fabric only** — VNet, subnets, NSGs, Route Tables, and
Private DNS Zones. Nothing else.

**Workload RGs own everything the app needs** — App Service Plans, App Services,
Function Apps, Container Apps, Static Web Apps, SQL Servers, SQL Databases,
Storage Accounts, Key Vaults, Application Insights, and **Private Endpoints**.

> Private Endpoints live in the workload RG alongside the resource they serve.
> They register their NIC records into the Private DNS Zones that live in the
> shared RG. The shared RG never contains Private Endpoints.

**The shared RG exists today in Dev (`rg-shared-dev-eus-001`). The prod shared RG
(`rg-shared-prod-eus-001`) will be created when prod is stood up. All workload RGs
are created per-app at deployment time.**

---

## 3. Naming Conventions

See → [`references/naming.md`](references/naming.md)

### Pattern
```
<resource-type-abbrev>-<workload>-<env>-<region>-<instance>
```

| Token | Values | Example |
|-------|--------|---------|
| resource-type-abbrev | See table in `references/naming.md` | `app`, `func`, `sql`, `st`, `kv`, `pe`, `vnet`, `snet` |
| workload | Short app/system name, lowercase, no spaces | `elss`, `myavatar`, `assetgate` |
| env | `dev` or `prod` | `dev` |
| region | `eus` (East US, primary) | `eus` |
| instance | 3-digit zero-padded number | `001` |

### Examples
| Resource | Name |
|----------|------|
| App Service (ELSS, dev) | `app-elss-dev-eus-001` |
| App Service Plan | `asp-elss-dev-eus-001` |
| Function App | `func-elss-dev-eus-001` |
| Container App | `ca-elss-dev-eus-001` |
| Container App Environment | `cae-elss-dev-eus-001` |
| Static Web App | `stapp-elss-dev-eus-001` |
| Azure SQL Server (ELSS, dev) | `sql-elss-dev-eus-001` |
| Storage Account (ELSS, dev) | `stelssdeveus001` *(no hyphens — SA limit)* |
| Key Vault (ELSS, dev) | `kv-elss-dev-eus-001` |
| Private Endpoint for SQL | `pe-sql-elss-dev-eus-001` |
| VNet (shared, dev) | `vnet-shared-dev-eus-001` |
| Subnet for App Services | `snet-appservice-dev-eus-001` |

> **Storage Account exception**: No hyphens, max 24 chars, lowercase alphanumeric only.
> Pattern: `st<workload><env><region><instance>` → `stelssdeveus001`

---

## 4. Authentication — Entra ID (Azure AD) First

See → [`references/auth.md`](references/auth.md)

### Rule
**Every app accessible to Jewish Board staff uses Entra ID authentication.**
No username/password auth for internal apps. No anonymous access to internal APIs.

### Decision Matrix

| Access Pattern | Auth Method |
|----------------|-------------|
| Internal staff (browser app) | App Service Easy Auth (Entra ID) |
| Internal staff (API/SPA calling backend) | Entra ID + Bearer token (MSAL) |
| Service-to-service (no user) | Managed Identity |
| External users (patients, vendors) | B2C or explicit exception approval |
| Public/anonymous | Not permitted without documented exception |

### Managed Identity Default
All App Services, Function Apps, and Container Apps get a **System-Assigned
Managed Identity** at creation. This identity is used for:
- Key Vault secret access (no connection strings in config)
- SQL authentication (contained database users)
- Storage access (role assignments, not access keys)
- Service Bus / Event Hub access

Never store service credentials in App Settings. Always use Key Vault references:
```
@Microsoft.KeyVault(VaultName=kv-elss-dev-eus-001;SecretName=SqlConnectionString)
```

---

## 5. Private Networking — All Traffic Private

See → [`references/networking.md`](references/networking.md)

### Principles
1. No public endpoints on data resources (SQL, Storage, Key Vault)
2. App Services and Function Apps use VNet Integration (outbound) + optionally Private Endpoints (inbound for internal-only apps)
3. Container Apps deployed into a workload profile environment with VNet injection
4. Static Web Apps: use Azure Functions backend with VNet-connected API; backend follows same private rules
5. **Private Endpoints live in the workload RG** alongside the resource they serve; they register DNS records into the Private DNS Zones in the shared RG
6. All private DNS resolution via Private DNS Zones in the **shared RG** — workload RGs never contain DNS zones
7. Internet-facing traffic may enter via App Service public endpoint, but **all backend calls stay on the private network**

### Required Private Endpoints per Workload (created in workload RG)
| Resource | Private DNS Zone (in shared RG) |
|----------|--------------------------------|
| Azure SQL | `privatelink.database.windows.net` |
| Storage (blob) | `privatelink.blob.core.windows.net` |
| Storage (file) | `privatelink.file.core.windows.net` |
| Key Vault | `privatelink.vaultcore.azure.net` |

### VNet Integration by Compute Type
| Compute | Outbound Method | Inbound Method |
|---------|----------------|----------------|
| App Service | Regional VNet Integration (`WEBSITE_VNET_ROUTE_ALL=1`) | Public or Private Endpoint |
| Function App | Regional VNet Integration (same settings) | Public or Private Endpoint |
| Container App | VNet-injected Container App Environment | Internal or External load balancer |
| Static Web App | Linked Azure Functions backend (VNet-connected) | Public CDN edge (frontend only) |

Subnet delegation for App Service / Function subnets: `Microsoft.Web/serverFarms`

---

## 6. Key Vault Standards

- **One Key Vault per workload per environment**: `kv-<workload>-<env>-eus-001`
- Public network access: **Disabled** (private endpoint only)
- Soft delete: **Enabled** (90 days), Purge protection: **Enabled**
- Access model: **RBAC** (not access policies)
- Managed Identities get `Key Vault Secrets User` role (read-only)
- Developers get `Key Vault Secrets Officer` role via PIM or group assignment
- Secrets naming convention: `PascalCase` descriptive names → `SqlConnectionString`,
  `StorageAccountKey`, `ApiClientSecret`

---

## 7. Tags — Required on All Resources

| Tag | Value | Example |
|-----|-------|---------|
| `Environment` | `Dev` or `Prod` | `Dev` |
| `Workload` | Short workload name | `ELSS` |
| `Owner` | Team or person responsible | `IT-Srikanth` |
| `CostCenter` | Jewish Board cost center code | `IT-Infrastructure` |
| `CreatedBy` | `Terraform` / `Bicep` / `Manual` | `Bicep` |

Apply tags at the **resource group** level and inherit down. Override at the
resource level only when needed.

---

## 8. Deployment Standards

See → [`references/deployment.md`](references/deployment.md)
See → [`references/pipelines.md`](references/pipelines.md)

### Pipeline-First Rule
**All deployments go through a pipeline.** GitHub Actions is preferred for
application workloads. Azure DevOps is preferred for M365-adjacent workloads
(ADF, Logic Apps, ADO repos). Document the choice in `docs/ARCHITECTURE.md`.

- Dev: automatic deploy on merge to `develop`
- Prod: manual approval gate on merge to `main`
- No manual portal changes in any environment without a logged exception

### Script Override
Scripts are a **permitted exception** — not a workaround. Use for dev iteration,
break-glass emergencies, and one-time tasks. Every script execution against a
live environment must be logged in `docs/CHANGELOG.md` as a `[Script Override]`
entry. Prod script runs require a second reviewer. See `references/pipelines.md`
→ Script Override Protocol for full rules and required script header format.

### IaC
- **Bicep** is the preferred IaC language
- All Bicep in `/infra/` with separate `main.dev.bicepparam` / `main.prod.bicepparam`
- No secrets in parameter files — all credentials via Key Vault references

### App Service / Function App Baseline Config
```
ASPNETCORE_ENVIRONMENT = Development | Production
WEBSITE_RUN_FROM_PACKAGE = 1
WEBSITE_VNET_ROUTE_ALL = 1
WEBSITE_DNS_SERVER = 168.63.129.16
SCM_DO_BUILD_DURING_DEPLOYMENT = false
```

---

## 9. Project Documentation — Required for Every Workload

See → [`references/project-docs.md`](references/project-docs.md)

Every workload repo must have a `docs/` folder containing these five files,
created at kickoff and kept current — not written at the end.

| File | Contents |
|------|---------|
| `docs/ARCHITECTURE.md` | System overview, component table, resource names, networking, auth, pipeline choice |
| `docs/SECURITY.md` | Auth methods per surface, network posture, secrets management, data classification |
| `docs/IMPLEMENTATION.md` | Step-by-step deploy guide, post-deploy validation, environment variables, gotchas |
| `docs/CHANGELOG.md` | Every deployment and script override, newest first. Includes `[Script Override]` and `[Incident]` labels |
| `docs/RUNBOOK.md` | Response procedures for known failure modes; break-glass Prod access steps |

Full templates for each file are in `references/project-docs.md`.

---

## 10. Checklist — New Workload

When standing up any new application, work through this in order:

**Documentation (before writing any code or IaC)**
- [ ] Create `docs/ARCHITECTURE.md` — name all resources, describe networking and auth approach
- [ ] Create `docs/SECURITY.md` — document auth methods, network posture, data classification
- [ ] Create `docs/IMPLEMENTATION.md` — write deploy steps as you go, not after
- [ ] Create `docs/CHANGELOG.md` — initialized with project kickoff entry
- [ ] Create `docs/RUNBOOK.md` — at minimum, document the Private Endpoint DNS check and auth failure steps

**Naming & Resource Groups**
- [ ] Name all resources using Section 3 conventions
- [ ] Create workload RG (`rg-<workload>-<env>-eus-001`) with required tags
- [ ] Confirm shared RG exists with VNet and Private DNS Zones in place

**Security Baseline**
- [ ] Enable System-Assigned Managed Identity on all compute resources
- [ ] Create Key Vault in workload RG; disable public access; assign RBAC roles
- [ ] Replace all App Setting credentials with Key Vault references
- [ ] Configure Easy Auth (Entra ID) on all user-facing apps

**Networking**
- [ ] Create Private Endpoints for SQL, Storage, Key Vault in workload RG
- [ ] Link each Private Endpoint to the correct Private DNS Zone in shared RG
- [ ] Enable VNet Integration on App Service / Function App (route all traffic)
- [ ] For Container Apps: deploy into VNet-injected Container App Environment
- [ ] Validate public network access is **Disabled** on SQL, Storage, Key Vault
- [ ] Verify DNS resolves to private IP: `nslookup <resource>.database.windows.net` → 10.x.x.x

**Pipeline**
- [ ] Set up OIDC service connection / federated credential (no client secrets)
- [ ] Create `pr-validate.yml` (Bicep lint + what-if)
- [ ] Create `deploy-dev.yml` (auto on merge to `develop`)
- [ ] Create `deploy-prod.yml` (manual approval gate on `main`)
- [ ] Create `scripts/README.md` even if no scripts exist yet
- [ ] Document pipeline platform choice (GitHub Actions / ADO) in ARCHITECTURE.md

**Observability**
- [ ] Wire Application Insights connection string into all compute resources
- [ ] Enable Log Analytics diagnostic settings on all resources
- [ ] Add required tags to all resources

**Go-Live**
- [ ] Deploy to Dev via pipeline (not script) as first official deployment
- [ ] Log initial deployment in `docs/CHANGELOG.md`

---

## Reference Files

| File | Contents |
|------|----------|
| `references/naming.md` | Full abbreviation table, edge cases, anti-patterns |
| `references/resource-groups.md` | RG layout detail, subscription structure, current vs. target state |
| `references/auth.md` | Entra ID setup steps, Managed Identity patterns, Easy Auth config |
| `references/networking.md` | Subnet design, Private Endpoint creation, DNS zone linking, Container Apps, Static Web Apps |
| `references/deployment.md` | Bicep templates, baseline app settings, diagnostic settings |
| `references/pipelines.md` | GitHub Actions pipelines, Azure DevOps pipelines, Script Override Protocol |
| `references/project-docs.md` | Full templates for ARCHITECTURE.md, SECURITY.md, IMPLEMENTATION.md, CHANGELOG.md, RUNBOOK.md |
