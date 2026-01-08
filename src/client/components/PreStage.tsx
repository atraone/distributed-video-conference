import { useState, useEffect, useRef } from 'react';
import './PreStage.css';

interface PreStageProps {
  onJoin: (name: string) => void;
}

export function PreStage({ onJoin }: PreStageProps) {
  const [name, setName] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Request media access on mount
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        alert('Failed to access camera/microphone. Please check permissions.');
      });

    return () => {
      // Cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const handleJoin = () => {
    if (name.trim()) {
      onJoin(name.trim());
    } else {
      alert('Please enter your name');
    }
  };

  return (
    <div className="pre-stage">
      <div className="pre-stage-container">
        <h2>Join Global Meeting</h2>
        <p className="description">Preview your camera and microphone, then enter your name to join</p>

        <div className="preview-section">
          <div className="video-preview">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="preview-video"
            />
            {!videoEnabled && (
              <div className="video-placeholder">
                <span>📷</span>
                <p>Camera Off</p>
              </div>
            )}
          </div>

          <div className="preview-controls">
            <button
              className={`control-btn ${videoEnabled ? 'active' : ''}`}
              onClick={toggleVideo}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoEnabled ? '📹' : '📷'}
            </button>
            <button
              className={`control-btn ${audioEnabled ? 'active' : ''}`}
              onClick={toggleAudio}
              title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </button>
          </div>
        </div>

        <div className="name-input-section">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            className="name-input"
            maxLength={50}
          />
          <button
            className="btn-join"
            onClick={handleJoin}
            disabled={!name.trim()}
          >
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

