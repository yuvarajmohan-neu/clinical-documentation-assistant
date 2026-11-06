# Resource Group Standards — The Jewish Board Azure

## Design Principles
1. **Shared RG = network fabric only**: VNet, subnets, NSGs, Route Tables, and Private DNS Zones. That's it. No compute, no data resources, no Private Endpoints.
2. **Workload RG = everything the app owns**: Compute, data, secrets, observability, and Private Endpoints all live here together.
3. **DNS is the bridge**: Private Endpoints live in the workload RG but register their NIC records into the Private DNS Zones in the shared RG. The shared RG never contains a Private Endpoint object.
4. **Lifecycle alignment**: Shared infra outlives any single app. A workload RG can be created or deleted without touching the shared RG.
5. **RBAC isolation**: Each workload RG is granted to an app team independently. Shared RG access is restricted to IT Infrastructure.

---

## Current State vs. Target State

| RG | Dev | Prod |
|----|-----|------|
| Shared networking | ✅ `rg-shared-dev-eus-001` (exists) | 🔲 `rg-shared-prod-eus-001` (to be created) |
| Workload RGs | 🔲 Created per-app at deployment time | 🔲 Created per-app at deployment time |

---

## Dev Subscription Layout

```
Dev Subscription
├── rg-shared-dev-eus-001                ← NETWORK FABRIC ONLY (exists today)
│   ├── vnet-shared-dev-eus-001
│   ├── snet-appservice-dev-eus-001
│   ├── snet-functions-dev-eus-001
│   ├── snet-containerapp-dev-eus-001
│   ├── snet-privateendpoints-dev-eus-001
│   ├── nsg-appservice-dev-eus-001
│   ├── nsg-privateendpoints-dev-eus-001
│   └── Private DNS Zones (linked to vnet-shared-dev-eus-001, no PEs here)
│       ├── privatelink.database.windows.net
│       ├── privatelink.vaultcore.azure.net
│       ├── privatelink.blob.core.windows.net
│       ├── privatelink.file.core.windows.net
│       └── privatelink.azurewebsites.net
│
├── rg-elss-dev-eus-001                  ← ELSS workload (app team owns this)
│   ├── app-elss-dev-eus-001             (App Service)
│   ├── asp-elss-dev-eus-001             (App Service Plan)
│   ├── sql-elss-dev-eus-001             (SQL Server)
│   ├── sqldb-elss-dev-eus-001           (SQL Database)
│   ├── stellssdeveus001                 (Storage Account)
│   ├── kv-elss-dev-eus-001              (Key Vault)
│   ├── appi-elss-dev-eus-001            (Application Insights)
│   ├── pe-sql-elss-dev-eus-001          ← PE for SQL (registers into shared DNS)
│   ├── pe-kv-elss-dev-eus-001           ← PE for Key Vault
│   └── pe-st-blob-elss-dev-eus-001      ← PE for Storage
│
├── rg-myavatar-dev-eus-001              ← MyAvatar integration workload
│   ├── func-myavatar-dev-eus-001
│   ├── asp-myavatar-dev-eus-001
│   ├── adf-myavatar-dev-eus-001
│   ├── sql-myavatar-dev-eus-001
│   ├── kv-myavatar-dev-eus-001
│   └── pe-sql-myavatar-dev-eus-001      ← PE lives here, not in shared RG
│
├── rg-assetgate-dev-eus-001             ← AssetGate / IT Hub workload
│   ├── app-assetgate-dev-eus-001
│   ├── kv-assetgate-dev-eus-001
│   └── pe-kv-assetgate-dev-eus-001
│
└── rg-shared-monitoring-dev-eus-001     ← Cross-workload observability
    ├── log-shared-dev-eus-001           (Log Analytics — all apps send here)
    └── appi-shared-dev-eus-001
```

## Prod Subscription Layout

Mirrors Dev exactly. All RGs are future state — created when prod is stood up.

```
Prod Subscription
├── rg-shared-prod-eus-001               ← Network fabric (to be created)
├── rg-elss-prod-eus-001
├── rg-myavatar-prod-eus-001
├── rg-assetgate-prod-eus-001
└── rg-shared-monitoring-prod-eus-001
```

---

## Resource Group Naming
```
rg-<workload-or-shared>-<env>-<region>-<instance>
```

| RG | Dev Name | Prod Name |
|----|----------|-----------|
| Shared networking | `rg-shared-dev-eus-001` | `rg-shared-prod-eus-001` |
| ELSS workload | `rg-elss-dev-eus-001` | `rg-elss-prod-eus-001` |
| MyAvatar workload | `rg-myavatar-dev-eus-001` | `rg-myavatar-prod-eus-001` |
| Shared monitoring | `rg-shared-monitoring-dev-eus-001` | `rg-shared-monitoring-prod-eus-001` |

---

## Required Tags on All Resource Groups

```bicep
tags: {
  Environment: 'Dev'            // 'Dev' or 'Prod'
  Workload: 'ELSS'              // workload name, or 'Shared'
  Owner: 'IT-Infrastructure'
  CostCenter: 'IT-Infrastructure'
  CreatedBy: 'Bicep'
}
```

---

## RBAC on Resource Groups

| Role | Scope | Assignee |
|------|-------|----------|
| `Contributor` | Shared RG | IT Infrastructure Entra group |
| `Contributor` | Workload RG | Workload dev team Entra group |
| `Reader` | All RGs | IT staff as needed |
| `Key Vault Secrets User` | Key Vault (resource-level) | App Managed Identity |
| `Key Vault Secrets Officer` | Key Vault in dev (resource-level) | Developers Entra group |

No individual user assignments — all via Entra ID Security Groups.
No standing Contributor on Prod — use PIM for time-limited activation.
