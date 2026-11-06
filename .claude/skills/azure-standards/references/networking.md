# Networking Standards — The Jewish Board Azure

## Architecture Overview
```
Internet
    │
    ▼
App Service (public inbound optional)
    │  VNet Integration (outbound via snet-appservice-*-eus-001)
    ▼
VNet: vnet-shared-<env>-eus-001  (10.x.0.0/16)
    │
    ├── snet-appservice-<env>-eus-001     (App Service / Function VNet Integration)
    ├── snet-functions-<env>-eus-001      (Dedicated Function subnet if needed)
    ├── snet-privateendpoints-<env>-eus-001  (All Private Endpoints land here)
    └── snet-management-<env>-eus-001     (Bastion / jump box if needed)
        │
        ▼
    Private Endpoints → SQL, Storage, Key Vault, Service Bus
```

---

## 1. VNet Address Spaces (Suggested)

| Environment | VNet CIDR | Notes |
|-------------|-----------|-------|
| Dev | `10.10.0.0/16` | Non-overlapping with prod |
| Prod | `10.20.0.0/16` | Non-overlapping with dev |

### Subnet Sizing
| Subnet | CIDR | Purpose |
|--------|------|---------|
| `snet-appservice-dev-eus-001` | `/24` (256 IPs) | App Service / Function VNet integration |
| `snet-privateendpoints-dev-eus-001` | `/24` | All Private Endpoints |
| `snet-management-dev-eus-001` | `/27` | Bastion / admin tools |

---

## 2. Private Endpoints

### Placement Rule — Critical
Private Endpoints **live in the workload RG** alongside the resource they serve —
not in the shared RG.

The PE creates a NIC in `snet-privateendpoints-<env>-eus-001` (inside the shared
VNet) and registers an A record into the Private DNS Zone in the shared RG.
The PE object itself belongs to the workload.

```
rg-elss-dev-eus-001
  └── pe-sql-elss-dev-eus-001
        │  NIC → snet-privateendpoints-dev-eus-001  (shared VNet subnet)
        └── DNS A record → privatelink.database.windows.net  (shared RG DNS zone)
```

When a workload RG is deleted, its Private Endpoints go with it and their DNS
A records are automatically removed from the shared zones.

### Required Private Endpoints per Workload (created in workload RG)

| Service | PE Name Pattern | Private DNS Zone (shared RG) |
|---------|-----------------|------------------------------|
| Azure SQL | `pe-sql-<workload>-<env>-eus-001` | `privatelink.database.windows.net` |
| Key Vault | `pe-kv-<workload>-<env>-eus-001` | `privatelink.vaultcore.azure.net` |
| Storage Blob | `pe-st-blob-<workload>-<env>-eus-001` | `privatelink.blob.core.windows.net` |
| Storage File | `pe-st-file-<workload>-<env>-eus-001` | `privatelink.file.core.windows.net` |

### Bicep Pattern — Private Endpoint + DNS Registration
> Deploy this in the **workload RG** (`rg-elss-dev-eus-001`).
> The `peSubnetId` and `privateDnsZoneId` are passed in from the shared RG as parameters.
```bicep
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-sql-elss-dev-eus-001'
  location: location
  properties: {
    subnet: {
      id: peSubnetId  // snet-privateendpoints-dev-eus-001
    }
    privateLinkServiceConnections: [
      {
        name: 'pe-sql-elss-dev-eus-001'
        properties: {
          privateLinkServiceId: sqlServer.id
          groupIds: ['sqlServer']
        }
      }
    ]
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-05-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-database-windows-net'
        properties: {
          privateDnsZoneId: sqlPrivateDnsZoneId
        }
      }
    ]
  }
}
```

---

## 3. App Service VNet Integration

### Enable VNet Integration
```bicep
resource appServiceVnetIntegration 'Microsoft.Web/sites/networkConfig@2023-01-01' = {
  name: '${appService.name}/virtualNetwork'
  properties: {
    subnetResourceId: appServiceSubnetId  // snet-appservice-dev-eus-001
    swiftSupported: true
  }
}
```

