#!/bin/bash
echo "🔐 Step 1: Login to Cloudflare (opens browser)..."
wrangler login

echo ""
echo "📡 Step 2: Deploying workers..."
echo "Signaling worker:"
SIG_OUT=$(wrangler deploy --config wrangler.toml 2>&1)
echo "$SIG_OUT"

SIGNALING_URL=$(echo "$SIG_OUT" | grep -oE 'https://[a-zA-Z0-9-]+\.workers\.dev' | head -1)
SIGNALING_WS="wss://${SIGNALING_URL#https://}/ws"

echo ""
echo "TURN worker:"
TURN_OUT=$(wrangler deploy --config worker/turn-wrangler.toml 2>&1)
echo "$TURN_OUT"

TURN_URL=$(echo "$TURN_OUT" | grep -oE 'https://[a-zA-Z0-9-]+\.workers\.dev' | head -1)
TURN_CONFIG="${TURN_URL}/turn-config"

echo ""
echo "✅ Workers deployed!"
echo "   Signaling: $SIGNALING_WS"
echo "   TURN: $TURN_CONFIG"
echo ""

echo "📝 Add these to GitHub Secrets:"
echo "   VITE_WS_URL=$SIGNALING_WS"
echo "   VITE_TURN_CONFIG_URL=$TURN_CONFIG"
echo ""

echo "🌐 Your conference will be at:"
echo "   https://verycosmic.github.io/distributed-video-conference/"
