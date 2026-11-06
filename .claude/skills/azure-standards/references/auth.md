# Authentication Standards — The Jewish Board Azure

## Guiding Principle
Every resource that Jewish Board staff access requires Entra ID authentication.
No exceptions without documented approval from IT leadership.

---

## 1. App Service Easy Auth (Internal Browser Apps)

For any App Service or Function App accessible by staff via browser:

### Setup Steps
1. Portal → App Service → Authentication → Add identity provider
2. Select **Microsoft** (Entra ID)
3. App registration: **Create new** (or reuse existing per workload)
4. **Unauthenticated requests**: `HTTP 401` (for APIs) or `Redirect to login` (for web apps)
5. Token store: **Enabled**
6. Allowed token audiences: add the app's Client ID

### App Registration Naming
```
<workload>-<env>-app
```
Examples:
- `elss-dev-app`
- `myavatar-prod-app`
- `assetgate-dev-app`

### Required App Registration Settings
- Redirect URI: `https://<app-name>.azurewebsites.net/.auth/login/aad/callback`
- ID tokens: **Enabled** (for web apps)
- Access tokens: **Enabled** (for APIs)
- Supported account types: **Single tenant** (Jewish Board only)

---

## 2. Managed Identity — Service-to-Service

All compute resources get a **System-Assigned Managed Identity** at creation.
Use Managed Identity for every service connection; never use connection strings
or access keys in application settings.

### Enable via Bicep
```bicep
resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  identity: {
    type: 'SystemAssigned'
  }
  // ...
}
```

### Role Assignments
| Target Resource | Role | Purpose |
|-----------------|------|---------|
| Key Vault | `Key Vault Secrets User` | Read secrets |
| Azure SQL | N/A — use contained DB user | SQL auth via Entra ID |
| Storage Account | `Storage Blob Data Contributor` | Blob read/write |
| Storage Account | `Storage Queue Data Contributor` | Queue access |
| Service Bus | `Azure Service Bus Data Sender/Receiver` | Messaging |

### SQL Contained Database User (Managed Identity)
Run once after deploying the app; use the Managed Identity's display name:
```sql
CREATE USER [app-elss-dev-eus-001] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [app-elss-dev-eus-001];
ALTER ROLE db_datawriter ADD MEMBER [app-elss-dev-eus-001];
```

---

## 3. Key Vault References in App Settings

Replace any secret in App Settings with a Key Vault reference:
```
@Microsoft.KeyVault(VaultName=kv-elss-dev-eus-001;SecretName=SecretName)
```

The App Service Managed Identity must have `Key Vault Secrets User` on the vault.

**Never** put a raw connection string, password, or API key in App Settings.

---

## 4. MSAL (for SPAs / APIs with Bearer Tokens)

For React/Angular frontends calling protected APIs:

### Frontend (MSAL.js)
```javascript
const msalConfig = {
  auth: {
    clientId: "<frontend-app-client-id>",
    authority: "https://login.microsoftonline.com/<tenant-id>",
    redirectUri: window.location.origin
  }
};

// Scope for the backend API
const apiScope = "api://<backend-client-id>/access_as_user";
```

### Backend API Validation (FastAPI / .NET)
- Validate `iss` claim: `https://sts.windows.net/<tenant-id>/`
- Validate `aud` claim: backend Client ID
- Validate `tid` claim: Jewish Board tenant ID
- Use `python-jose` (Python) or `Microsoft.Identity.Web` (.NET)

---

## 5. External / Patient-Facing Apps

If an application must be accessed by users outside the Jewish Board tenant:
1. Document the business need and get IT leadership approval
2. Evaluate Azure AD B2C as the identity provider
3. If using B2C, still protect backend APIs with Bearer token validation
4. Never expose SQL, Storage, or Key Vault publicly — external auth is only
   for the App Service frontend layer

---

## 6. Developer Access to Resources

| Resource | Access Method |
|----------|---------------|
| Key Vault (dev) | `Key Vault Secrets Officer` via Entra ID group |
| Azure SQL (dev) | Entra ID login, `db_owner` on dev databases only |
| Storage (dev) | `Storage Blob Data Contributor` via Entra ID group |
| Production resources | PIM (Privileged Identity Management) time-limited activation |

No standing Contributor/Owner assignments on production resources for individuals.
