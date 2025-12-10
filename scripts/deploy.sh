#!/usr/bin/env bash
#
# deploy.sh - Deploy ResearchBase to the Hetzner server
#
# Usage: ./scripts/deploy.sh
#

set -euo pipefail

SERVER="root@138.199.231.3"
APP_DIR="/opt/researchbase"
DEPLOY_DIR="$APP_DIR/app"

echo "=== ResearchBase Deployment ==="
echo ""

# Check if we can connect
echo "Checking server connection..."
ssh -o ConnectTimeout=5 $SERVER "echo 'Connected to server'" || {
    echo "ERROR: Cannot connect to server"
    exit 1
}

# Create directory structure
echo "Creating directory structure..."
ssh $SERVER "mkdir -p $DEPLOY_DIR"

# Sync app files (excluding node_modules, .next, .git)
echo "Syncing application files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    ./app/ $SERVER:$DEPLOY_DIR/

# Copy .env file
echo "Copying environment file..."
scp ./app/.env.local $SERVER:$DEPLOY_DIR/.env.local

# Install dependencies and build on server
echo "Installing dependencies and building..."
ssh $SERVER "cd $DEPLOY_DIR && npm install && npm run build"

# Start/restart with pm2
echo "Starting application with pm2..."
ssh $SERVER "cd $DEPLOY_DIR && pm2 delete researchbase 2>/dev/null || true && pm2 start npm --name researchbase -- start && pm2 save"

echo ""
echo "=== Deployment Complete ==="
echo "App running at: http://138.199.231.3"
