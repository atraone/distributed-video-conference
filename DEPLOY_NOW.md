# 🚀 Deploy to GitHub Pages & Cloudflare Workers

## Step 1: Deploy Cloudflare Workers

Run this command to deploy the signaling and TURN workers:

```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca
./deploy-workers.sh
```

Or manually:
```bash
# Install wrangler if needed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy signaling worker
wrangler deploy --config wrangler.toml

# Deploy TURN worker  
wrangler deploy --config worker/turn-wrangler.toml
```

**After deployment, note your worker URLs:**
- Signaling: `wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`
- TURN: `https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config`

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Add these secrets:

```
VITE_WS_URL=wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws
VITE_TURN_CONFIG_URL=https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config
```

## Step 3: Enable GitHub Pages

1. Go to repository **Settings → Pages**
2. Under **Source**, select **"GitHub Actions"**
3. Save

## Step 4: Push to GitHub

```bash
git add .
git commit -m "Deploy video conference to GitHub Pages"
git push origin main
```

## Step 5: Get Your Conference URL

After GitHub Actions completes (check the Actions tab), your conference will be available at:

**https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/**

Or if using a custom domain:
**https://YOUR_CUSTOM_DOMAIN/**

---

## Quick Deploy Script

Run this to do everything:

```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca

# 1. Deploy workers
./deploy-workers.sh

# 2. Build client
npm run build:client

# 3. Commit and push (if git is set up)
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

---

## Troubleshooting

### Workers not deploying?
- Make sure you're logged in: `wrangler whoami`
- Check your Cloudflare account has Workers enabled

### GitHub Pages not updating?
- Check Actions tab for build errors
- Verify secrets are set correctly
- Ensure Pages source is set to "GitHub Actions"

### WebSocket connection fails?
- Verify `VITE_WS_URL` secret uses `wss://` (secure WebSocket)
- Check worker is deployed and accessible
- Test worker URL in browser: `https://your-worker.workers.dev/ws`

