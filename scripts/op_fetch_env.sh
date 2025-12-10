#!/usr/bin/env bash
#
# op_fetch_env.sh - Fetch .env file from 1Password and write to disk
#
# Usage: ./op_fetch_env.sh <vault> <item> <output_path>
#
# Arguments:
#   vault       - Name of the 1Password vault
#   item        - Name of the secure note containing .env content
#   output_path - Path where .env file should be written
#
# Example:
#   ./op_fetch_env.sh "RB - Prod" "researchbase.prod.env" ".env"
#   ./op_fetch_env.sh "RB - Staging" "researchbase.staging.env" "/app/.env"
#
# Requires: OP_SERVICE_ACCOUNT_TOKEN environment variable
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ $# -ne 3 ]; then
    echo "Usage: $0 <vault> <item> <output_path>" >&2
    exit 1
fi

VAULT="$1"
ITEM="$2"
OUTPUT_PATH="$3"

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
    echo -e "${RED}ERROR: OP_SERVICE_ACCOUNT_TOKEN is not set${NC}" >&2
    exit 1
fi

# Create parent directory if needed
OUTPUT_DIR=$(dirname "$OUTPUT_PATH")
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
fi

# Fetch the .env content from secure note
echo "Fetching .env from 1Password..."

if op item get "$ITEM" --vault "$VAULT" --fields notesPlain --reveal > "$OUTPUT_PATH" 2>/dev/null; then
    # Set secure permissions
    chmod 600 "$OUTPUT_PATH"
    echo -e "${GREEN}✓${NC} .env written to $OUTPUT_PATH (mode 600)"
else
    echo -e "${RED}ERROR: Failed to fetch .env from 1Password${NC}" >&2
    echo "  Vault: $VAULT" >&2
    echo "  Item: $ITEM" >&2
    exit 1
fi
