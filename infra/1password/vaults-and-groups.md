# ResearchBase - 1Password Vault & Group Structure

## Groups (RBAC)

| Group | Description | Access Level |
|-------|-------------|--------------|
| **RB-Owners** | Project owners, full access | All vaults, manage permissions |
| **RB-Developers** | Core developers | Staging vault, read-only prod |
| **RB-CI** | CI/CD service accounts | Staging + Prod (deployment only) |

---

## Vaults

### 1. RB - Admin / Breakglass

**Purpose:** Emergency access, root credentials, recovery keys

**Access:** RB-Owners only

**Items:**
- `hetzner.root-password` - Server root password (emergency only)
- `supabase.owner-credentials` - Supabase project owner login
- `1password.recovery-kit` - 1Password account recovery
- `domain.registrar` - Domain registrar credentials

---

### 2. RB - Staging

**Purpose:** All staging environment secrets

**Access:** RB-Owners, RB-Developers, RB-CI (svc-rb-staging)

**Items:**
| Item | Type | Fields |
|------|------|--------|
| `researchbase.staging.env` | Secure Note | Full .env file content |
| `supabase.staging` | Login | url, anon_key, service_key |
| `anthropic.api-key` | API Credential | password |
| `voyage.api-key` | API Credential | password |
| `database.staging` | Database | url, host, port, user, password |
| `hetzner.ssh-key.staging` | Secure Note | Private key content |

---

### 3. RB - Prod

**Purpose:** All production environment secrets

**Access:** RB-Owners, RB-CI (svc-rb-prod)

**Items:**
| Item | Type | Fields |
|------|------|--------|
| `researchbase.prod.env` | Secure Note | Full .env file content |
| `supabase.prod` | Login | url, anon_key, service_key |
| `anthropic.api-key` | API Credential | password |
| `voyage.api-key` | API Credential | password |
| `database.prod` | Database | url, host, port, user, password |
| `hetzner.ssh-key.prod` | Secure Note | Private key content |

---

### 4. RB - Servers & SSH

**Purpose:** Server access credentials

**Access:** RB-Owners, RB-Developers (read-only)

**Items:**
| Item | Type | Fields |
|------|------|--------|
| `researchbase.hetzner.cax31` | Server | ip: 116.203.155.149, user: root |
| `ssh.deploy-key` | Secure Note | SSH key for deployments |

---

### 5. RB - Automation Tokens

**Purpose:** Service account tokens, API keys for automation

**Access:** RB-Owners, RB-CI

**Items:**
| Item | Type | Description |
|------|------|-------------|
| `github.deploy-token` | API Credential | GitHub Actions deployment |
| `svc-rb-staging.token` | API Credential | Staging service account token |
| `svc-rb-prod.token` | API Credential | Prod service account token |

---

## Vault Creation Commands

```bash
# Create vaults (run as 1Password admin)
op vault create "RB - Admin / Breakglass"
op vault create "RB - Staging"
op vault create "RB - Prod"
op vault create "RB - Servers & SSH"
op vault create "RB - Automation Tokens"
```

## Group Creation

```bash
# Create groups
op group create "RB-Owners"
op group create "RB-Developers"
op group create "RB-CI"

# Grant vault access
op vault group grant --vault "RB - Admin / Breakglass" --group "RB-Owners" --permissions manage_vault
op vault group grant --vault "RB - Staging" --group "RB-Owners" --permissions manage_vault
op vault group grant --vault "RB - Staging" --group "RB-Developers" --permissions read_items,write_items
op vault group grant --vault "RB - Prod" --group "RB-Owners" --permissions manage_vault
```
