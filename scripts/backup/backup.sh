#!/bin/bash
# Chronicle Backup Script
# Runs on Chronicle Engine (Hetzner) to backup database and storage to Storage Box
#
# Required environment variables:
#   SUPABASE_DB_URL        - PostgreSQL connection string (from Supabase dashboard)
#   STORAGE_BOX_USER       - Hetzner Storage Box username (e.g., u123456)
#   STORAGE_BOX_HOST       - Hetzner Storage Box hostname (e.g., u123456.your-storagebox.de)
#   STORAGE_BOX_PATH       - Remote path for backups (e.g., /chronicle-backups)
#   SSH_KEY                - Path to SSH key for Storage Box (optional)
#   SUPABASE_URL           - Supabase project URL
#   SUPABASE_SERVICE_KEY   - Supabase service role key (for storage sync)

set -e

# Configuration
BACKUP_DIR="/tmp/chronicle-backup"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
RETENTION_DAYS=90
SSH_KEY="${SSH_KEY:-/root/.ssh/storagebox_key}"
SSH_PORT="${SSH_PORT:-23}"
SSH_OPTS="-i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=accept-new"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
check_env() {
    local missing=0
    for var in SUPABASE_DB_URL STORAGE_BOX_USER STORAGE_BOX_HOST STORAGE_BOX_PATH; do
        if [ -z "${!var}" ]; then
            log_error "Missing required environment variable: $var"
            missing=1
        fi
    done
    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Create backup directory
setup() {
    log_info "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/storage"
}

# Backup PostgreSQL database
backup_database() {
    log_info "Backing up database..."

    local dump_file="$BACKUP_DIR/database/chronicle_${DATE}.sql.gz"

    # Use pg_dump with compression
    PGPASSWORD=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGHOST=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    PGPORT=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGUSER=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGDATABASE=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD

    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --no-owner --no-acl --clean --if-exists \
        | gzip > "$dump_file"

    unset PGPASSWORD

    local size=$(du -h "$dump_file" | cut -f1)
    log_info "Database backup complete: $dump_file ($size)"
}

# Sync Supabase Storage (covers bucket) to Storage Box
backup_storage() {
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
        log_warn "Skipping storage backup - SUPABASE_URL or SUPABASE_SERVICE_KEY not set"
        return
    fi

    log_info "Backing up Supabase Storage (covers)..."

    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Run storage sync script (non-fatal if it fails)
    if [ -f "$SCRIPT_DIR/sync-storage.sh" ]; then
        "$SCRIPT_DIR/sync-storage.sh" || log_warn "Storage sync had errors but continuing..."
    else
        log_warn "sync-storage.sh not found, skipping storage backup"
    fi
}

# Upload to Hetzner Storage Box
upload_to_storagebox() {
    log_info "Uploading to Hetzner Storage Box..."

    # Create remote directory structure via SFTP (Storage Box doesn't support shell commands)
    sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF || true
mkdir ${STORAGE_BOX_PATH}
mkdir ${STORAGE_BOX_PATH}/database
mkdir ${STORAGE_BOX_PATH}/storage
EOF

    # Upload database backup
    rsync -avz --progress -e "ssh $SSH_OPTS" \
        "$BACKUP_DIR/database/" \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/database/"

    # Upload storage backup if exists
    if [ -d "$BACKUP_DIR/storage/covers" ] && [ "$(ls -A $BACKUP_DIR/storage/covers 2>/dev/null)" ]; then
        rsync -avz --progress -e "ssh $SSH_OPTS" \
            "$BACKUP_DIR/storage/" \
            "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/storage/"
    fi

    log_info "Upload complete"
}

# Clean up old backups (local and remote)
cleanup() {
    log_info "Cleaning up old backups..."

    # Clean local
    rm -rf "$BACKUP_DIR"

    # Note: Remote cleanup not supported on Storage Box (no shell access)
    # Old backups will be retained until manually cleaned or BorgBackup is set up
    log_info "Cleanup complete (local only - remote cleanup requires BorgBackup)"
}

# Create latest symlink for easy restore (skipped - Storage Box doesn't support symlinks via SFTP)
create_latest_symlink() {
    log_info "Skipping symlink creation (Storage Box limitation)"
    # Note: To find latest backup, sort by date in filename: chronicle_YYYY-MM-DD_HH-MM-SS.sql.gz
}

# Main execution
main() {
    log_info "Starting Chronicle backup - $DATE"

    check_env
    setup
    backup_database
    backup_storage
    upload_to_storagebox
    create_latest_symlink
    cleanup

    log_info "Backup completed successfully!"
}

# Run main function
main "$@"
