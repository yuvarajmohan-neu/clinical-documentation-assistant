# Deployment Standards — The Jewish Board Azure

## IaC Strategy
- **Language**: Bicep (preferred over ARM JSON; Terraform acceptable for complex multi-cloud needs)
- **Repository structure**: `/infra/` folder in each workload repo
- **Parameter files**: One per environment, checked into source control (no secrets in params)
- **Deployments**: Always via pipeline, never manual portal changes in Prod

---

## Bicep File Structure

```
infra/
├── main.bicep                    ← Orchestration (calls all modules)
├── main.dev.bicepparam           ← Dev parameter values
├── main.prod.bicepparam          ← Prod parameter values
└── modules/
    ├── appService.bicep
    ├── sqlServer.bicep
    ├── keyVault.bicep
    ├── storageAccount.bicep
    └── privateEndpoint.bicep
```

---

## main.bicep Starter Template

```bicep
@description('Environment name: dev or prod')
@allowed(['dev', 'prod'])
param environment string

@description('Workload short name (e.g. elss, myavatar)')
param workload string

@description('Azure region short code')
param regionCode string = 'eus'

@description('Instance number (zero-padded)')
param instance string = '001'

@description('Resource Group for shared networking')
param sharedRgName string

var suffix = '${workload}-${environment}-${regionCode}-${instance}'
var location = resourceGroup().location

// App Service Plan
module asp 'modules/appService.bicep' = {
  name: 'deploy-asp-${suffix}'
  params: {
    appServicePlanName: 'asp-${suffix}'
    appServiceName: 'app-${suffix}'
    location: location
    environment: environment
    workload: workload
    // Pass subnet ID from shared RG for VNet Integration
    vnetIntegrationSubnetId: sharedNetworking.outputs.appServiceSubnetId
  }
}

// Key Vault
module kv 'modules/keyVault.bicep' = {
  name: 'deploy-kv-${suffix}'
  params: {
    keyVaultName: 'kv-${suffix}'
    location: location
    appServicePrincipalId: asp.outputs.principalId
    peSubnetId: sharedNetworking.outputs.peSubnetId
    privateDnsZoneId: sharedNetworking.outputs.kvPrivateDnsZoneId
  }
}
```

---

## Parameter File Pattern

```bicep
// main.dev.bicepparam
using 'main.bicep'

param environment = 'dev'
param workload = 'elss'
param sharedRgName = 'rg-shared-dev-eus-001'
```

```bicep
// main.prod.bicepparam
using 'main.bicep'

param environment = 'prod'
param workload = 'elss'
param sharedRgName = 'rg-shared-prod-eus-001'
```

**No secrets in parameter files.** Key Vault references handle all credentials at runtime.

---

## Pipeline

All deployments go through GitHub Actions or Azure DevOps.
See → [`pipelines.md`](pipelines.md) for full pipeline YAML, OIDC setup,
branch strategy, and the Script Override Protocol.

**Summary**:
- Dev: auto-deploy on merge to `develop`
- Prod: manual approval gate on merge to `main`
- Script overrides: permitted with `[Script Override]` entry in CHANGELOG.md

---

## App Service / Function App Baseline App Settings

Always set these on every App Service or Function App:

```bicep
appSettings: [
  {
    name: 'ASPNETCORE_ENVIRONMENT'
    value: environment == 'prod' ? 'Production' : 'Development'
  }
  {
    name: 'WEBSITE_RUN_FROM_PACKAGE'
    value: '1'
  }
  {
    name: 'WEBSITE_VNET_ROUTE_ALL'
    value: '1'
  }
  {
    name: 'WEBSITE_DNS_SERVER'
    value: '168.63.129.16'
  }
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsights.properties.ConnectionString
  }
]
```

## Container App Baseline

```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-elss-dev-eus-001'
  identity: { type: 'SystemAssigned' }
  properties: {
    environmentId: containerAppEnvId   // cae-elss-dev-eus-001
    configuration: {
      ingress: {
        external: true     // false for internal-only
        targetPort: 8080
      }
      secrets: []          // Use Key Vault references, not inline secrets
    }
    template: {
      containers: [
        {
          name: 'app'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          env: [
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 5 }
    }
  }
}
```

## Static Web App Baseline

```bicep
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'stapp-elss-dev-eus-001'
  sku: { name: 'Standard', tier: 'Standard' }  // Standard required for linked backends
  properties: {
    buildProperties: {
      appLocation: '/'
      outputLocation: 'build'
    }
  }
}

// Link Functions backend
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-01-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionApp.id
    region: location
  }
}
```

---

## Deployment Checklist

Before deploying any change to Prod:

- [ ] Change deployed to Dev and smoke-tested
- [ ] `docs/CHANGELOG.md` updated with this version's entry
- [ ] No hardcoded secrets in code or Bicep params
- [ ] Private Endpoints verified — `nslookup` returns 10.x.x.x (not public IP)
- [ ] Easy Auth enabled on any new user-facing apps
- [ ] Key Vault references used for all credentials
- [ ] Tags applied to all new resources
- [ ] Log Analytics diagnostic settings wired up
- [ ] Pipeline used for deployment (or `[Script Override]` entry logged if not)

---

## Diagnostic Settings (Every Resource)

Enable diagnostic logs → Log Analytics Workspace:

```bicep
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${resourceName}'
  scope: targetResource
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}
```
