# ResearchBase - 1Password Setup Checklist

## Current Status

- [x] Service account token created
- [x] Token stored in `.env.local`
- [x] Scripts created (`scripts/op_*.sh`)
- [ ] Vaults created in 1Password
- [ ] Vault access granted to service account

---

## Step 1: Create Vaults in 1Password Console

Go to: https://abstractfinance.1password.eu (your 1Password account)

Create the following vaults:

1. **RB - Admin / Breakglass** - Emergency access only
2. **RB - Staging** - Staging environment secrets
3. **RB - Prod** - Production environment secrets
4. **RB - Servers & SSH** - Server credentials
5. **RB - Automation Tokens** - CI/CD tokens

---

## Step 2: Grant Service Account Access

In 1Password Console:

1. Go to **Developer** > **Service Accounts**
2. Find the service account (email: `nuusnfqysjzyi@1passwordserviceaccounts.eu`)
3. Click **Edit vault access**
4. Grant access to:
   - `RB - Staging` (read/write)
   - `RB - Prod` (read only, or read/write for now)
   - `RB - Automation Tokens` (read)

---

## Step 3: Add Initial Secrets

### In `RB - Staging` vault, create:

| Item Name | Type | Fields |
|-----------|------|--------|
| `researchbase.staging.env` | Secure Note | Full .env content in notes |
| `supabase.staging` | Login | url, anon_key, service_key |
| `anthropic.api-key` | Password | API key in password field |
| `voyage.api-key` | Password | API key in password field |

### In `RB - Servers & SSH` vault, create:

| Item Name | Type | Fields |
|-----------|------|--------|
| `researchbase.hetzner.cax31` | Server | ip: 116.203.155.149, user: root |

---

## Step 4: Validate Access

```bash
# Load the token
source .env.local

# Validate
./scripts/op_validate.sh
```

Expected output:
```
=== ResearchBase 1Password Validation ===

✓ 1Password CLI installed: 2.x.x
✓ OP_SERVICE_ACCOUNT_TOKEN is set

Attempting to list accessible vaults...

✓ Authentication successful!

Accessible vaults:
ID                            NAME
xxxxxxxxxxxxxxxxxxxxxxxxxxxx  RB - Staging
xxxxxxxxxxxxxxxxxxxxxxxxxxxx  RB - Prod
...

=== Validation Complete ===
```

---

## Service Account Details

- **Account:** abstractfinance.1password.eu
- **Service Account Email:** nuusnfqysjzyi@1passwordserviceaccounts.eu
- **Token Location:** `.env.local` (gitignored)

---

## Quick Commands

```bash
# Validate access
source .env.local && ./scripts/op_validate.sh

# Fetch a secret
source .env.local && ./scripts/op_fetch_secret.sh "RB - Staging" "anthropic.api-key"

# Fetch full .env
source .env.local && ./scripts/op_fetch_env.sh "RB - Staging" "researchbase.staging.env" ".env"
```
