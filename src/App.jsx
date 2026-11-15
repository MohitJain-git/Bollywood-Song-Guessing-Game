import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SoloMode from './components/SoloMode';
import AudioBlitzMode from './components/AudioBlitzMode';
import TeamPartyMode from './components/TeamPartyMode';
import MultiplayerMode from './components/MultiplayerMode';
import SettingsModal from './components/SettingsModal';
import { triggerViewTransition, loadSessionState, saveSessionState } from './utils/gameTech';

export default function App() {
  const [activeMode, setActiveMode] = useState(() => {
    const saved = loadSessionState('bolly_app_nav_v1', { activeMode: 'solo' });
    return saved.activeMode || 'solo';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    saveSessionState('bolly_app_nav_v1', { activeMode });
  }, [activeMode]);

  const handleModeChange = (nextMode) => {
    if (nextMode === activeMode) return;
    triggerViewTransition(() => {
      setActiveMode(nextMode);
    }, '#main-view-heading');
  };

  return (
    <div className="app-layout" data-mode={activeMode}>
      {/* Dynamic Era-Reactive Atmospheric Glows & Cinema Grain */}
      <div className="bg-glow bg-glow-1" aria-hidden="true" />
      <div className="bg-glow bg-glow-2" aria-hidden="true" />
      <div className="bg-glow bg-glow-center" aria-hidden="true" />
      <div className="cinema-grid-overlay" aria-hidden="true" />

      {/* Top Navigation */}
      <Navbar
        activeMode={activeMode}
        setActiveMode={handleModeChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content" id="main-view-heading" tabIndex={-1}>
        {activeMode === 'solo' && (
          <SoloMode onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
        {activeMode === 'blitz' && (
          <AudioBlitzMode />
        )}
        {activeMode === 'teams' && (
          <TeamPartyMode />
        )}
        {activeMode === 'multiplayer' && (
          <MultiplayerMode />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          🎵 <strong>BollyTrivia Studio</strong> • AI-Crafted Lyrical Riddles & Live Frequency Blitz • Powered by Google Gemini
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
