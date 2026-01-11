#!/bin/bash
# Setup backup system on Chronicle Engine (Hetzner)
# Run this script on the Chronicle Engine server: 138.199.231.3

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/home/chronicle/scripts/backup"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client rsync jq
}

# Copy scripts
install_scripts() {
    log_info "Installing backup scripts to $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
    cp "$SCRIPT_DIR/backup.sh" "$INSTALL_DIR/"
    cp "$SCRIPT_DIR/restore.sh" "$INSTALL_DIR/"
    cp "$SCRIPT_DIR/sync-storage.sh" "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR"/*.sh
}

# Generate SSH key for Storage Box
setup_ssh_key() {
    local key_file="/home/chronicle/.ssh/storagebox_key"

    if [ -f "$key_file" ]; then
        log_info "SSH key already exists: $key_file"
    else
        log_info "Generating SSH key for Storage Box..."
        ssh-keygen -t ed25519 -f "$key_file" -N ""
        log_warn "Add this public key to Hetzner Storage Box via Robot panel:"
        echo ""
        cat "${key_file}.pub"
        echo ""
    fi
}

# Create environment file template
create_env_template() {
    local env_file="/home/chronicle/.backup.env"

    if [ -f "$env_file" ]; then
        log_info "Environment file exists: $env_file"
    else
        log_info "Creating environment template..."
        cat > "$env_file" << 'EOF'
# Chronicle Backup Environment Variables
# Fill in the Supabase values, Storage Box is pre-configured

# Supabase Database (get from Supabase Dashboard > Settings > Database > Connection string)
export SUPABASE_DB_URL="postgresql://postgres.XXXXX:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Hetzner Storage Box (BX11 #500337) - CONFIGURED
export STORAGE_BOX_USER="u517522"
export STORAGE_BOX_HOST="u517522.your-storagebox.de"
export STORAGE_BOX_PATH="/chronicle"

# Optional: For cover image sync (get from Supabase Dashboard > Settings > API)
export SUPABASE_URL="https://XXXXX.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."
EOF
        chmod 600 "$env_file"
        log_warn "Edit $env_file with your credentials"
    fi
}

# Setup cron job
setup_cron() {
    log_info "Setting up cron job..."

    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "chronicle-backup"; then
        log_info "Cron job already exists"
    else
        # Add cron job
        (crontab -l 2>/dev/null; echo "# Chronicle daily backup at 3 AM UTC
0 3 * * * source /home/chronicle/.backup.env && $INSTALL_DIR/backup.sh >> /var/log/chronicle-backup.log 2>&1") | crontab -
        log_info "Cron job added: daily at 3 AM UTC"
    fi
}

# Create log file
setup_logging() {
    sudo touch /var/log/chronicle-backup.log
    sudo chown chronicle:chronicle /var/log/chronicle-backup.log
}

# Main
main() {
    echo ""
    echo "========================================"
    echo "   Chronicle Backup Setup"
    echo "========================================"
    echo ""

    install_deps
    install_scripts
    setup_ssh_key
    create_env_template
    setup_logging
    setup_cron

    echo ""
    log_info "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit /home/chronicle/.backup.env with your credentials"
    echo "2. Add SSH public key to Hetzner Storage Box (shown above)"
    echo "3. Test: source /home/chronicle/.backup.env && $INSTALL_DIR/backup.sh"
    echo ""
}

main "$@"
