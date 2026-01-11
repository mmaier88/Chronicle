#!/bin/bash
# Chronicle Restore Script
# Restores database from Hetzner Storage Box backup
#
# Usage: ./restore.sh [backup_file]
#   If no backup_file specified, restores from latest.sql.gz
#
# Required environment variables:
#   SUPABASE_DB_URL        - PostgreSQL connection string
#   STORAGE_BOX_USER       - Hetzner Storage Box username
#   STORAGE_BOX_HOST       - Hetzner Storage Box hostname
#   STORAGE_BOX_PATH       - Remote path for backups

set -e

# Configuration
RESTORE_DIR="/tmp/chronicle-restore"
BACKUP_FILE="${1:-latest.sql.gz}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# List available backups
list_backups() {
    log_info "Available backups:"
    ssh "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" \
        "ls -lh ${STORAGE_BOX_PATH}/database/*.sql.gz 2>/dev/null" || {
        log_error "No backups found"
        exit 1
    }
}

# Download backup from Storage Box
download_backup() {
    log_info "Downloading backup: $BACKUP_FILE"

    mkdir -p "$RESTORE_DIR"

    scp "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/database/${BACKUP_FILE}" \
        "$RESTORE_DIR/backup.sql.gz"

    log_info "Download complete"
}

# Restore database
restore_database() {
    log_info "Restoring database..."
    log_warn "This will OVERWRITE the current database. Press Ctrl+C to cancel."
    log_warn "Waiting 10 seconds..."
    sleep 10

    # Parse connection string
    PGPASSWORD=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGHOST=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    PGPORT=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGUSER=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGDATABASE=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD

    # Decompress and restore
    gunzip -c "$RESTORE_DIR/backup.sql.gz" | \
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --single-transaction --set ON_ERROR_STOP=on

    unset PGPASSWORD

    log_info "Database restored successfully"
}

# Cleanup
cleanup() {
    rm -rf "$RESTORE_DIR"
}

# Main execution
main() {
    echo ""
    echo "========================================"
    echo "   Chronicle Database Restore"
    echo "========================================"
    echo ""

    check_env

    if [ "$1" == "--list" ]; then
        list_backups
        exit 0
    fi

    download_backup
    restore_database
    cleanup

    log_info "Restore completed!"
}

main "$@"
