// Cloudflare Worker for TURN server fallback
// Provides TURN relay for WebRTC when P2P fails

export interface Env {
  TURN_USERNAME?: string;
  TURN_PASSWORD?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/turn-config') {
      // Return TURN server configuration
      // In production, you'd use a real TURN server (e.g., Twilio, Metered, etc.)
      // For now, we'll return a configuration that uses public STUN servers
      // and indicate that TURN should be used for low quality fallback
      
      const config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Add your TURN server here in production
          // {
          //   urls: 'turn:your-turn-server.com:3478',
          //   username: env.TURN_USERNAME,
          //   credential: env.TURN_PASSWORD,
          // },
        ],
        iceTransportPolicy: 'relay' as RTCIceTransportPolicy, // Force relay for fallback
      };

      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

