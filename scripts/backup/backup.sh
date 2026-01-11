#!/bin/bash
# Chronicle Backup Script
# Runs on Chronicle Engine (Hetzner) to backup database and storage to Storage Box
#
# Required environment variables:
#   SUPABASE_DB_URL        - PostgreSQL connection string (from Supabase dashboard)
#   STORAGE_BOX_USER       - Hetzner Storage Box username (e.g., u123456)
#   STORAGE_BOX_HOST       - Hetzner Storage Box hostname (e.g., u123456.your-storagebox.de)
#   STORAGE_BOX_PATH       - Remote path for backups (e.g., /chronicle-backups)
#
# Optional environment variables:
#   SSH_KEY                - Path to SSH key for Storage Box (default: /root/.ssh/storagebox_key)
#   SUPABASE_URL           - Supabase project URL (for storage sync)
#   SUPABASE_SERVICE_KEY   - Supabase service role key (for storage sync)
#   GPG_PASSPHRASE         - Passphrase for backup encryption (required for encryption)
#   ALERT_WEBHOOK_URL      - Webhook URL for failure alerts (e.g., ntfy.sh, Slack, Discord)
#   BACKUP_NAME            - Name for this backup (e.g., "chronicle-prod", used in alerts)

set -e

# Configuration
BACKUP_DIR="/tmp/chronicle-backup"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DATE_SHORT=$(date +%Y-%m-%d)
RETENTION_DAYS=90
SSH_KEY="${SSH_KEY:-/root/.ssh/storagebox_key}"
SSH_PORT="${SSH_PORT:-23}"
SSH_OPTS="-i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
MAX_RETRIES=3
RETRY_DELAY=30
BACKUP_NAME="${BACKUP_NAME:-chronicle}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Send alert on failure
send_alert() {
    local message="$1"
    local title="${BACKUP_NAME} Backup FAILED"

    log_error "$message"

    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        # Support multiple webhook formats
        if [[ "$ALERT_WEBHOOK_URL" == *"ntfy.sh"* ]] || [[ "$ALERT_WEBHOOK_URL" == *"ntfy/"* ]]; then
            # ntfy.sh format
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Title: $title" \
                -H "Priority: high" \
                -H "Tags: warning,backup" \
                -d "$message" || log_warn "Failed to send ntfy alert"
        elif [[ "$ALERT_WEBHOOK_URL" == *"discord"* ]]; then
            # Discord webhook format
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"content\": \"🚨 **$title**\n$message\"}" || log_warn "Failed to send Discord alert"
        elif [[ "$ALERT_WEBHOOK_URL" == *"slack"* ]]; then
            # Slack webhook format
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"🚨 *$title*\n$message\"}" || log_warn "Failed to send Slack alert"
        else
            # Generic POST
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"title\": \"$title\", \"message\": \"$message\", \"backup\": \"$BACKUP_NAME\"}" || log_warn "Failed to send alert"
        fi
        log_info "Alert sent to webhook"
    else
        log_warn "No ALERT_WEBHOOK_URL configured - alert not sent"
    fi
}

# Retry a command with exponential backoff
retry_command() {
    local cmd="$1"
    local description="$2"
    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Attempt $attempt/$MAX_RETRIES: $description"

        if eval "$cmd"; then
            return 0
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            local delay=$((RETRY_DELAY * attempt))
            log_warn "Failed, retrying in ${delay}s..."
            sleep $delay
        fi

        ((attempt++))
    done

    return 1
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
        send_alert "Missing required environment variables"
        exit 1
    fi
}

# Create backup directory
setup() {
    log_info "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/storage"
}

