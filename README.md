# Global Video Conference System

A modern, peer-to-peer video conferencing application built with WebRTC, React, and Cloudflare Workers. Deployed on GitHub Pages with stateful signaling via Cloudflare Workers.

## Features

- 🎥 **Peer-to-Peer Video/Audio**: Direct WebRTC connections for up to 4 participants
- 🔄 **TURN Fallback**: Automatic fallback to TURN relay for participants 5-12 (low quality)
- 🌐 **Single Global Meeting**: One global meeting room accessible via link
- 🎬 **Pre-Stage**: Camera/mic preview and name entry before joining
- 👑 **Host Controls**: First two joiners are host/cohost with mute controls
- 📺 **Maximize/Minimize**: Click any video stream to maximize or minimize
- 💬 **Chat Sidebar**: Real-time chat with all participants
- 🔒 **Secure**: End-to-end encryption via WebRTC
- 📱 **Responsive Design**: Works on desktop and mobile browsers
- ☁️ **Cloudflare Workers**: Stateful signaling server using Durable Objects
- 🚀 **GitHub Pages**: Static hosting for the client application

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Client 1  │◄────►│ Cloudflare      │◄────►│   Client 2  │
│ GitHub Pages│      │ Worker (DO)     │      │ GitHub Pages│
└─────────────┘      │ Signaling       │      └─────────────┘
       │             └──────────────────┘             │
       │                    │                        │
       └────────────────────┴────────────────────────┘
                    WebRTC P2P (up to 4)
                    TURN Fallback (5-12)
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite (deployed on GitHub Pages)
- **Signaling**: Cloudflare Workers + Durable Objects
- **TURN**: Cloudflare Worker (with optional external TURN server)
- **WebRTC**: Native browser APIs
- **Deployment**: GitHub Actions + Cloudflare Workers

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

```bash
npm install
# or
bun install
```

### Development

Start both server and client in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1: Start signaling server
npm run dev:server

# Terminal 2: Start client
npm run dev:client
```

- **Client**: http://localhost:3000
- **Signaling Server**: ws://localhost:8080

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
distributed-video-conference/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Client utilities
│   │   └── App.tsx      # Main app component
│   └── server/          # Signaling server
│       ├── signaling/   # WebSocket signaling logic
│       ├── types/       # TypeScript types
│       └── index.ts     # Server entry point
├── public/              # Static assets
├── dist/               # Build output
└── package.json
```

## Quick Start

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev:client
   ```

3. Open http://localhost:3000

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick steps:
1. Deploy Cloudflare Workers (signaling + TURN)
2. Configure GitHub Secrets
3. Enable GitHub Pages
4. Push to main branch (auto-deploys)

## Usage

1. Open the application link (GitHub Pages URL)
2. Allow camera/microphone permissions
3. Preview your camera/mic in the pre-stage
4. Enter your name and click "Join Meeting"
5. Share the link with others (up to 12 participants)
6. First two joiners become host/cohost with mute controls
7. Click any video to maximize/minimize
8. Use the chat sidebar for text messages

## WebRTC Flow

1. **Offer Creation**: Client A creates a WebRTC offer
2. **Signaling**: Offer sent to Client B via signaling server
3. **Answer Creation**: Client B creates an answer
4. **ICE Candidates**: Both clients exchange ICE candidates
5. **Connection**: Direct P2P connection established

## Configuration

Create a `.env` file for environment variables:

```env
PORT=8080
NODE_ENV=development
```

## License

MIT

