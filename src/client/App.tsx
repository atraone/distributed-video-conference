import { useState, useEffect, useRef } from 'react';
import { VideoConference } from './components/VideoConference';
import { PreStage } from './components/PreStage';
import { SSOAuth } from './components/SSOAuth';
import { ChatMessage } from './components/Chat';
import { useWebRTC } from './hooks/useWebRTC';
import { useSignaling } from './hooks/useSignaling';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localRole, setLocalRole] = useState<'host' | 'cohost' | 'participant' | undefined>();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const { signaling, connected } = useSignaling();
  const { peers, addPeer, removePeer, setLocalStream: setWebRTCLocalStream } = useWebRTC(signaling);

  // Handle signaling messages
  useEffect(() => {
    if (!signaling) return;

    const unsubscribe = signaling.onMessage((message) => {
      switch (message.type) {
        case 'room-joined':
          if (message.userId && message.role) {
            setLocalRole(message.role as 'host' | 'cohost' | 'participant');
            if (message.participants) {
              // Add existing participants
              message.participants.forEach((p: any) => {
                if (p.userId !== message.userId) {
                  // Will be handled by user-joined messages
                }
              });
            }
          }
          break;

        case 'user-joined':
          if (message.userId) {
            // Add peer connection
            addPeer(message.userId, true);
          }
          break;

        case 'user-left':
          if (message.userId) {
            removePeer(message.userId);
          }
          break;

        case 'chat':
          if (message.name && message.text && message.timestamp) {
            setChatMessages((prev) => [
              ...prev,
              {
                userId: message.userId || '',
                name: message.name,
                text: message.text,
                timestamp: message.timestamp,
              },
            ]);
          }
          break;

        case 'mute-request':
          if (message.muted !== undefined && localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !message.muted;
            }
          }
          break;
      }
    });

    return unsubscribe;
  }, [signaling, localStream, addPeer, removePeer]);

  const handleAuthenticated = (name: string, email: string) => {
    setLocalName(name);
    setLocalEmail(email);
    setAuthenticated(true);
  };

  const handleJoin = (name: string) => {
    setLocalName(name);
    setJoined(true);
    if (signaling) {
      signaling.joinRoom(name);
    }
  };

  const handleLeaveRoom = () => {
    if (signaling) {
      signaling.leaveRoom();
    }
    setJoined(false);
    setLocalName('');
    setLocalRole(undefined);
    setChatMessages([]);
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    // Remove all peers
    Object.keys(peers).forEach((peerId) => removePeer(peerId));
  };

  const handleSendChat = (text: string) => {
    if (signaling) {
      signaling.sendChat(text);
    }
  };

  const handleMuteUser = (userId: string, muted: boolean) => {
    if (signaling) {
      signaling.sendMuteUser(userId, muted);
    }
  };

  const handleMuteAll = () => {
    if (signaling) {
      signaling.sendMuteAll();
    }
  };

  // Get local stream when joined
  useEffect(() => {
    if (joined) {
      // Get user media
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          setWebRTCLocalStream(stream);
        })
        .catch((err) => {
          console.error('Error accessing media devices:', err);
          alert('Failed to access camera/microphone. Please check permissions.');
        });
    } else {
      // Stop local stream when leaving
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
    }
  }, [joined]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎥 Global Video Conference</h1>
        {joined && (
          <div className="room-info">
            <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        )}
      </header>

      <main className="app-main">
        {!authenticated ? (
          <SSOAuth onAuthenticated={handleAuthenticated} />
        ) : !joined ? (
          <PreStage onJoin={handleJoin} />
        ) : (
          <VideoConference
            localStream={localStream}
            peers={peers}
            localName={localName}
            localRole={localRole}
            onLeave={handleLeaveRoom}
            onSendChat={handleSendChat}
            onMuteUser={handleMuteUser}
            onMuteAll={handleMuteAll}
            chatMessages={chatMessages}
          />
        )}
      </main>
    </div>
  );
}

export default App;

