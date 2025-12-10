#!/usr/bin/env bash
#
# op_validate.sh - Validate 1Password CLI access for ResearchBase
#
# Usage: ./op_validate.sh
#
# Requires: OP_SERVICE_ACCOUNT_TOKEN environment variable
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== ResearchBase 1Password Validation ==="
echo ""

# Check if op CLI is installed
if ! command -v op &> /dev/null; then
    echo -e "${RED}ERROR: 1Password CLI (op) is not installed${NC}"
    echo ""
    echo "Installation instructions:"
    echo ""
    echo "  macOS:     brew install 1password-cli"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    curl -sS https://downloads.1password.com/linux/keys/1password.asc | \\"
    echo "      sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg"
    echo "    echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/amd64 stable main' | \\"
    echo "      sudo tee /etc/apt/sources.list.d/1password.list"
    echo "    sudo apt update && sudo apt install 1password-cli"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} 1Password CLI installed: $(op --version)"

# Check for service account token
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
    echo -e "${RED}ERROR: OP_SERVICE_ACCOUNT_TOKEN is not set${NC}"
    echo ""
    echo "Set it with:"
    echo "  export OP_SERVICE_ACCOUNT_TOKEN='ops_eyJ...'"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} OP_SERVICE_ACCOUNT_TOKEN is set"

# Validate token by listing vaults
echo ""
echo "Attempting to list accessible vaults..."
echo ""

if op vault list --format=json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Authentication successful!"
    echo ""
    echo "Accessible vaults:"
    op vault list
    echo ""
    echo -e "${GREEN}=== Validation Complete ===${NC}"
else
    echo -e "${RED}ERROR: Failed to authenticate with 1Password${NC}"
    echo ""
    echo "Possible causes:"
    echo "  - Invalid or expired service account token"
    echo "  - Network connectivity issues"
    echo "  - Service account lacks vault permissions"
    echo ""
    exit 1
fi
