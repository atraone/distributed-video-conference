import { useState, useEffect, useRef, useCallback } from 'react';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'room-joined' | 'user-joined' | 'user-left' | 'error' | 'chat' | 'mute-request' | 'mute-user' | 'mute-all';
  roomId?: string;
  userId?: string;
  fromUserId?: string;
  name?: string;
  role?: 'host' | 'cohost' | 'participant';
  participants?: Array<{ userId: string; name: string; role: string }>;
  data?: any;
  text?: string;
  timestamp?: number;
  targetUserId?: string;
  muted?: boolean;
}

export interface Signaling {
  ws: WebSocket | null;
  connected: boolean;
  joinRoom: (name: string) => void;
  leaveRoom: () => void;
  sendOffer: (toUserId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (toUserId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (toUserId: string, candidate: RTCIceCandidateInit) => void;
  sendChat: (text: string) => void;
  sendMuteUser: (targetUserId: string, muted: boolean) => void;
  sendMuteAll: () => void;
  onMessage: (callback: (msg: SignalingMessage) => void) => void;
}

// Cloudflare Worker WebSocket URL
// Production: Uses environment variable from GitHub Pages
// Fallback: Local development server
const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.DEV ? 'ws://localhost:8080/ws' : 'wss://video-conference-signaling.verycosmic.workers.dev/ws');

export function useSignaling(): { signaling: Signaling | null; connected: boolean } {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageCallbacks = useRef<Set<(msg: SignalingMessage) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const websocket = new WebSocket(WS_URL);

      websocket.onopen = () => {
        console.log('✅ WebSocket connected');
        setWs(websocket);
        setConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      websocket.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data);
          messageCallbacks.current.forEach((callback) => callback(message));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setWs(null);
        setConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const joinRoom = useCallback((name: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'join-room', name }));
    }
  }, [ws]);

  const leaveRoom = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave-room' }));
    }
  }, [ws]);

  const sendOffer = useCallback((toUserId: string, offer: RTCSessionDescriptionInit) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'offer',
        data: offer,
        userId: toUserId,
      }));
    }
  }, [ws]);

  const sendAnswer = useCallback((toUserId: string, answer: RTCSessionDescriptionInit) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'answer',
        data: answer,
        userId: toUserId,
      }));
    }
  }, [ws]);

  const sendIceCandidate = useCallback((toUserId: string, candidate: RTCIceCandidateInit) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        data: candidate,
        userId: toUserId,
      }));
    }
  }, [ws]);

  const sendChat = useCallback((text: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat', text }));
    }
  }, [ws]);

  const sendMuteUser = useCallback((targetUserId: string, muted: boolean) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mute-user', targetUserId, muted }));
    }
  }, [ws]);

  const sendMuteAll = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mute-all' }));
    }
  }, [ws]);

  const onMessage = useCallback((callback: (msg: SignalingMessage) => void) => {
    messageCallbacks.current.add(callback);
    return () => {
      messageCallbacks.current.delete(callback);
    };
  }, []);

  const signaling: Signaling = {
    ws,
    connected,
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendChat,
    sendMuteUser,
    sendMuteAll,
    onMessage,
  };

  return { signaling, connected };
}

