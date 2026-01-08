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
// TURN config URL - use environment variable if set, otherwise use correct worker URL
const TURN_CONFIG_URL = import.meta.env.VITE_TURN_CONFIG_URL || 
  (import.meta.env.DEV ? 'http://localhost:8080/turn-config' : 'https://video-conference-turn.dvccursorspinup.workers.dev/turn-config');

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
        try {
          const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender && sender.track) {
            sender.replaceTrack(track).catch(err => {
              console.error(`Error replacing ${track.kind} track:`, err);
            });
          } else {
            pc.addTrack(track, localStreamRef.current!);
          }
        } catch (error) {
          console.error(`Error adding ${track.kind} track:`, error);
        }
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
        // Wait for connection to be ready
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          signaling.sendOffer(remoteUserId, offer);
        } else {
          console.warn(`Cannot create offer, connection state: ${pc.signalingState}`);
        }
      } catch (error) {
        console.error('Error creating offer:', error);
        // Retry after a short delay
        setTimeout(async () => {
          try {
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              await pc.setLocalDescription(offer);
              signaling.sendOffer(remoteUserId, offer);
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }, 500);
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
          // Add existing participants - only create offers if we're the newer joiner
          if (message.participants) {
            const participantIds = message.participants.map((p: any) => p.userId).filter((id: string) => id && id !== userIdRef.current);
            const myIndex = message.participants.findIndex((p: any) => p.userId === userIdRef.current);
            
            // Only create offers if there are existing participants and we're not the first
            if (participantIds.length > 0 && myIndex > 0) {
              // We're joining after others, so we create offers
              for (const p of message.participants) {
                if (p.userId && p.userId !== userIdRef.current) {
                  await addPeer(p.userId, true, p.name || 'Unknown', p.role);
                }
              }
            }
          }
          break;

        case 'user-joined':
          if (message.userId && message.userId !== userIdRef.current) {
            // New user joined - only create offer if we were here first
            // The newer joiner will create offers via room-joined message
            // This prevents race conditions
            const existingPeerCount = Object.keys(peers).length;
            if (existingPeerCount === 0) {
              // We're the first, so we create offer for the new joiner
              await addPeer(message.userId, true, message.name || 'Unknown', message.role);
            }
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
              // Only handle offer if we're in a state to receive it
              if (pc.signalingState === 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));
                const answer = await pc.createAnswer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(answer);
                signaling.sendAnswer(message.fromUserId, answer);
              } else if (pc.signalingState === 'have-local-offer') {
                // We already sent an offer, this is a collision - restart ICE
                console.warn(`Offer collision detected with ${message.fromUserId}, restarting ICE`);
                pc.restartIce();
                // Wait a bit then try again
                setTimeout(async () => {
                  try {
                    if (pc.signalingState === 'stable') {
                      await pc.setRemoteDescription(new RTCSessionDescription(message.data));
                      const answer = await pc.createAnswer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true,
                      });
                      await pc.setLocalDescription(answer);
                      signaling.sendAnswer(message.fromUserId, answer);
                    }
                  } catch (retryError) {
                    console.error('Retry after collision failed:', retryError);
                  }
                }, 1000);
              } else {
                console.warn(`Cannot handle offer, connection state: ${pc.signalingState}`);
              }
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
                // Only set remote description if we're expecting an answer
                if (pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(new RTCSessionDescription(message.data));
                } else if (pc.signalingState === 'stable') {
                  // Already connected, ignore duplicate answer
                  console.warn(`Received answer in stable state from ${message.fromUserId}`);
                } else {
                  console.warn(`Cannot handle answer, connection state: ${pc.signalingState}`);
                }
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
                // Only add ICE candidate if remote description is set
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(message.data));
                } else {
                  // Queue the candidate to add after remote description is set
                  console.log(`Queuing ICE candidate for ${message.fromUserId} (waiting for remote description)`);
                  // Store candidate and add it when remote description is set
                  const candidate = new RTCIceCandidate(message.data);
                  // Try again after a short delay
                  setTimeout(async () => {
                    try {
                      if (pc.remoteDescription) {
                        await pc.addIceCandidate(candidate);
                      }
                    } catch (retryError) {
                      // Ignore if already added or connection closed
                      if (retryError.name !== 'OperationError' && retryError.name !== 'InvalidStateError') {
                        console.error('Error adding queued ICE candidate:', retryError);
                      }
                    }
                  }, 500);
                }
              } catch (error) {
                // Ignore errors for already-added candidates
                if (error.name !== 'OperationError' && error.name !== 'InvalidStateError') {
                  console.error('Error adding ICE candidate:', error);
                }
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
    Object.entries(peerConnectionsRef.current).forEach(([userId, pc]) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
            if (sender && sender.track) {
              sender.replaceTrack(track).catch(err => {
                console.error(`Error replacing ${track.kind} track for ${userId}:`, err);
              });
            } else {
              pc.addTrack(track, stream);
            }
          } catch (error) {
            console.error(`Error adding ${track.kind} track to ${userId}:`, error);
          }
        });
      } else {
        // Remove all tracks if stream is null
        pc.getSenders().forEach(sender => {
          if (sender.track) {
            pc.removeTrack(sender);
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

