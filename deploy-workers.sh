#!/bin/bash
# Deploy Cloudflare Workers for video conference

set -e

echo "🚀 Deploying Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare:"
    wrangler login
fi

echo ""
echo "📡 Deploying Signaling Worker..."
wrangler deploy --config wrangler.toml

echo ""
echo "🔄 Deploying TURN Worker..."
wrangler deploy --config worker/turn-wrangler.toml

echo ""
echo "✅ Workers deployed!"
echo ""
echo "📋 Get your worker URLs:"
echo "   Signaling: https://video-conference-signaling.verycosmic.workers.dev"
echo "   TURN: https://video-conference-turn.verycosmic.workers.dev"
echo ""
echo "💡 Update these URLs in your GitHub Secrets:"
echo "   VITE_WS_URL=wss://video-conference-signaling.verycosmic.workers.dev/ws"
echo "   VITE_TURN_CONFIG_URL=https://video-conference-turn.verycosmic.workers.dev/turn-config"

