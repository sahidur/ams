#!/bin/bash

#===============================================================================
# AMS Update Script - Pull latest changes and rebuild
#===============================================================================

set -e

APP_DIR="/var/www/ams"
PM2_APP_NAME="ams-production"

echo "🔄 Updating AMS..."

cd "$APP_DIR"

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "🗄️ Updating database..."
npx prisma generate
npx prisma db push

# Build application with increased memory
echo "🔨 Building application..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart "$PM2_APP_NAME"

echo "✅ Update complete!"
pm2 status
