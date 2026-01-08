import { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Chat, ChatMessage } from './Chat';
import './VideoConference.css';

interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  name: string;
  role?: 'host' | 'cohost' | 'participant';
}

interface VideoConferenceProps {
  localStream: MediaStream | null;
  peers: Record<string, PeerConnection>;
  localName: string;
  localRole?: 'host' | 'cohost' | 'participant';
  onLeave: () => void;
  onSendChat: (text: string) => void;
  onMuteUser: (userId: string, muted: boolean) => void;
  onMuteAll: () => void;
  chatMessages: ChatMessage[];
}

export function VideoConference({ 
  localStream, 
  peers, 
  localName,
  localRole,
  onLeave, 
  onSendChat,
  onMuteUser,
  onMuteAll,
  chatMessages,
}: VideoConferenceProps) {
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoDisabled, setLocalVideoDisabled] = useState(false);

  const peerCount = Object.keys(peers).length;
  const isHost = localRole === 'host' || localRole === 'cohost';

  const toggleMaximize = (id: string | null) => {
    setMaximizedId(maximizedId === id ? null : id);
  };

  const toggleLocalMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = localMuted;
        setLocalMuted(!localMuted);
      }
    }
  };

  const toggleLocalVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = localVideoDisabled;
        setLocalVideoDisabled(!localVideoDisabled);
      }
    }
  };

  // Handle mute requests from host/cohost
  useEffect(() => {
    // This would be handled via signaling messages
  }, []);

  const allParticipants = [
    { id: 'local', name: localName, role: localRole, stream: localStream, isLocal: true },
    ...Object.entries(peers).map(([id, peer]) => ({
      id,
      name: peer.name,
      role: peer.role,
      stream: peer.stream,
      isLocal: false,
    })),
  ];

  const maximizedParticipant = maximizedId 
    ? allParticipants.find(p => p.id === maximizedId)
    : null;

  const gridParticipants = maximizedId 
    ? allParticipants.filter(p => p.id !== maximizedId)
    : allParticipants;

  return (
    <div className="video-conference">
      <div className="conference-controls">
        <div className="controls-left">
          <button className="btn-leave" onClick={onLeave}>
            🚪 Leave
          </button>
          <div className="participant-count">
            {peerCount + 1} participant{peerCount !== 0 ? 's' : ''}
          </div>
        </div>
        <div className="controls-center">
          <button 
            className={`control-btn ${localMuted ? 'muted' : ''}`}
            onClick={toggleLocalMute}
            title={localMuted ? 'Unmute' : 'Mute'}
          >
            {localMuted ? '🔇' : '🎤'}
          </button>
          <button 
            className={`control-btn ${localVideoDisabled ? 'disabled' : ''}`}
            onClick={toggleLocalVideo}
            title={localVideoDisabled ? 'Enable video' : 'Disable video'}
          >
            {localVideoDisabled ? '📷' : '📹'}
          </button>
        </div>
        {isHost && (
          <div className="controls-right">
            <div className="host-badge">{localRole === 'host' ? '👑 Host' : '⭐ Co-host'}</div>
            <button 
              className="btn-mute-all"
              onClick={onMuteAll}
              title="Mute all participants"
            >
              🔇 Mute All
            </button>
          </div>
        )}
      </div>

      <div className="conference-main">
        <div className="video-container">
          {maximizedParticipant && (
            <div className="video-maximized" onClick={() => toggleMaximize(maximizedParticipant.id)}>
              <VideoPlayer 
                stream={maximizedParticipant.stream} 
                muted={maximizedParticipant.isLocal}
              />
              <div className="video-label">
                {maximizedParticipant.name}
                {maximizedParticipant.role && (
                  <span className="role-badge">
                    {maximizedParticipant.role === 'host' ? '👑' : 
                     maximizedParticipant.role === 'cohost' ? '⭐' : ''}
                  </span>
                )}
              </div>
              <button className="maximize-btn" onClick={(e) => {
                e.stopPropagation();
                toggleMaximize(null);
              }}>
                ✕
              </button>
            </div>
          )}

          <div className={`video-grid ${maximizedId ? 'has-maximized' : ''}`}>
            {gridParticipants.map((participant) => (
              <div 
                key={participant.id} 
                className={`video-tile ${participant.isLocal ? 'local' : 'remote'} ${participant.id === maximizedId ? 'maximized' : ''}`}
                onClick={() => toggleMaximize(participant.id)}
              >
                <VideoPlayer 
                  stream={participant.stream} 
                  muted={participant.isLocal}
                />
                <div className="video-label">
                  {participant.name}
                  {participant.role && (
                    <span className="role-badge">
                      {participant.role === 'host' ? '👑' : 
                       participant.role === 'cohost' ? '⭐' : ''}
                    </span>
                  )}
                </div>
                {isHost && !participant.isLocal && (
                  <button 
                    className="mute-participant-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle mute for this participant
                      onMuteUser(participant.id, true);
                    }}
                    title="Mute this participant"
                  >
                    🔇
                  </button>
                )}
              </div>
            ))}
          </div>

          {peerCount === 0 && (
            <div className="waiting-message">
              <p>⏳ Waiting for other participants to join...</p>
              <p className="hint">Share the link with others to invite them.</p>
            </div>
          )}
        </div>
      </div>

      <Chat 
        messages={chatMessages}
        onSendMessage={onSendChat}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />
    </div>
  );
}

