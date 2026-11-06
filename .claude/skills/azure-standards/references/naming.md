# Naming Conventions — The Jewish Board Azure

## Pattern
```
<type>-<workload>-<env>-<region>-<instance>
```

## Resource Type Abbreviations

| Resource | Abbreviation | Hyphen-Allowed | Max Length |
|----------|-------------|----------------|------------|
| App Service | `app` | Yes | 60 |
| App Service Plan | `asp` | Yes | 40 |
| Function App | `func` | Yes | 60 |
| Container App | `ca` | Yes | 32 |
| Container App Environment | `cae` | Yes | 60 |
| Static Web App | `stapp` | Yes | 40 |
| Azure SQL Server | `sql` | Yes | 63 |
| Azure SQL Database | `sqldb` | Yes | 128 |
| Storage Account | `st` | **No** | 24 |
| Key Vault | `kv` | Yes | 24 |
| Virtual Network | `vnet` | Yes | 64 |
| Subnet | `snet` | Yes | 80 |
| Network Security Group | `nsg` | Yes | 80 |
| Private Endpoint | `pe` | Yes | 80 |
| Private DNS Zone | Use full DNS name | N/A | — |
| Logic App (Standard) | `logic` | Yes | 43 |
| Service Bus Namespace | `sb` | Yes | 50 |
| Service Bus Queue | `sbq` | Yes | 260 |
| Event Hub Namespace | `evhns` | Yes | 50 |
| Application Insights | `appi` | Yes | 260 |
| Log Analytics Workspace | `log` | Yes | 63 |
| Managed Identity | `id` | Yes | 128 |
| API Management | `apim` | Yes | 50 |
| Azure Data Factory | `adf` | Yes | 63 |
| Azure Container Registry | `acr` | **No** | 50 |

## Environment Tokens
| Environment | Token |
|-------------|-------|
| Development | `dev` |
| Production | `prod` |

## Region Tokens
| Region | Token |
|--------|-------|
| East US | `eus` |
| East US 2 | `eus2` |
| *(use eus unless directed otherwise)* | |

## Instance Numbers
- Always 3 digits, zero-padded: `001`, `002`
- Start at `001` unless a conflict exists
- DR/secondary instances use `002`

## Worked Examples — Jewish Board Workloads

### ELSS (Employee Lifecycle Search System)
| Resource | Dev Name | Prod Name |
|----------|----------|-----------|
| App Service | `app-elss-dev-eus-001` | `app-elss-prod-eus-001` |
| App Service Plan | `asp-elss-dev-eus-001` | `asp-elss-prod-eus-001` |
| SQL Server | `sql-elss-dev-eus-001` | `sql-elss-prod-eus-001` |
| SQL Database | `sqldb-elss-dev-eus-001` | `sqldb-elss-prod-eus-001` |
| Storage Account | `stellssdeveus001` | `stellssprodeus001` |
| Key Vault | `kv-elss-dev-eus-001` | `kv-elss-prod-eus-001` |
| Private Endpoint (SQL) | `pe-sql-elss-dev-eus-001` | `pe-sql-elss-prod-eus-001` |
| App Insights | `appi-elss-dev-eus-001` | `appi-elss-prod-eus-001` |

### MyAvatar Integration
| Resource | Dev Name |
|----------|----------|
| Function App | `func-myavatar-dev-eus-001` |
| App Service Plan | `asp-myavatar-dev-eus-001` |
| Service Bus | `sb-myavatar-dev-eus-001` |
| Key Vault | `kv-myavatar-dev-eus-001` |
| ADF | `adf-myavatar-dev-eus-001` |

### AssetGate / IT Hub
| Resource | Dev Name |
|----------|----------|
| App Service | `app-assetgate-dev-eus-001` |
| Key Vault | `kv-assetgate-dev-eus-001` |

## Anti-Patterns (Never Do These)
| Bad | Why | Good |
|-----|-----|------|
| `JewishBoardELSSApp` | PascalCase, no env/region | `app-elss-dev-eus-001` |
| `elss-prod` | Missing type, region, instance | `app-elss-prod-eus-001` |
| `sql-server-1` | No env, generic name | `sql-elss-dev-eus-001` |
| `MyStorageAccount` | Mixed case, no convention | `stellssdeveus001` |
| `kv-dev` | No workload specified | `kv-elss-dev-eus-001` |
| `app-elss-development-eastus-001` | Full words, not tokens | `app-elss-dev-eus-001` |

## Edge Cases
- **Shared resources** (VNet, DNS Zones): use `shared` as the workload token
  → `vnet-shared-dev-eus-001`
- **Log Analytics / App Insights workspace** shared across workloads: use `shared`
  → `log-shared-dev-eus-001`
- **Multiple instances of same type**: increment instance number
  → `snet-appservice-dev-eus-001`, `snet-functions-dev-eus-001`
- **Resources with global uniqueness requirements** (Storage, Key Vault, ACR):
  verify availability before committing
