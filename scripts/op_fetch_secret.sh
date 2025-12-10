#!/usr/bin/env bash
#
# op_fetch_secret.sh - Fetch a single secret from 1Password
#
# Usage: ./op_fetch_secret.sh <vault> <item> [field]
#
# Arguments:
#   vault   - Name of the 1Password vault
#   item    - Name of the item in the vault
#   field   - (Optional) Specific field to retrieve, defaults to 'password'
#
# Example:
#   ./op_fetch_secret.sh "RB - Prod" "supabase.prod" "password"
#   ./op_fetch_secret.sh "RB - Prod" "voyage.api-key"
#
# Requires: OP_SERVICE_ACCOUNT_TOKEN environment variable
#

set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: $0 <vault> <item> [field]" >&2
    exit 1
fi

VAULT="$1"
ITEM="$2"
FIELD="${3:-password}"

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
    echo "ERROR: OP_SERVICE_ACCOUNT_TOKEN is not set" >&2
    exit 1
fi

# Fetch the secret
op item get "$ITEM" --vault "$VAULT" --fields "$FIELD" --reveal 2>/dev/null
