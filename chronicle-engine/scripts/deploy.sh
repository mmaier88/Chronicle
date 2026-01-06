#!/bin/bash
set -e

# Chronicle Engine Deployment Script

SERVER="root@138.199.231.3"
DEPLOY_PATH="/opt/chronicle-engine"

echo "🚀 Deploying Chronicle Engine..."

# Create deployment directory
echo "📁 Creating deployment directory..."
ssh $SERVER "mkdir -p $DEPLOY_PATH"

# Sync files (excluding node_modules, .git, etc.)
echo "📦 Syncing files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  /Users/maier/Documents/Cursor/Chronicle/chronicle-engine/ \
  $SERVER:$DEPLOY_PATH/

# Create .env file from 1Password or prompt
echo "🔐 Setting up environment..."
ssh $SERVER "cd $DEPLOY_PATH/infra && \
  if [ ! -f .env ]; then \
    cp .env.example .env && \
    echo '⚠️  Please edit .env with your secrets: $DEPLOY_PATH/infra/.env'; \
  fi"

# Build and deploy
echo "🐳 Building and starting services..."
ssh $SERVER "cd $DEPLOY_PATH/infra && \
  docker compose pull && \
  docker compose build --no-cache && \
  docker compose up -d"

# Run database migrations
echo "🗃️ Running database migrations..."
ssh $SERVER "cd $DEPLOY_PATH/infra && \
  docker compose exec -T api npx prisma migrate deploy"

# Health check
echo "🏥 Checking health..."
sleep 5
ssh $SERVER "curl -s http://localhost/health | jq ."

echo "✅ Deployment complete!"
echo ""
echo "API endpoint: http://138.199.231.3/v1/books"
echo "Health check: http://138.199.231.3/health"
