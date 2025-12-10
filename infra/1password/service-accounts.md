# ResearchBase - 1Password Service Accounts

## Service Accounts

### svc-rb-staging

**Purpose:** Staging server and CI/CD deployments

**Vault Access:**
- `RB - Staging` (read/write)
- `RB - Automation Tokens` (read)

**Used By:**
- GitHub Actions (staging deploys)
- Staging server (`116.203.155.149`)

---

### svc-rb-prod

**Purpose:** Production server deployments

**Vault Access:**
- `RB - Prod` (read only)
- `RB - Automation Tokens` (read)

**Used By:**
- GitHub Actions (production deploys)
- Production server (future)

---

## Environment Variables

```bash
# Required on all servers and CI
export OP_SERVICE_ACCOUNT_TOKEN="ops_eyJ..."

# Optional: explicit vault references
export OP_VAULT_STAGING="RB - Staging"
export OP_VAULT_PROD="RB - Prod"
```

---

## GitHub Actions Setup

### 1. Add Repository Secret

Go to: `Settings > Secrets and variables > Actions > New repository secret`

| Name | Value |
|------|-------|
| `OP_SERVICE_ACCOUNT_TOKEN` | `ops_eyJ...` (full token) |

### 2. Workflow Usage

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install 1Password CLI
        uses: 1password/install-cli-action@v2
        with:
          version: 2.x

      - name: Validate 1Password Access
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
        run: |
          op vault list
          echo "1Password access validated"

      - name: Fetch Secrets
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
        run: |
          ./scripts/op_fetch_env.sh "RB - Staging" "researchbase.staging.env" ".env"
```

---

## Server Setup

### Initial Bootstrap

```bash
# On the server (as root)
export OP_SERVICE_ACCOUNT_TOKEN="ops_eyJ..."

# Run bootstrap script
curl -sSL https://raw.githubusercontent.com/your-org/researchbase/main/scripts/op_bootstrap_server.sh | bash -s staging
```

### Manual .env Fetch

```bash
# SSH to server
ssh root@116.203.155.149

# Set token
export OP_SERVICE_ACCOUNT_TOKEN="ops_eyJ..."

# Fetch .env
./scripts/op_fetch_env.sh "RB - Staging" "researchbase.staging.env" "/opt/researchbase/app/.env"
```

---

## Token Rotation

### When to Rotate
- Every 90 days (scheduled)
- After team member departure
- After suspected compromise

### Rotation Steps

1. **Create new token** in 1Password console
2. **Update GitHub Secret** with new token
3. **Update server** environment:
   ```bash
   # On server
   export OP_SERVICE_ACCOUNT_TOKEN="ops_NEW_TOKEN..."
   # Update in /etc/environment or systemd service
   ```
4. **Revoke old token** in 1Password console
5. **Verify** all systems work with new token

---

## Troubleshooting

### "vault not found"
- Check service account has vault access
- Verify vault name exactly matches (case-sensitive)

### "item not found"
- Check item exists in vault
- Verify item name exactly matches

### "unauthorized"
- Token may be expired or revoked
- Regenerate token in 1Password console

### "op: command not found"
- Install 1Password CLI:
  ```bash
  # macOS
  brew install 1password-cli

  # Linux
  ./scripts/op_bootstrap_server.sh staging
  ```
