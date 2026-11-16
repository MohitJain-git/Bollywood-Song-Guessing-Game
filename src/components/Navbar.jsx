import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Settings, Users, User, Zap } from 'lucide-react';
import { sounds } from './SoundEffects';

export default function Navbar({ activeMode, setActiveMode, onOpenSettings }) {
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    fetch('/api/settings/status')
      .then(r => r.json())
      .then(d => setHasApiKey(d.hasKey))
      .catch(() => {});
  }, []);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playTick();
  };

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <span className="brand-logo">🎬</span>
        <div>
          <h1 className="brand-title">BollyTrivia</h1>
          <span className="brand-subtitle">The Ultimate Song Guessing Game</span>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="mode-nav-tabs">
        <button
          onClick={() => setActiveMode('solo')}
          className={`nav-tab-btn ${activeMode === 'solo' ? 'active' : ''}`}
        >
          <User size={16} />
          <span>Solo Guess</span>
        </button>

        <button
          onClick={() => setActiveMode('blitz')}
          className={`nav-tab-btn ${activeMode === 'blitz' ? 'active' : ''}`}
        >
          <Zap size={16} />
          <span>5s Blitz</span>
        </button>

        <button
          onClick={() => setActiveMode('teams')}
          className={`nav-tab-btn ${activeMode === 'teams' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Team Battle</span>
        </button>
      </nav>

      {/* Right Controls */}
      <div className="navbar-controls">
        <button
          onClick={handleToggleSound}
          className="icon-ctrl-btn"
          title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
        >
          {isMuted ? <VolumeX size={18} className="text-zinc-500" /> : <Volume2 size={18} className="text-amber-400" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="settings-trigger-btn"
          title="Game Settings & Gemini AI"
        >
          <Settings size={18} />
          <span className="settings-btn-label">AI & DB</span>
          {hasApiKey && <span className="api-active-dot" title="Gemini AI Connected" />}
        </button>
      </div>
    </header>
  );
}
