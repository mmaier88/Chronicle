#!/usr/bin/env bash
#
# op_bootstrap_server.sh - Bootstrap a new ResearchBase server with 1Password
#
# Usage: ./op_bootstrap_server.sh <environment>
#
# Arguments:
#   environment - Either 'staging' or 'prod'
#
# This script:
#   1. Installs 1Password CLI if not present
#   2. Validates service account access
#   3. Creates application user and directories
#   4. Fetches .env file for the environment
#   5. Sets correct ownership and permissions
#
# Requires:
#   - Root or sudo access
#   - OP_SERVICE_ACCOUNT_TOKEN environment variable
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -ne 1 ]; then
    echo "Usage: $0 <environment>" >&2
    echo "  environment: 'staging' or 'prod'" >&2
    exit 1
fi

ENV="$1"

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
    echo -e "${RED}ERROR: Environment must be 'staging' or 'prod'${NC}" >&2
    exit 1
fi

echo "=== ResearchBase Server Bootstrap ($ENV) ==="
echo ""

# Check for root/sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}WARNING: Not running as root. Some operations may require sudo.${NC}"
fi

# Install 1Password CLI if not present
if ! command -v op &> /dev/null; then
    echo "Installing 1Password CLI..."

    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        curl -sS https://downloads.1password.com/linux/keys/1password.asc | \
            gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg
        echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/amd64 stable main' | \
            tee /etc/apt/sources.list.d/1password.list
        apt update && apt install -y 1password-cli
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS/Fedora
        rpm --import https://downloads.1password.com/linux/keys/1password.asc
        cat > /etc/yum.repos.d/1password.repo << EOF
[1password]
name=1Password Stable Channel
baseurl=https://downloads.1password.com/linux/rpm/stable/\$basearch
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://downloads.1password.com/linux/keys/1password.asc
EOF
        dnf install -y 1password-cli
    else
        echo -e "${RED}ERROR: Unsupported OS. Please install 1Password CLI manually.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} 1Password CLI installed"
else
    echo -e "${GREEN}✓${NC} 1Password CLI already installed: $(op --version)"
fi

# Check for service account token
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
    echo -e "${RED}ERROR: OP_SERVICE_ACCOUNT_TOKEN is not set${NC}"
    echo ""
    echo "Set it with:"
    echo "  export OP_SERVICE_ACCOUNT_TOKEN='ops_eyJ...'"
    exit 1
fi

echo -e "${GREEN}✓${NC} OP_SERVICE_ACCOUNT_TOKEN is set"

# Validate 1Password access
echo ""
echo "Validating 1Password access..."
if ! op vault list > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Failed to authenticate with 1Password${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} 1Password authentication successful"

# Set vault based on environment
if [ "$ENV" = "prod" ]; then
    VAULT="RB - Prod"
    ENV_ITEM="researchbase.prod.env"
else
    VAULT="RB - Staging"
    ENV_ITEM="researchbase.staging.env"
fi

# Create application user if not exists
APP_USER="researchbase"
APP_DIR="/opt/researchbase"

if ! id "$APP_USER" &>/dev/null; then
    echo "Creating application user: $APP_USER"
    useradd --system --shell /bin/bash --home-dir "$APP_DIR" --create-home "$APP_USER"
    echo -e "${GREEN}✓${NC} User $APP_USER created"
else
    echo -e "${GREEN}✓${NC} User $APP_USER already exists"
fi

# Create application directories
echo "Setting up application directories..."
mkdir -p "$APP_DIR"/{app,logs,data}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
echo -e "${GREEN}✓${NC} Directories created"

# Fetch .env file
echo ""
echo "Fetching .env from 1Password..."
ENV_PATH="$APP_DIR/app/.env"

if op item get "$ENV_ITEM" --vault "$VAULT" --fields notesPlain --reveal > "$ENV_PATH" 2>/dev/null; then
    chown "$APP_USER:$APP_USER" "$ENV_PATH"
    chmod 600 "$ENV_PATH"
    echo -e "${GREEN}✓${NC} .env written to $ENV_PATH"
else
    echo -e "${YELLOW}WARNING: Could not fetch .env - item may not exist yet${NC}"
    echo "  Create it in 1Password: $VAULT / $ENV_ITEM"
fi

echo ""
echo -e "${GREEN}=== Bootstrap Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy application code to $APP_DIR/app"
echo "  2. Configure systemd service or pm2"
echo "  3. Set up Caddy/Nginx reverse proxy"
echo ""
