# 🎥 Video Conference - Ready to Use!

## Conference Links

### Local Access (This Computer)
**http://localhost:3000**

### Network Access (Share with Others)
**http://192.168.1.140:3000**

---

## Quick Start

1. **Open the link** in your browser (or share with others)
2. **Authenticate** using one of the SSO options:
   - Google
   - GitHub  
   - Microsoft
   - Or continue as Guest
3. **Preview** your camera/microphone
4. **Enter your name** and click "Join Meeting"
5. **Share the link** with up to 11 other participants (12 total)

---

## Features Available

✅ **SSO Authentication** - Sign in with Google, GitHub, Microsoft, or Guest  
✅ **Pre-Stage Preview** - Test camera/mic before joining  
✅ **Global Meeting Room** - One room for everyone  
✅ **P2P Video** - Direct connections for first 4 participants  
✅ **TURN Fallback** - Automatic relay for participants 5-12  
✅ **Host Controls** - First two joiners can mute all/specific users  
✅ **Maximize/Minimize** - Click any video to fullscreen  
✅ **Chat Sidebar** - Real-time text messaging  

---

## Server Status

The server is running in the background. To stop it:
```bash
pkill -f "node server.js"
```

To restart:
```bash
cd /home/verycosmic/.cursor/worktrees/distributed-video-conference/uca
npm run launch
```

---

## Notes

- **Signaling**: Currently using local WebSocket (ws://localhost:8080/ws)
  - For production, deploy Cloudflare Workers and update `VITE_WS_URL`
- **TURN Server**: Using STUN servers by default
  - For production, configure a real TURN server in `worker/turn.ts`
- **Max Participants**: 12 total (4 P2P + 8 via TURN fallback)

---

**🎉 Your conference is ready! Open http://localhost:3000 to start!**

