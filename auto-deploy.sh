#!/bin/bash
# Automated deployment script for GitHub Pages + Cloudflare Workers

set -e

echo "🚀 Starting automated deployment..."

# Get repository info
REPO=$(git config --get remote.origin.url 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/' | sed 's/\.git$//' || echo "verycosmic/distributed-video-conference")
USERNAME=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)

echo "📦 Repository: $REPO"
echo ""

# Step 1: Install wrangler if needed
if ! command -v wrangler &> /dev/null; then
    echo "📥 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Step 2: Check Cloudflare login
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Not logged in to Cloudflare."
    echo "   Please run: wrangler login"
    echo "   Then run this script again."
    exit 1
fi

# Step 3: Deploy Cloudflare Workers
echo ""
echo "📡 Deploying Signaling Worker..."
SIGNALING_URL=$(wrangler deploy --config wrangler.toml 2>&1 | grep -o 'https://[^ ]*\.workers\.dev' | head -1 || echo "")

echo ""
echo "🔄 Deploying TURN Worker..."
TURN_URL=$(wrangler deploy --config worker/turn-wrangler.toml 2>&1 | grep -o 'https://[^ ]*\.workers\.dev' | head -1 || echo "")

# Extract worker names
SIGNALING_WS_URL="wss://${SIGNALING_URL#https://}/ws"
TURN_CONFIG_URL="$TURN_URL/turn-config"

echo ""
echo "✅ Workers deployed!"
echo "   Signaling: $SIGNALING_WS_URL"
echo "   TURN: $TURN_CONFIG_URL"
echo ""

# Step 4: Build client with environment variables
echo "🔨 Building client..."
export VITE_WS_URL="$SIGNALING_WS_URL"
export VITE_TURN_CONFIG_URL="$TURN_CONFIG_URL"
npm run build:client

echo ""
echo "✅ Build complete!"
echo ""

# Step 5: Prepare for GitHub Pages
echo "📋 GitHub Pages Configuration:"
echo ""
echo "1. Go to: https://github.com/$REPO/settings/secrets/actions"
echo "2. Add these secrets:"
echo "   VITE_WS_URL=$SIGNALING_WS_URL"
echo "   VITE_TURN_CONFIG_URL=$TURN_CONFIG_URL"
echo ""
echo "3. Go to: https://github.com/$REPO/settings/pages"
echo "4. Set Source to: 'GitHub Actions'"
echo ""
echo "5. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Deploy to GitHub Pages'"
echo "   git push origin main"
echo ""
echo "6. After GitHub Actions completes, your conference will be at:"
echo "   https://$USERNAME.github.io/$REPO_NAME/"
echo ""

# Save URLs to file
cat > DEPLOYMENT_URLS.txt << EOF
# Deployment URLs

## Cloudflare Workers
SIGNALING_WS_URL=$SIGNALING_WS_URL
TURN_CONFIG_URL=$TURN_CONFIG_URL

## GitHub Pages (after deployment)
CONFERENCE_URL=https://$USERNAME.github.io/$REPO_NAME/

## GitHub Secrets to Add
VITE_WS_URL=$SIGNALING_WS_URL
VITE_TURN_CONFIG_URL=$TURN_CONFIG_URL
EOF

echo "📄 URLs saved to: DEPLOYMENT_URLS.txt"
echo ""
echo "🎉 Deployment preparation complete!"

