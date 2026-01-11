#!/bin/bash
# Chronicle Storage Sync Script
# Syncs Supabase Storage (covers bucket) to Hetzner Storage Box
#
# Required environment variables:
#   SUPABASE_URL           - Supabase project URL
#   SUPABASE_SERVICE_KEY   - Supabase service role key
#   STORAGE_BOX_USER       - Hetzner Storage Box username
#   STORAGE_BOX_HOST       - Hetzner Storage Box hostname
#   STORAGE_BOX_PATH       - Remote path for backups

set -e

# Configuration
SYNC_DIR="/tmp/chronicle-storage-sync"
BUCKET="covers"
SSH_KEY="${SSH_KEY:-/root/.ssh/storagebox_key}"
SSH_PORT="${SSH_PORT:-23}"
SSH_OPTS="-i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=accept-new"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies
check_deps() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required. Install with: apt-get install jq"
        exit 1
    fi
}

# Check environment
check_env() {
    for var in SUPABASE_URL SUPABASE_SERVICE_KEY STORAGE_BOX_USER STORAGE_BOX_HOST STORAGE_BOX_PATH; do
        if [ -z "${!var}" ]; then
            log_error "Missing: $var"
            exit 1
        fi
    done
}

# List all files in bucket
list_files() {
    local prefix="${1:-}"
    curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        "${SUPABASE_URL}/storage/v1/object/list/${BUCKET}" \
        -d "{\"prefix\":\"${prefix}\",\"limit\":1000}" \
        | jq -r '.[] | select(.name != null) | .name'
}

# Download file from bucket
download_file() {
    local file_path="$1"
    local local_path="$2"

    mkdir -p "$(dirname "$local_path")"

    curl -s \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${file_path}" \
        -o "$local_path"
}

# Sync bucket to local directory
sync_bucket() {
    log_info "Syncing $BUCKET bucket..."

    mkdir -p "$SYNC_DIR/$BUCKET"

    # Get list of user directories (each user has their own folder)
    local users=$(list_files "" | head -100)

    if [ -z "$users" ]; then
        log_warn "No files found in bucket or empty response"
        return
    fi

    local count=0
    for user_dir in $users; do
        # List files in user directory
        local files=$(list_files "$user_dir")

        for file in $files; do
            local remote_path="${user_dir}/${file}"
            local local_path="$SYNC_DIR/$BUCKET/$remote_path"

            # Skip if already exists locally (incremental sync)
            if [ ! -f "$local_path" ]; then
                log_info "Downloading: $remote_path"
                download_file "$remote_path" "$local_path"
                ((count++))
            fi
        done
    done

    log_info "Downloaded $count new files"
}

# Upload to Storage Box
upload_to_storagebox() {
    log_info "Uploading to Storage Box..."

    # Create remote directory via SFTP (Storage Box doesn't support shell commands)
    sftp -P "$SSH_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}" << EOF || true
mkdir ${STORAGE_BOX_PATH}
mkdir ${STORAGE_BOX_PATH}/storage
EOF

    # Rsync with incremental sync
    rsync -avz --progress -e "ssh $SSH_OPTS" \
        "$SYNC_DIR/" \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PATH}/storage/"

    log_info "Upload complete"
}

# Cleanup
cleanup() {
    # Keep local cache for incremental sync, but limit size
    local size=$(du -sm "$SYNC_DIR" 2>/dev/null | cut -f1)
    if [ "${size:-0}" -gt 1000 ]; then
        log_info "Cache too large (${size}MB), cleaning old files..."
        find "$SYNC_DIR" -type f -mtime +30 -delete
    fi
}

# Main
main() {
    log_info "Starting Chronicle Storage Sync"

    check_deps
    check_env
    sync_bucket
    upload_to_storagebox
    cleanup

    log_info "Storage sync complete!"
}

main "$@"
