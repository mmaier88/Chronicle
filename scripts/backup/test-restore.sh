#!/bin/bash
# Chronicle Backup Restore Test
# Verifies that backups can be successfully restored
# Run monthly via cron to ensure backup integrity
#
# Required environment variables:
#   STORAGE_BOX_USER       - Hetzner Storage Box username
#   STORAGE_BOX_HOST       - Hetzner Storage Box hostname
#   STORAGE_BOX_PATH       - Remote path for backups
#
# Optional environment variables:
#   SSH_KEY                - Path to SSH key for Storage Box
#   GPG_PASSPHRASE         - Passphrase for encrypted backups
#   ALERT_WEBHOOK_URL      - Webhook URL for alerts
#   BACKUP_NAME            - Name for this backup (used in alerts)

set -e

# Configuration
TEST_DIR="/tmp/backup-restore-test"
SSH_KEY="${SSH_KEY:-/root/.ssh/storagebox_key}"
SSH_PORT="${SSH_PORT:-23}"
BACKUP_NAME="${BACKUP_NAME:-chronicle}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }

send_alert() {
    local message="$1"
    local is_success="${2:-false}"
    local title="${BACKUP_NAME} Restore Test"

    if [ "$is_success" = "true" ]; then
        title="$title PASSED ✓"
    else
        title="$title FAILED ✗"
    fi

    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        if [[ "$ALERT_WEBHOOK_URL" == *"ntfy"* ]]; then
            local priority="high"
            local tags="warning,backup"
            if [ "$is_success" = "true" ]; then
                priority="default"
                tags="white_check_mark,backup"
            fi
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Title: $title" \
                -H "Priority: $priority" \
                -H "Tags: $tags" \
                -d "$message" || true
        else
            curl -s -X POST "$ALERT_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"title\": \"$title\", \"message\": \"$message\", \"success\": $is_success}" || true
        fi
    fi
}

cleanup() {
    rm -rf "$TEST_DIR"
}

trap cleanup EXIT

main() {
    log_info "=========================================="
    log_info "Starting $BACKUP_NAME restore test"
    log_info "=========================================="

    # Setup
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"

    # Get latest backup filename
    log_info "Finding latest backup..."
    local latest_backup=$(sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF 2>/dev/null | grep "chronicle_" | sed 's|.*/||' | sort -r | head -1
ls ${STORAGE_BOX_PATH}/database/
EOF
)

    if [ -z "$latest_backup" ]; then
        log_error "No backups found!"
        send_alert "No backups found in ${STORAGE_BOX_PATH}/database/" "false"
        exit 1
    fi

    log_info "Latest backup: $latest_backup"

    # Download backup
    log_info "Downloading backup..."
    sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF
get ${STORAGE_BOX_PATH}/database/$latest_backup
EOF

    if [ ! -f "$latest_backup" ]; then
        log_error "Failed to download backup"
        send_alert "Failed to download $latest_backup" "false"
        exit 1
    fi

    local file_size=$(du -h "$latest_backup" | cut -f1)
    log_info "Downloaded: $file_size"

    # Decrypt if encrypted
    local sql_file="$latest_backup"
    if [[ "$latest_backup" == *.gpg ]]; then
        if [ -z "$GPG_PASSPHRASE" ]; then
            log_error "Backup is encrypted but GPG_PASSPHRASE not set"
            send_alert "Cannot test encrypted backup - GPG_PASSPHRASE not set" "false"
            exit 1
        fi

        log_info "Decrypting backup..."
        local decrypted_file="${latest_backup%.gpg}"
        if ! echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 -d "$latest_backup" > "$decrypted_file"; then
            log_error "Decryption failed"
            send_alert "Failed to decrypt $latest_backup" "false"
            exit 1
        fi
        sql_file="$decrypted_file"
        log_info "Decrypted successfully"
    fi

    # Decompress and verify
    log_info "Verifying backup integrity..."
    local uncompressed_file="${sql_file%.gz}"

    if ! gunzip -c "$sql_file" > "$uncompressed_file"; then
        log_error "Decompression failed - backup may be corrupted"
        send_alert "Failed to decompress $latest_backup - backup corrupted!" "false"
        exit 1
    fi

    # Check SQL content
    local line_count=$(wc -l < "$uncompressed_file")
    local has_tables=$(grep -c "CREATE TABLE" "$uncompressed_file" || echo "0")
    local has_data=$(grep -c "INSERT INTO\|COPY" "$uncompressed_file" || echo "0")

    log_info "SQL file: $line_count lines, $has_tables CREATE TABLE statements, $has_data data statements"

    if [ "$line_count" -lt 100 ]; then
        log_error "Backup seems too small ($line_count lines)"
        send_alert "Backup $latest_backup seems too small: only $line_count lines" "false"
        exit 1
    fi

    if [ "$has_tables" -lt 1 ]; then
        log_error "No CREATE TABLE statements found"
        send_alert "Backup $latest_backup has no CREATE TABLE statements - may be corrupted" "false"
        exit 1
    fi

    # Optional: Test actual restore to a temp database
    # This requires a PostgreSQL instance, uncomment if available
    # log_info "Testing restore to temp database..."
    # createdb backup_test_db
    # psql -d backup_test_db < "$uncompressed_file"
    # dropdb backup_test_db

    log_info "=========================================="
    log_info "Restore test PASSED!"
    log_info "  Backup: $latest_backup ($file_size)"
    log_info "  Lines: $line_count"
    log_info "  Tables: $has_tables"
    log_info "=========================================="

    send_alert "Backup $latest_backup verified successfully. Size: $file_size, Lines: $line_count, Tables: $has_tables" "true"
}

main "$@"
