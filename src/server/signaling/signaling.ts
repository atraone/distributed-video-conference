import { WebSocket } from 'ws';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'room-joined' | 'error';
  roomId?: string;
  userId?: string;
  data?: any;
}

interface Room {
  id: string;
  participants: Map<string, WebSocket>;
}

class SignalingRouter {
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map();
  private wsToUserId: Map<WebSocket, string> = new Map();

  generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleConnection(ws: WebSocket): void {
    const userId = this.generateUserId();
    this.wsToUserId.set(ws, userId);
    console.log(`[${userId}] Connected`);
  }

  handleDisconnection(ws: WebSocket): void {
    const userId = this.wsToUserId.get(ws);
    if (!userId) return;

    const roomId = this.userToRoom.get(userId);
    if (roomId) {
      this.leaveRoom(userId, roomId);
    }

    this.wsToUserId.delete(ws);
    console.log(`[${userId}] Disconnected`);
  }

  handleMessage(ws: WebSocket, message: string): void {
    try {
      const msg: SignalingMessage = JSON.parse(message);
      const userId = this.wsToUserId.get(ws);

      if (!userId) {
        ws.send(JSON.stringify({ type: 'error', data: 'User not identified' }));
        return;
      }

      switch (msg.type) {
        case 'join-room':
          this.joinRoom(userId, msg.roomId || 'default', ws);
          break;
        case 'leave-room':
          this.leaveRoom(userId, msg.roomId || 'default');
          break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          this.relayMessage(userId, msg);
          break;
        default:
          console.warn(`[${userId}] Unknown message type: ${msg.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
    }
  }

  private joinRoom(userId: string, roomId: string, ws: WebSocket): void {
    // Leave previous room if any
    const previousRoomId = this.userToRoom.get(userId);
    if (previousRoomId && previousRoomId !== roomId) {
      this.leaveRoom(userId, previousRoomId);
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, participants: new Map() };
      this.rooms.set(roomId, room);
    }

    room.participants.set(userId, ws);
    this.userToRoom.set(userId, roomId);

    // Notify user they joined
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      userId,
      participantCount: room.participants.size,
    }));

    // Notify other participants
    this.broadcastToRoom(roomId, userId, {
      type: 'user-joined',
      roomId,
      userId,
    });

    console.log(`[${userId}] Joined room ${roomId} (${room.participants.size} participants)`);
  }

  private leaveRoom(userId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    this.userToRoom.delete(userId);

    // Notify other participants
    this.broadcastToRoom(roomId, userId, {
      type: 'user-left',
      roomId,
      userId,
    });

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    } else {
      console.log(`[${userId}] Left room ${roomId} (${room.participants.size} remaining)`);
    }
  }

  private relayMessage(fromUserId: string, message: SignalingMessage): void {
    const roomId = this.userToRoom.get(fromUserId);
    if (!roomId) {
      console.warn(`[${fromUserId}] Attempted to send message without being in a room`);
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Relay to all other participants in the room
    const relayedMessage = {
      ...message,
      fromUserId,
    };

    room.participants.forEach((ws, userId) => {
      if (userId !== fromUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(relayedMessage));
      }
    });
  }

  private broadcastToRoom(roomId: string, excludeUserId: string, message: any): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.forEach((ws, userId) => {
      if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

export const signalingRouter = new SignalingRouter();

