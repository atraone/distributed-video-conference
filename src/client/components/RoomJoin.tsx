import { useState } from 'react';
import './RoomJoin.css';

interface RoomJoinProps {
  onJoin: (roomId: string) => void;
}

export function RoomJoin({ onJoin }: RoomJoinProps) {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const generateRoomId = () => {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsCreating(true);
    onJoin(newRoomId);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoin(roomId.trim());
    }
  };

  return (
    <div className="room-join">
      <div className="room-join-card">
        <h2>Join Video Conference</h2>
        <p className="description">
          Create a new room or join an existing one by entering the room ID.
        </p>

        <div className="room-actions">
          <button className="btn btn-primary" onClick={handleCreateRoom}>
            🎬 Create New Room
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="join-form">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="room-input"
            />
            <button
              className="btn btn-secondary"
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
            >
              Join Room
            </button>
          </div>
        </div>

        {isCreating && roomId && (
          <div className="room-created">
            <p>✅ Room created!</p>
            <p className="room-id">Room ID: <code>{roomId}</code></p>
            <p className="share-hint">Share this ID with others to invite them.</p>
          </div>
        )}
      </div>
    </div>
  );
}

