# How to Use Secrets (Without Seeing Them)

When you need a secret (password, API key, token), **DO NOT** fetch and display it. Instead, use `op run` to inject it into commands.

## The Pattern

1. **Add the secret reference** to `~/.claude/mcp-servers/.env`:
   ```bash
   SECRET_NAME=op://Ai/item-name/field
   ```

2. **Run commands with `op run`**:
   ```bash
   op run --env-file=/Users/maier/.claude/mcp-servers/.env -- your-command
   ```

3. The command receives the secret as an environment variable. You never see the actual value.

## Example: Need a Database Password

```bash
# 1. Add to ~/.claude/mcp-servers/.env:
DB_PASSWORD=op://Ai/my-database/password

# 2. Run your command:
op run --env-file=/Users/maier/.claude/mcp-servers/.env -- psql -h localhost -U myuser
# psql receives DB_PASSWORD in its environment
```

## Example: Need an API Key for a Script

```bash
# 1. Add to ~/.claude/mcp-servers/.env:
API_KEY=op://Ai/some-service/api-key

# 2. Run the script:
op run --env-file=/Users/maier/.claude/mcp-servers/.env -- python script.py
# script.py can use os.environ['API_KEY']
```

## Available Secrets in "Ai" Vault

To see what's available, run:
```bash
op item list --vault Ai
```

Common items:
| Item | Field | Description |
|------|-------|-------------|
| `hetzner-cloud` | `token` | Hetzner Cloud API |
| `supabase` | `token` | Supabase access token |
| `Anthropic` | `credential` | Anthropic API key |
| `chronicle-prod-db` | `password` | Chronicle prod DB |
| `chronicle-staging-db` | `password` | Chronicle staging DB |
| `guided-prod-db` | `password` | Guided prod DB |
| `guided-staging-db` | `password` | Guided staging DB |
| `telegram.bot-token` | `credential` | Telegram bot |

## Reference Format

```
op://<vault>/<item>/<field>
```

Examples:
- `op://Ai/hetzner-cloud/token`
- `op://Ai/my-database/password`
- `op://Ai/some-api/credential`

Default field is `password` if not specified.

## DO NOT

- Fetch secrets and display them in conversation
- Use `op read` or `op item get` (shows secret in output)
- Hardcode secrets in scripts or configs

## DO

- Add `op://` references to `.env` file
- Wrap commands with `op run --env-file=...`
- Use environment variables in your code
