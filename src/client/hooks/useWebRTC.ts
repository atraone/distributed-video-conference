import { useState, useEffect, useRef, useCallback } from 'react';
import { Signaling, SignalingMessage } from './useSignaling';

interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  name: string;
  role?: 'host' | 'cohost' | 'participant';
  useTurn: boolean;
}

const MAX_P2P_PARTICIPANTS = 4;
const TURN_CONFIG_URL = import.meta.env.VITE_TURN_CONFIG_URL || 
  (import.meta.env.DEV ? 'http://localhost:8080/turn-config' : 'https://video-conference-turn.verycosmic.workers.dev/turn-config');

export function useWebRTC(signaling: Signaling | null) {
  const [peers, setPeers] = useState<Record<string, PeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const userIdRef = useRef<string>('');
  const turnConfigRef = useRef<RTCConfiguration | null>(null);

  // Fetch TURN configuration
  useEffect(() => {
    fetch(TURN_CONFIG_URL)
      .then(res => res.json())
      .then(config => {
        turnConfigRef.current = config;
      })
      .catch(err => {
        console.error('Failed to fetch TURN config:', err);
        turnConfigRef.current = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        };
      });
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string, useTurn: boolean = false): RTCPeerConnection => {
    // Determine if we should use TURN based on participant count
    const currentPeerCount = Object.keys(peers).length;
    const shouldUseTurn = useTurn || currentPeerCount >= MAX_P2P_PARTICIPANTS;

    let configuration: RTCConfiguration;
    
    if (shouldUseTurn && turnConfigRef.current) {
      // Use TURN configuration for fallback
      configuration = {
        ...turnConfigRef.current,
        iceTransportPolicy: 'relay', // Force relay for low quality fallback
      };
    } else {
      // Use P2P configuration
      configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
    }

    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current[remoteUserId] = pc;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signaling) {
        signaling.sendIceCandidate(remoteUserId, event.candidate.toJSON());
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setPeers((prev) => {
        const existing = prev[remoteUserId];
        return {
          ...prev,
          [remoteUserId]: {
            ...existing || { pc, name: 'Unknown', useTurn: shouldUseTurn },
            stream: remoteStream,
          },
        };
      });
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[${remoteUserId}] Connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Attempt to restart ICE
        pc.restartIce();
      }
    };

    return pc;
  }, [signaling]);

  const addPeer = useCallback(async (remoteUserId: string, isInitiator: boolean, name: string = 'Unknown', role?: string) => {
    if (peers[remoteUserId] || !signaling) return;

    // Determine if we should use TURN based on current peer count
    const currentPeerCount = Object.keys(peers).length;
    const useTurn = currentPeerCount >= MAX_P2P_PARTICIPANTS;

    const pc = createPeerConnection(remoteUserId, useTurn);
    setPeers((prev) => ({
      ...prev,
      [remoteUserId]: { 
        pc, 
        stream: null, 
        name,
        role: role as 'host' | 'cohost' | 'participant' | undefined,
        useTurn,
      },
    }));

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.sendOffer(remoteUserId, offer);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  }, [peers, signaling, createPeerConnection]);

  const removePeer = useCallback((remoteUserId: string) => {
    const peer = peers[remoteUserId];
    if (peer) {
      peer.pc.close();
      delete peerConnectionsRef.current[remoteUserId];
      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[remoteUserId];
        return updated;
      });
    }
  }, [peers]);

  // Handle signaling messages
  useEffect(() => {
    if (!signaling) return;

    const unsubscribe = signaling.onMessage(async (message: SignalingMessage) => {
      switch (message.type) {
        case 'room-joined':
          userIdRef.current = message.userId || '';
          // Add existing participants
          if (message.participants) {
            message.participants.forEach(async (p: any) => {
              if (p.userId && p.userId !== userIdRef.current) {
                await addPeer(p.userId, true, p.name || 'Unknown', p.role);
              }
            });
          }
          break;

        case 'user-joined':
          if (message.userId && message.userId !== userIdRef.current) {
            // New user joined, create offer
            await addPeer(message.userId, true, message.name || 'Unknown', message.role);
          }
          break;

        case 'user-left':
          if (message.userId) {
            removePeer(message.userId);
          }
          break;

        case 'offer':
          if (message.fromUserId && message.data) {
            let peer = peers[message.fromUserId];
            if (!peer) {
              const currentPeerCount = Object.keys(peers).length;
              const useTurn = currentPeerCount >= MAX_P2P_PARTICIPANTS;
              const pc = createPeerConnection(message.fromUserId, useTurn);
              setPeers((prev) => ({
                ...prev,
                [message.fromUserId]: { 
                  pc, 
                  stream: null,
                  name: message.name || 'Unknown',
                  role: message.role as 'host' | 'cohost' | 'participant' | undefined,
                  useTurn,
                },
              }));
              peer = { pc, stream: null, name: message.name || 'Unknown', role: message.role as any, useTurn };
            }
            const pc = peer.pc;

            try {
              await pc.setRemoteDescription(new RTCSessionDescription(message.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              signaling.sendAnswer(message.fromUserId, answer);
            } catch (error) {
              console.error('Error handling offer:', error);
            }
          }
          break;

        case 'answer':
          if (message.fromUserId && message.data) {
            const pc = peerConnectionsRef.current[message.fromUserId];
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));
              } catch (error) {
                console.error('Error handling answer:', error);
              }
            }
          }
          break;

        case 'ice-candidate':
          if (message.fromUserId && message.data) {
            const pc = peerConnectionsRef.current[message.fromUserId];
            if (pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(message.data));
              } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
          }
          break;
      }
    });

    return unsubscribe;
  }, [signaling, addPeer, removePeer, createPeerConnection]);

  // Set local stream reference
  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    // Add tracks to existing peer connections
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      }
    });
  }, []);

  return {
    peers,
    addPeer,
    removePeer,
    setLocalStream,
  };
}

