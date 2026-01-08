import { useState, useEffect, useRef } from 'react';
import './Chat.css';

export interface ChatMessage {
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Chat({ messages, onSendMessage, isOpen, onToggle }: ChatProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button className="chat-toggle" onClick={onToggle}>
        💬 {isOpen ? 'Hide' : 'Show'} Chat
      </button>
      {isOpen && (
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Chat</h3>
            <button className="chat-close" onClick={onToggle}>×</button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">No messages yet. Start the conversation!</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <div className="chat-message-header">
                    <span className="chat-message-name">{msg.name}</span>
                    <span className="chat-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="chat-message-text">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <textarea
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={2}
            />
            <button className="chat-send" onClick={handleSend} disabled={!inputText.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

