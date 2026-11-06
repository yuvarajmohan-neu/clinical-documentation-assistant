# Pipeline Standards — The Jewish Board Azure

## Hard Rules

1. **All deployments go through a pipeline by default** — GitHub Actions or
   Azure DevOps. No manual portal clicks in any environment without a logged
   exception.
2. **Script-based deployments are a permitted override** — but must follow the
   Script Override Protocol below. Scripts are not a shortcut; they are a
   documented exception.
3. **OIDC / Workload Identity Federation only** — no service principal client
   secrets in pipeline variables. No long-lived credentials anywhere.
4. **Dev deploys automatically** on merge to `develop`. **Prod requires a
   manual approval gate** before the deploy job runs.
5. **GitHub Actions** is preferred for application workloads (App Service,
   Functions, Container Apps, Static Web Apps).
   **Azure DevOps** is preferred for enterprise/M365-adjacent workloads (ADF,
   Logic Apps, anything in an ADO repo). Both are approved — document the
   choice in `docs/ARCHITECTURE.md`.

---

## Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|-----------|
| `main` | Production-ready code | Prod (manual approval gate) |
| `develop` | Integration branch | Dev (automatic on merge) |
| `feature/*` | New features | PR validation only (no deploy) |
| `hotfix/*` | Emergency prod fixes | Prod (expedited, still via pipeline) |

**PR rules** (`feature/*` → `develop`):
- Minimum 1 reviewer approval
- `pr-validate.yml` must pass (Bicep what-if, lint, unit tests)

**Merge rules** (`develop` → `main`):
- IT lead or workload owner approval required
- Full pipeline green on `develop` first

---

## Repository Structure

```
<workload>/
├── src/                          Application source code
├── infra/                        All Bicep IaC
│   ├── main.bicep
│   ├── main.dev.bicepparam
│   ├── main.prod.bicepparam
│   └── modules/
├── docs/                         Required documentation (see project-docs.md)
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── IMPLEMENTATION.md
│   ├── CHANGELOG.md
│   └── RUNBOOK.md
├── scripts/                      Override scripts (break-glass / dev utility)
│   └── README.md                 Explains what each script does and when to use it
├── .github/workflows/            GitHub Actions pipelines
│   ├── pr-validate.yml
│   ├── deploy-dev.yml
│   └── deploy-prod.yml
└── README.md
```

---

## GitHub Actions

### OIDC Setup (one-time per workload)

```bash
# 1. Create app registration
az ad app create --display-name "sp-<workload>-github-oidc"

# 2. Create service principal
az ad sp create --id <appId>

# 3. Assign Contributor on workload RG (dev)
az role assignment create \
  --role Contributor \
  --assignee <appId> \
  --scope /subscriptions/<dev-sub-id>/resourceGroups/rg-<workload>-dev-eus-001

# 4. Add federated credential in portal:
#    App Registration → Certificates & Secrets → Federated credentials
#    Entity: Branch | Branch: develop  (repeat for main → prod)
```

Required GitHub Secrets (set at repo level):
```
AZURE_CLIENT_ID        App registration client ID
AZURE_TENANT_ID        Jewish Board tenant ID
AZURE_DEV_SUB_ID       Dev subscription ID
AZURE_PROD_SUB_ID      Prod subscription ID
```

### PR Validation Pipeline

```yaml
# .github/workflows/pr-validate.yml
name: PR Validation

on:
  pull_request:
    branches: [develop, main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_DEV_SUB_ID }}

      - name: Bicep lint
        run: az bicep lint --file infra/main.bicep

      - name: Bicep what-if (dev)
        uses: azure/arm-deploy@v2
        with:
          subscriptionId: ${{ secrets.AZURE_DEV_SUB_ID }}
          resourceGroupName: rg-${{ env.WORKLOAD }}-dev-eus-001
          template: ./infra/main.bicep
          parameters: ./infra/main.dev.bicepparam
          additionalArguments: '--what-if'
          failOnStdErr: false
```

### Deploy to Dev Pipeline

```yaml
# .github/workflows/deploy-dev.yml
name: Deploy to Dev

on:
  push:
    branches: [develop]
    paths: ['infra/**', 'src/**']

jobs:
  deploy-infra:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_DEV_SUB_ID }}

      - name: Deploy Bicep
        uses: azure/arm-deploy@v2
        with:
          subscriptionId: ${{ secrets.AZURE_DEV_SUB_ID }}
          resourceGroupName: rg-${{ env.WORKLOAD }}-dev-eus-001
          template: ./infra/main.bicep
          parameters: ./infra/main.dev.bicepparam
          failOnStdErr: false

  deploy-app:
    needs: deploy-infra
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_DEV_SUB_ID }}
      - name: Deploy App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: app-${{ env.WORKLOAD }}-dev-eus-001
```

### Deploy to Prod Pipeline

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Prod

on:
  push:
    branches: [main]
    paths: ['infra/**', 'src/**']

jobs:
  approval-gate:
    runs-on: ubuntu-latest
    environment: production          # ← Requires manual approval in GitHub
    steps:
      - run: echo "Prod deployment approved"

  deploy-infra:
    needs: approval-gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_PROD_SUB_ID }}
      - name: Deploy Bicep
        uses: azure/arm-deploy@v2
        with:
          subscriptionId: ${{ secrets.AZURE_PROD_SUB_ID }}
          resourceGroupName: rg-${{ env.WORKLOAD }}-prod-eus-001
          template: ./infra/main.bicep
          parameters: ./infra/main.prod.bicepparam
          failOnStdErr: false
