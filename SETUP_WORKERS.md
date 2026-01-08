# 🔧 Cloudflare Workers Setup (One-Time)

## Step 1: Create Workers.dev Subdomain

1. Go to: https://dash.cloudflare.com/
2. Click **"Workers & Pages"** in the sidebar
3. If you see a prompt to create a subdomain, click it
4. Choose your subdomain (e.g., `verycosmic.workers.dev`)
5. Save

This is a **one-time setup** - after this, deployments will work automatically.

## Step 2: Deploy Workers

After creating the subdomain, run:

```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca

# Deploy signaling worker
wrangler deploy --config wrangler.toml

# Deploy TURN worker (from worker directory)
cd worker
wrangler deploy --config turn-wrangler.toml
cd ..
```

## Step 3: Note Your Worker URLs

After deployment, you'll see output like:

```
✨ Deployment complete!
🌍 https://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev
```

Save these URLs:
- **Signaling**: `wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`
- **TURN**: `https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config`

## Step 4: Add to GitHub Secrets

1. Go to: https://github.com/verycosmic/distributed-video-conference/settings/secrets/actions
2. Add:
   - `VITE_WS_URL` = `wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`
   - `VITE_TURN_CONFIG_URL` = `https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config`

---

**Once workers are deployed, proceed to GitHub Pages deployment!**

