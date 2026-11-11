import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SoloMode from './components/SoloMode';
import AudioBlitzMode from './components/AudioBlitzMode';
import TeamPartyMode from './components/TeamPartyMode';
import MultiplayerMode from './components/MultiplayerMode';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [activeMode, setActiveMode] = useState('solo'); // 'solo', 'teams', 'multiplayer'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Dynamic Background Glows */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Top Navigation */}
      <Navbar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
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
          🎵 <strong>BollyTrivia</strong> • AI-Powered Bollywood Music Guessing Game • Powered by Google Gemini
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