### Required App Settings for Private DNS Resolution
```
WEBSITE_VNET_ROUTE_ALL = 1
WEBSITE_DNS_SERVER = 168.63.129.16
```

Both settings are mandatory. Without `WEBSITE_VNET_ROUTE_ALL`, only RFC1918
traffic routes through the VNet. Without the DNS server setting, Private DNS
Zones will not resolve.

---

## 4. Public Network Access

### Disable Public Access on Data Resources
```bicep
// Azure SQL — disable public endpoint
resource sqlServer 'Microsoft.Sql/servers@2023-02-01-preview' = {
  properties: {
    publicNetworkAccess: 'Disabled'
    restrictOutboundNetworkAccess: 'Disabled'
  }
}

// Key Vault — network ACLs deny all public
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  properties: {
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// Storage Account — deny public, allow trusted services
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  properties: {
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}
```

---

## 4. Container Apps — VNet Injection

Container App Environments must be deployed with VNet injection enabled. Use a
dedicated subnet with sufficient address space (minimum `/23` — Container Apps
require many IPs).

```bicep
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-elss-dev-eus-001'
  location: location
  properties: {
    vnetConfiguration: {
      internal: false               // true = internal load balancer only
      infrastructureSubnetId: containerAppSubnetId  // snet-containerapp-dev-eus-001
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceId
        sharedKey: logAnalyticsKey
      }
    }
  }
}
```

Container Apps access private resources (SQL, Key Vault, Storage) via the VNet
injection — no additional VNet Integration setting needed (unlike App Service).

---

## 5. Static Web Apps — Backend Isolation

Static Web Apps serve the frontend from Azure CDN (public). The backend API
**must** be an Azure Functions app with VNet Integration. The SWA links to the
Functions app via the "Linked backends" feature — never put business logic or
data access in the SWA itself.

```
Browser → SWA CDN (public) → /api/* → Linked Functions App (VNet-integrated)
                                               ↓
                                    Private SQL / KV / Storage
```

---

## 6. App Service Inbound Access

App Services MAY have public inbound access (for internet-facing apps).
When public inbound is required:
- Enable **App Service Authentication** (Entra ID) — see `auth.md`
- Consider IP restrictions if the app is internal-only
- For fully internal apps: add IP restriction to VNet subnet only,
  or use Azure Front Door / Application Gateway in front

### Internal-Only App Restriction
```bicep
resource ipRestrictions 'Microsoft.Web/sites/config@2023-01-01' = {
  name: '${appService.name}/web'
  properties: {
    ipSecurityRestrictions: [
      {
        vnetSubnetResourceId: appServiceSubnetId
        action: 'Allow'
        priority: 100
        name: 'Allow-VNet'
      }
      {
        ipAddress: 'Any'
        action: 'Deny'
        priority: 2147483647
        name: 'Deny-All'
      }
    ]
  }
}
```

---

## 7. NSG Rules (Baseline)

Every subnet should have an NSG. Default baseline:
- Allow inbound from VNet CIDR on required ports
- Allow outbound to VNet CIDR
- Allow outbound to `AzureMonitor`, `AzureActiveDirectory` service tags
- Deny all other inbound from Internet
- Log all denied traffic to Log Analytics

---

## 8. Private DNS Zones (Pre-created in Shared RG)

These zones must exist in `rg-shared-<env>-eus-001` before deploying Private Endpoints:

```
privatelink.database.windows.net
privatelink.vaultcore.azure.net
privatelink.blob.core.windows.net
privatelink.file.core.windows.net
privatelink.queue.core.windows.net
privatelink.table.core.windows.net
privatelink.servicebus.windows.net
privatelink.azurewebsites.net
```

All zones must be **linked to `vnet-shared-<env>-eus-001`** with auto-registration disabled.