```

---

## Azure DevOps Pipelines

### Service Connection Setup (one-time)

```
Project Settings → Service Connections → New → Azure Resource Manager
→ Workload Identity Federation (recommended)
→ Scope: Subscription or Resource Group
→ Name: sc-<workload>-dev  /  sc-<workload>-prod
```

### Deploy Pipeline (ADO)

```yaml
# .azuredevops/deploy-dev.yml
trigger:
  branches:
    include: [develop]
  paths:
    include: [infra/*, src/*]

pool:
  vmImage: ubuntu-latest

stages:
  - stage: ValidateInfra
    jobs:
      - job: BicepWhatIf
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-<workload>-dev
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az bicep lint --file infra/main.bicep
                az deployment group what-if \
                  --resource-group rg-<workload>-dev-eus-001 \
                  --template-file infra/main.bicep \
                  --parameters infra/main.dev.bicepparam

  - stage: DeployDev
    dependsOn: ValidateInfra
    jobs:
      - deployment: DeployToDev
        environment: dev                  # ADO environment for tracking
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureResourceManagerTemplateDeployment@3
                  inputs:
                    deploymentScope: Resource Group
                    azureResourceManagerConnection: sc-<workload>-dev
                    subscriptionId: $(DEV_SUBSCRIPTION_ID)
                    resourceGroupName: rg-<workload>-dev-eus-001
                    location: eastus
                    templateLocation: Linked artifact
                    csmFile: infra/main.bicep
                    csmParametersFile: infra/main.dev.bicepparam

  - stage: DeployProd
    dependsOn: DeployDev
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProd
        environment: production           # ← Manual approval gate configured in ADO
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureResourceManagerTemplateDeployment@3
                  inputs:
                    azureResourceManagerConnection: sc-<workload>-prod
                    subscriptionId: $(PROD_SUBSCRIPTION_ID)
                    resourceGroupName: rg-<workload>-prod-eus-001
                    csmFile: infra/main.bicep
                    csmParametersFile: infra/main.prod.bicepparam
```

---

## Script Override Protocol

Scripts are a **permitted exception** to the pipeline-first rule. They are not
a workaround — they are a tool for specific situations with accountability.

### When Scripts Are Appropriate

| Scenario | Examples |
|----------|---------|
| Dev environment rapid iteration | Deploying a quick config change while actively developing |
| Break-glass emergency | Prod is down and the pipeline itself is broken |
| One-time data migration | Seeding reference data, running a migration script |
| Local developer setup | Bootstrapping a dev environment for the first time |
| Pipeline debugging | Running steps locally to diagnose a pipeline failure |

### When Scripts Are NOT Appropriate

- Deploying new infrastructure to Prod outside of an incident
- Bypassing the approval gate because it's inconvenient
- Making the same "temporary" change more than once

### Script Standards

All scripts in the `scripts/` folder must follow these rules:

**1. Header block on every script**
```powershell
<#
.SYNOPSIS
    <One line description>
.DESCRIPTION
    <What it does, what resources it touches>
.PARAMETER Environment
    dev or prod
.NOTES
    Override reason: <why this isn't going through the pipeline>
    Last used: <date>
    Author: <name>
#>
```

```bash
#!/bin/bash
# SYNOPSIS:  <one line>
# OVERRIDE:  <reason this isn't going through the pipeline>
# LAST USED: <date>
# AUTHOR:    <name>
```

**2. Dry-run flag required for infrastructure scripts**
```powershell
param(
    [string]$Environment = "dev",
    [switch]$WhatIf       # Always support -WhatIf before touching anything
)
```

**3. Log the execution**
Every script run that touches Dev or Prod must be logged in
`docs/CHANGELOG.md` under a `[Script Override]` entry:
```markdown
## [Script Override] 2025-03-05
**Script**: `scripts/seed-reference-data.ps1`
**Environment**: dev
**Reason**: One-time data seed — no pipeline equivalent needed
**Run by**: Srikanth
**Outcome**: 142 rows inserted into sqldb-elss-dev-eus-001
```

**4. Scripts never store credentials**
```powershell
# NEVER:
$password = "MyS3cret"

# ALWAYS: use az login / Managed Identity / Key Vault
az login --identity
$secret = az keyvault secret show --vault-name kv-elss-dev-eus-001 `
          --name SqlConnectionString --query value -o tsv
```

**5. Prod script runs require a second pair of eyes**
Any script targeting a Prod resource must be reviewed by one other IT team
member before execution. Document the reviewer in the CHANGELOG entry.

### scripts/README.md Template

Every repo's `scripts/` folder must have a README:

```markdown
# Scripts

These scripts are override tools — not the primary deployment path.
All production pipeline deployments go through GitHub Actions / Azure DevOps.
Scripts are used for dev iteration, break-glass scenarios, and one-time tasks.

## Usage Log
All script executions against live environments must be logged in
docs/CHANGELOG.md under a [Script Override] entry.

## Available Scripts

| Script | Purpose | Environments | Last Used |
|--------|---------|-------------|-----------|
| deploy-infra.ps1 | Deploy Bicep outside pipeline | dev only | 2025-03-01 |
| seed-data.ps1 | Seed reference tables | dev only | never |
```
