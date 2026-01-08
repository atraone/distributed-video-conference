# 🚀 Quick Deploy - GitHub Pages + Cloudflare Workers

## ⚡ Fast Track (5 minutes)

### Step 1: Login to Cloudflare (One-time)
```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca
wrangler login
```
This will open a browser - authorize the app.

### Step 2: Deploy Workers
```bash
./auto-deploy.sh
```

This will:
- ✅ Deploy signaling worker to Cloudflare
- ✅ Deploy TURN worker to Cloudflare  
- ✅ Build client with correct URLs
- ✅ Generate deployment URLs file

### Step 3: Configure GitHub Secrets

After deployment, you'll get URLs. Add them to GitHub:

1. Go to: https://github.com/verycosmic/distributed-video-conference/settings/secrets/actions
2. Click "New repository secret"
3. Add these two secrets:

```
Name: VITE_WS_URL
Value: wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws
```

```
Name: VITE_TURN_CONFIG_URL  
Value: https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config
```

### Step 4: Enable GitHub Pages

1. Go to: https://github.com/verycosmic/distributed-video-conference/settings/pages
2. Under "Source", select **"GitHub Actions"**
3. Click "Save"

### Step 5: Push to GitHub

```bash
git add .
git commit -m "Deploy video conference to GitHub Pages"
git push origin main
```

### Step 6: Get Your Conference URL

After GitHub Actions completes (check the Actions tab), your conference will be live at:

**https://verycosmic.github.io/distributed-video-conference/**

---

## 🎯 Your Conference Link

Once deployed, share this link with anyone:

**https://verycosmic.github.io/distributed-video-conference/**

---

## 🔧 Manual Worker Deployment

If auto-deploy fails, deploy manually:

```bash
# Deploy signaling worker
wrangler deploy --config wrangler.toml

# Deploy TURN worker
wrangler deploy --config worker/turn-wrangler.toml
```

Then note the URLs from the output and add them to GitHub Secrets.

---

## ✅ Verification

After deployment, verify:

1. **Workers are live:**
   - Visit: `https://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`
   - Should return WebSocket upgrade response

2. **GitHub Pages is live:**
   - Visit: `https://verycosmic.github.io/distributed-video-conference/`
   - Should show the SSO login page

3. **Test connection:**
   - Open the GitHub Pages URL
   - Authenticate and join
   - Check browser console for WebSocket connection

---

## 🆘 Troubleshooting

**Workers won't deploy?**
- Make sure you're logged in: `wrangler whoami`
- Check Cloudflare account has Workers enabled (free tier works)

**GitHub Pages shows 404?**
- Check Actions tab for build errors
- Verify secrets are set correctly
- Ensure Pages source is "GitHub Actions"

**WebSocket connection fails?**
- Verify `VITE_WS_URL` uses `wss://` (secure)
- Check worker is accessible
- Test in browser console

