# 🚀 Final Deployment Steps

## ✅ Current Status

- ✅ Code is ready
- ✅ GitHub Actions workflow configured
- ✅ Build system ready
- ⏳ Cloudflare Workers need subdomain setup (one-time)
- ⏳ GitHub Secrets need to be added
- ⏳ GitHub Pages needs to be enabled

---

## 📋 Step-by-Step Deployment

### 1. Setup Cloudflare Workers Subdomain (One-Time)

**Go to:** https://dash.cloudflare.com/ → Workers & Pages

Click to create your `workers.dev` subdomain (e.g., `verycosmic.workers.dev`)

### 2. Deploy Cloudflare Workers

```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca

# Deploy signaling
wrangler deploy --config wrangler.toml

# Deploy TURN (from worker directory)  
cd worker && wrangler deploy --config turn-wrangler.toml && cd ..
```

**Save the URLs from the output:**
- Signaling: `wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`
- TURN: `https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config`

### 3. Configure GitHub Secrets

**Go to:** https://github.com/verycosmic/distributed-video-conference/settings/secrets/actions

Click **"New repository secret"** and add:

**Secret 1:**
- Name: `VITE_WS_URL`
- Value: `wss://video-conference-signaling.YOUR_SUBDOMAIN.workers.dev/ws`

**Secret 2:**
- Name: `VITE_TURN_CONFIG_URL`
- Value: `https://video-conference-turn.YOUR_SUBDOMAIN.workers.dev/turn-config`

### 4. Enable GitHub Pages

**Go to:** https://github.com/verycosmic/distributed-video-conference/settings/pages

- Under **"Source"**, select **"GitHub Actions"**
- Click **"Save"**

### 5. Push to GitHub

```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca

git add .
git commit -m "Deploy video conference to GitHub Pages"
git push origin main
```

### 6. Wait for GitHub Actions

1. Go to: https://github.com/verycosmic/distributed-video-conference/actions
2. Wait for the workflow to complete (usually 2-3 minutes)
3. Check for any errors

### 7. Your Conference URL

After deployment completes, your conference will be live at:

# 🌐 https://verycosmic.github.io/distributed-video-conference/

---

## 🎯 Quick Commands

```bash
# Full deployment (after Cloudflare subdomain is set up)
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca
wrangler deploy --config wrangler.toml
cd worker && wrangler deploy --config turn-wrangler.toml && cd ..
git add . && git commit -m "Deploy" && git push origin main
```

---

## ✅ Verification Checklist

- [ ] Cloudflare workers.dev subdomain created
- [ ] Signaling worker deployed
- [ ] TURN worker deployed
- [ ] GitHub Secrets added (VITE_WS_URL, VITE_TURN_CONFIG_URL)
- [ ] GitHub Pages enabled (Source: GitHub Actions)
- [ ] Code pushed to GitHub
- [ ] GitHub Actions workflow completed
- [ ] Conference URL accessible

---

## 🎉 Final Conference Link

**https://verycosmic.github.io/distributed-video-conference/**

Share this link with anyone to join the conference!

---

## 🆘 Troubleshooting

**Workers won't deploy?**
- Make sure workers.dev subdomain is created
- Check: `wrangler whoami` shows your account

**GitHub Pages shows 404?**
- Check Actions tab for build errors
- Verify secrets are set correctly
- Ensure Pages source is "GitHub Actions"

**WebSocket fails?**
- Verify `VITE_WS_URL` uses `wss://` (secure)
- Test worker URL manually
- Check browser console for errors

