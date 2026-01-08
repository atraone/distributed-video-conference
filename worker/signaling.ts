// Cloudflare Worker for WebRTC Signaling
// Uses Durable Objects for stateful WebSocket connections

export interface Env {
  SIGNALING_DO: DurableObjectNamespace;
}

export class SignalingDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<string, WebSocket> = new Map();
  private roomParticipants: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId
  private userNames: Map<string, string> = new Map(); // userId -> name
  private joinOrder: string[] = []; // Track join order for host/cohost

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  handleSession(ws: WebSocket) {
    ws.accept();
    const userId = this.generateUserId();
    this.sessions.set(userId, ws);

    ws.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string);
        await this.handleMessage(userId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        this.send(userId, { type: 'error', data: 'Invalid message format' });
      }
    });

    ws.addEventListener('close', () => {
      this.handleDisconnection(userId);
    });
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleMessage(userId: string, message: any) {
    switch (message.type) {
      case 'join-room':
        await this.joinRoom(userId, message.name || 'Anonymous');
        break;
      case 'leave-room':
        this.leaveRoom(userId);
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.relayMessage(userId, message);
        break;
      case 'chat':
        this.broadcastChat(userId, message.text);
        break;
      case 'mute-user':
        this.broadcastMute(userId, message.targetUserId, message.muted);
        break;
      case 'mute-all':
        this.broadcastMuteAll(userId);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async joinRoom(userId: string, name: string) {
    const roomId = 'global'; // Single global room
    const previousRoom = this.userToRoom.get(userId);
    
    if (previousRoom && previousRoom !== roomId) {
      this.leaveRoom(userId);
    }

    // Track join order
    if (!this.joinOrder.includes(userId)) {
      this.joinOrder.push(userId);
    }

    let participants = this.roomParticipants.get(roomId);
    if (!participants) {
      participants = new Set();
      this.roomParticipants.set(roomId, participants);
    }

    participants.add(userId);
    this.userToRoom.set(userId, roomId);
    this.userNames.set(userId, name);

    // Determine role
    const role = this.joinOrder.indexOf(userId) === 0 ? 'host' : 
                 this.joinOrder.indexOf(userId) === 1 ? 'cohost' : 'participant';

    // Send room-joined confirmation
    this.send(userId, {
      type: 'room-joined',
      roomId,
      userId,
      name,
      role,
      participants: Array.from(participants).map(id => ({
        userId: id,
        name: this.userNames.get(id) || 'Anonymous',
        role: this.joinOrder.indexOf(id) === 0 ? 'host' : 
              this.joinOrder.indexOf(id) === 1 ? 'cohost' : 'participant',
      })),
    });

    // Notify other participants
    this.broadcastToRoom(roomId, userId, {
      type: 'user-joined',
      userId,
      name,
      role,
    });
  }

  private leaveRoom(userId: string) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;

    const participants = this.roomParticipants.get(roomId);
    if (participants) {
      participants.delete(userId);
    }

    this.userToRoom.delete(userId);
    this.userNames.delete(userId);
    const index = this.joinOrder.indexOf(userId);
    if (index > -1) {
      this.joinOrder.splice(index, 1);
    }

    // Notify other participants
    this.broadcastToRoom(roomId, userId, {
      type: 'user-left',
      userId,
    });

    // Clean up empty room
    if (participants && participants.size === 0) {
      this.roomParticipants.delete(roomId);
    }
  }

  private relayMessage(fromUserId: string, message: any) {
    const roomId = this.userToRoom.get(fromUserId);
    if (!roomId) return;

    const participants = this.roomParticipants.get(roomId);
    if (!participants) return;

    const relayedMessage = {
      ...message,
      fromUserId,
    };

    // Relay to target user if specified, otherwise broadcast
    if (message.userId) {
      this.send(message.userId, relayedMessage);
    } else {
      this.broadcastToRoom(roomId, fromUserId, relayedMessage);
    }
  }

  private broadcastToRoom(roomId: string, excludeUserId: string, message: any) {
    const participants = this.roomParticipants.get(roomId);
    if (!participants) return;

    participants.forEach((userId) => {
      if (userId !== excludeUserId) {
        this.send(userId, message);
      }
    });
  }

  private broadcastChat(userId: string, text: string) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;

    const name = this.userNames.get(userId) || 'Anonymous';
    this.broadcastToRoom(roomId, '', {
      type: 'chat',
      userId,
      name,
      text,
      timestamp: Date.now(),
    });
  }

  private broadcastMute(userId: string, targetUserId: string, muted: boolean) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;

    // Check if user is host or cohost
    const role = this.joinOrder.indexOf(userId) === 0 ? 'host' : 
                 this.joinOrder.indexOf(userId) === 1 ? 'cohost' : 'participant';
    
    if (role !== 'host' && role !== 'cohost') {
      this.send(userId, { type: 'error', data: 'Only host/cohost can mute users' });
      return;
    }

    this.send(targetUserId, {
      type: 'mute-request',
      muted,
    });
  }

  private broadcastMuteAll(userId: string) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;

    const role = this.joinOrder.indexOf(userId) === 0 ? 'host' : 
                 this.joinOrder.indexOf(userId) === 1 ? 'cohost' : 'participant';
    
    if (role !== 'host' && role !== 'cohost') {
      this.send(userId, { type: 'error', data: 'Only host/cohost can mute all' });
      return;
    }

    const participants = this.roomParticipants.get(roomId);
    if (!participants) return;

    participants.forEach((targetUserId) => {
      if (targetUserId !== userId) {
        this.send(targetUserId, {
          type: 'mute-request',
          muted: true,
        });
      }
    });
  }

  private handleDisconnection(userId: string) {
    this.leaveRoom(userId);
    this.sessions.delete(userId);
  }

  private send(userId: string, message: any) {
    const ws = this.sessions.get(userId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending to ${userId}:`, error);
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.SIGNALING_DO.idFromName('signaling');
    const obj = env.SIGNALING_DO.get(id);
    return obj.fetch(request);
  },
};

