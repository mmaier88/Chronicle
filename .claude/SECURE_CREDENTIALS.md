# Secure Credential Management for Claude Code

## How It Works

Claude uses `op run` to inject secrets into commands **without ever seeing them**.

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLAUDE CODE                               │
│                                                                  │
│  1. Adds reference to .env:  DB_PASS=op://Ai/mydb/password       │
│  2. Runs: op run --env-file=.env -- psql                         │
│                                                                  │
│  Claude sees: "psql connected successfully"                       │
│  Claude NEVER sees: the actual password                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   1Password Cloud   │
                   │   resolves op://    │
                   │   references        │
                   └─────────────────────┘
```

## Configuration

### `~/.claude/mcp-servers/.env`

Contains `op://` references (not actual secrets):

```bash
HCLOUD_TOKEN=op://Ai/hetzner-cloud/token
SUPABASE_TOKEN=op://Ai/supabase/token
# Add more as needed
```

### `~/.claude/config.json`

MCP tools wrapped with `op run`:

```json
{
  "mcpServers": {
    "hetzner-mcp": {
      "command": "op",
      "args": ["run", "--env-file=/Users/maier/.claude/mcp-servers/.env", "--", "mcp-hetzner"]
    }
  }
}
```

## For Claude: Using Secrets

See `~/.claude/1PASSWORD_INSTRUCTIONS.md`

**Pattern:**
1. Add `SECRET=op://Ai/item/field` to `.env`
2. Run `op run --env-file=... -- command`
3. Command gets secret as env var, Claude never sees it

## Remote MCP Server (for other machines)

The server at 91.99.97.249:8443 is for:
- Other servers needing secrets
- CI/CD pipelines
- Machines without `op` CLI

**Not for Claude** (would expose secrets in conversation).

### Server Management
```bash
ssh root@91.99.97.249 "systemctl status mcp-server"
```

## Files

| File | Purpose |
|------|---------|
| `~/.claude/config.json` | MCP server config |
| `~/.claude/mcp-servers/.env` | Secret references |
| `~/.claude/1PASSWORD_INSTRUCTIONS.md` | Instructions for Claude |
| `~/.claude/launch-claude.sh` | Launch with `op run` |