# Backup PostgreSQL database with encryption
backup_database() {
    log_info "Backing up database..."

    local dump_file="$BACKUP_DIR/database/chronicle_${DATE}.sql.gz"
    local final_file="$dump_file"

    # Parse connection string
    PGPASSWORD=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGHOST=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    PGPORT=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGUSER=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGDATABASE=$(echo "$SUPABASE_DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD

    # pg_dump with retry
    local dump_cmd="pg_dump -h \"$PGHOST\" -p \"$PGPORT\" -U \"$PGUSER\" -d \"$PGDATABASE\" --no-owner --no-acl --clean --if-exists | gzip > \"$dump_file\""

    if ! retry_command "$dump_cmd" "Database dump"; then
        unset PGPASSWORD
        send_alert "Database dump failed after $MAX_RETRIES attempts. Host: $PGHOST"
        exit 1
    fi

    unset PGPASSWORD

    # Verify dump file exists and has content
    if [ ! -s "$dump_file" ]; then
        send_alert "Database dump file is empty or missing"
        exit 1
    fi

    # Encrypt if passphrase is set
    if [ -n "$GPG_PASSPHRASE" ]; then
        log_info "Encrypting backup..."
        local encrypted_file="${dump_file}.gpg"

        if echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "$encrypted_file" "$dump_file"; then
            rm "$dump_file"
            final_file="$encrypted_file"
            log_info "Backup encrypted with AES-256"
        else
            log_warn "Encryption failed, keeping unencrypted backup"
        fi
    fi

    local size=$(du -h "$final_file" | cut -f1)
    log_info "Database backup complete: $final_file ($size)"
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

# Upload to Hetzner Storage Box with retry
upload_to_storagebox() {
    log_info "Uploading to Hetzner Storage Box..."

    # Create remote directory structure via SFTP
    sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF || true
mkdir ${STORAGE_BOX_PATH}
mkdir ${STORAGE_BOX_PATH}/database
mkdir ${STORAGE_BOX_PATH}/storage
EOF

    # Upload database backup with retry
    local upload_cmd="rsync -avz --progress -e \"ssh $SSH_OPTS\" \"$BACKUP_DIR/database/\" \"${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/database/\""

    if ! retry_command "$upload_cmd" "Upload to Storage Box"; then
        send_alert "Upload to Storage Box failed after $MAX_RETRIES attempts"
        exit 1
    fi

    # Upload storage backup if exists
    if [ -d "$BACKUP_DIR/storage/covers" ] && [ "$(ls -A $BACKUP_DIR/storage/covers 2>/dev/null)" ]; then
        rsync -avz --progress -e "ssh $SSH_OPTS" \
            "$BACKUP_DIR/storage/" \
            "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/storage/" || log_warn "Storage upload had issues"
    fi

    log_info "Upload complete"
}

# Clean up old backups (local and remote)
cleanup_old_backups() {
    log_info "Cleaning up old backups (>${RETENTION_DAYS} days)..."

    # Clean local
    rm -rf "$BACKUP_DIR"

    # Calculate cutoff date
    local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

    log_info "Removing backups older than $cutoff_date..."

    # List remote files and delete old ones via SFTP
    # Get list of files, parse dates from filenames, delete old ones
    local remote_files=$(sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF 2>/dev/null | grep "chronicle_" || true
ls ${STORAGE_BOX_PATH}/database/
EOF
)

    local deleted=0
    for file in $remote_files; do
        # Extract date from filename: chronicle_YYYY-MM-DD_HH-MM-SS.sql.gz
        local file_date=$(echo "$file" | sed -n 's/chronicle_\([0-9-]*\)_.*/\1/p')

        if [ -n "$file_date" ] && [[ "$file_date" < "$cutoff_date" ]]; then
            log_info "Deleting old backup: $file (from $file_date)"
            sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes \
                "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF || log_warn "Failed to delete $file"
rm ${STORAGE_BOX_PATH}/database/$file
EOF
            ((deleted++)) || true
        fi
    done

    log_info "Cleanup complete - deleted $deleted old backup(s)"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Starting $BACKUP_NAME backup - $DATE"
    log_info "=========================================="

    # Trap errors and send alerts
    trap 'send_alert "Backup failed unexpectedly at line $LINENO"' ERR

    check_env
    setup
    backup_database
    backup_storage
    upload_to_storagebox
    cleanup_old_backups

    # Remove error trap on success
    trap - ERR

    log_info "=========================================="
    log_info "Backup completed successfully!"
    log_info "=========================================="
}

# Run main function
main "$@"
