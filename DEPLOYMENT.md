# Deployment Guide

This video conferencing application is designed to run on GitHub Pages (for the client) and Cloudflare Workers (for signaling and TURN services).

## Prerequisites

1. A GitHub account with a repository
2. A Cloudflare account (free tier works)
3. Node.js 20+ installed locally

## Step 1: Deploy Cloudflare Workers

### 1.1 Setup Cloudflare Account

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Go to Workers & Pages dashboard
3. Get your Account ID from the dashboard URL or sidebar
4. Create an API token:
   - Go to "My Profile" → "API Tokens"
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Save the token securely

### 1.2 Deploy Signaling Worker

1. Install Wrangler CLI (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Update `wrangler.toml` with your account details:
   ```toml
   name = "video-conference-signaling"
   # ... rest of config
   ```

4. Deploy the signaling worker:
   ```bash
   npm run deploy:worker:signaling
   ```

5. Note the worker URL (e.g., `https://video-conference-signaling.your-subdomain.workers.dev`)

### 1.3 Deploy TURN Worker

1. Deploy the TURN worker:
   ```bash
   npm run deploy:worker:turn
   ```

2. Note the worker URL (e.g., `https://video-conference-turn.your-subdomain.workers.dev`)

### 1.4 Configure TURN Server (Optional but Recommended)

For production, you should use a real TURN server. Options:
- [Twilio STUN/TURN](https://www.twilio.com/stun-turn)
- [Metered TURN](https://www.metered.ca/tools/openrelay/)
- [Coturn](https://github.com/coturn/coturn) (self-hosted)

Update `worker/turn.ts` with your TURN server credentials.

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets:
   - `VITE_WS_URL`: Your signaling worker WebSocket URL (e.g., `wss://video-conference-signaling.your-subdomain.workers.dev/ws`)
   - `VITE_TURN_CONFIG_URL`: Your TURN worker config URL (e.g., `https://video-conference-turn.your-subdomain.workers.dev/turn-config`)
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

## Step 3: Enable GitHub Pages

1. Go to your repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The deployment will happen automatically on push to `main` branch

## Step 4: Update Environment Variables

After deployment, update the client code with your worker URLs:

1. Create a `.env.production` file (optional, for local builds):
   ```
   VITE_WS_URL=wss://your-signaling-worker.workers.dev/ws
   VITE_TURN_CONFIG_URL=https://your-turn-worker.workers.dev/turn-config
   ```

2. Or update the default values in:
   - `src/client/hooks/useSignaling.ts`
   - `src/client/hooks/useWebRTC.ts`

## Step 5: Build and Deploy

The GitHub Actions workflow will automatically:
1. Build the client application
2. Deploy to GitHub Pages
3. Deploy workers (if worker files change)

Or deploy manually:

```bash
# Build client
npm run build:client

# Deploy workers
npm run deploy:worker:signaling
npm run deploy:worker:turn
```

## Testing Locally

1. Start the local development server:
   ```bash
   npm run dev:client
   ```

2. For local testing with workers, use `wrangler dev`:
   ```bash
   wrangler dev --config wrangler.toml
   ```

3. Update `VITE_WS_URL` in `.env.local` to point to your local worker

## Features

- ✅ Single global meeting room
- ✅ Pre-stage with camera/mic preview and name entry
- ✅ P2P WebRTC for up to 4 participants
- ✅ TURN fallback for participants 5-12 (low quality)
- ✅ Click to maximize/minimize video streams
- ✅ Host/cohost controls (first two joiners)
- ✅ Mute all or specific participants
- ✅ Chat sidebar
- ✅ Up to 12 participants total

## Troubleshooting

### WebSocket Connection Issues
- Ensure your Cloudflare Worker is deployed and accessible
- Check that the WebSocket URL uses `wss://` (secure WebSocket)
- Verify CORS settings in the worker

### TURN Server Issues
- For production, use a real TURN server
- The default configuration uses STUN only (may not work behind firewalls)
- Update `worker/turn.ts` with your TURN credentials

### GitHub Pages Not Updating
- Check GitHub Actions workflow status
- Ensure Pages is enabled and using GitHub Actions as source
- Verify build artifacts are being uploaded correctly

## Production Considerations

1. **TURN Server**: Use a production TURN server for reliable connections
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Authentication**: Consider adding authentication for production use
4. **Monitoring**: Set up monitoring for worker performance
5. **Error Handling**: Add comprehensive error handling and user feedback

