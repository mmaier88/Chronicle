#!/usr/bin/env bash
#
# op_inject_env.sh - Inject secrets as environment variables for CI/CD
#
# Usage:
#   source ./op_inject_env.sh <environment>
#   eval $(./op_inject_env.sh <environment>)
#
# Arguments:
#   environment - Either 'staging' or 'prod'
#
# This script fetches individual secrets and exports them as environment variables.
# Useful for CI/CD pipelines or local development.
#
# Requires: OP_SERVICE_ACCOUNT_TOKEN environment variable
#

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: source $0 <environment>" >&2
    echo "  environment: 'staging' or 'prod'" >&2
    exit 1
fi

ENV="$1"

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
    echo "ERROR: Environment must be 'staging' or 'prod'" >&2
    exit 1
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
    echo "ERROR: OP_SERVICE_ACCOUNT_TOKEN is not set" >&2
    exit 1
fi

# Set vault based on environment
if [ "$ENV" = "prod" ]; then
    VAULT="RB - Prod"
else
    VAULT="RB - Staging"
fi

# Fetch and export secrets
# Supabase
SUPABASE_URL=$(op item get "supabase.$ENV" --vault "$VAULT" --fields url --reveal 2>/dev/null || echo "")
SUPABASE_ANON_KEY=$(op item get "supabase.$ENV" --vault "$VAULT" --fields anon_key --reveal 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(op item get "supabase.$ENV" --vault "$VAULT" --fields service_key --reveal 2>/dev/null || echo "")

# AI Providers
ANTHROPIC_API_KEY=$(op item get "anthropic.api-key" --vault "$VAULT" --fields password --reveal 2>/dev/null || echo "")
VOYAGE_API_KEY=$(op item get "voyage.api-key" --vault "$VAULT" --fields password --reveal 2>/dev/null || echo "")

# Database (if using direct connection)
DATABASE_URL=$(op item get "database.$ENV" --vault "$VAULT" --fields url --reveal 2>/dev/null || echo "")

echo "export SUPABASE_URL='$SUPABASE_URL'"
echo "export SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY'"
echo "export SUPABASE_SERVICE_KEY='$SUPABASE_SERVICE_KEY'"
echo "export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY'"
echo "export VOYAGE_API_KEY='$VOYAGE_API_KEY'"
echo "export DATABASE_URL='$DATABASE_URL'"
echo "export RESEARCHBASE_ENV='$ENV'"
