import { useState } from 'react';
import './SSOAuth.css';

interface SSOAuthProps {
  onAuthenticated: (name: string, email: string) => void;
}

export function SSOAuth({ onAuthenticated }: SSOAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSSO = async (provider: 'google' | 'github' | 'microsoft') => {
    setIsAuthenticating(true);
    
    // For demo purposes, we'll simulate SSO with a prompt
    // In production, this would redirect to the actual SSO provider
    const name = prompt(`Enter your name for ${provider} authentication:`);
    const email = prompt(`Enter your email for ${provider} authentication:`) || `${name?.toLowerCase().replace(/\s+/g, '.')}@${provider}.com`;
    
    if (name && email) {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 500));
      onAuthenticated(name, email);
    }
    
    setIsAuthenticating(false);
  };

  const handleGuestAccess = () => {
    const name = prompt('Enter your name for guest access:') || 'Guest User';
    onAuthenticated(name, `guest-${Date.now()}@conference.local`);
  };

  return (
    <div className="sso-auth">
      <div className="sso-container">
        <h2>🎥 Global Video Conference</h2>
        <p className="sso-subtitle">Sign in to join the meeting</p>

        <div className="sso-providers">
          <button
            className="sso-btn google"
            onClick={() => handleSSO('google')}
            disabled={isAuthenticating}
          >
            <span className="sso-icon">🔵</span>
            Continue with Google
          </button>

          <button
            className="sso-btn github"
            onClick={() => handleSSO('github')}
            disabled={isAuthenticating}
          >
            <span className="sso-icon">⚫</span>
            Continue with GitHub
          </button>

          <button
            className="sso-btn microsoft"
            onClick={() => handleSSO('microsoft')}
            disabled={isAuthenticating}
          >
            <span className="sso-icon">🔷</span>
            Continue with Microsoft
          </button>
        </div>

        <div className="sso-divider">
          <span>or</span>
        </div>

        <button
          className="sso-btn guest"
          onClick={handleGuestAccess}
          disabled={isAuthenticating}
        >
          <span className="sso-icon">👤</span>
          Continue as Guest
        </button>

        {isAuthenticating && (
          <div className="sso-loading">
            <div className="spinner"></div>
            <p>Authenticating...</p>
          </div>
        )}
      </div>
    </div>
  );
}

