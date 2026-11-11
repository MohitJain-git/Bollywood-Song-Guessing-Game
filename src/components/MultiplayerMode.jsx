import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Users, Play, Copy, Check, Sparkles, Volume2, ArrowRight, Shield, Zap } from 'lucide-react';
import ClueCard from './ClueCard';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import { sounds } from './SoundEffects';

const AVATARS = [
  { emoji: '🦁', name: 'Raj' },
  { emoji: '👑', name: 'Simran' },
  { emoji: '💃', name: 'Geet' },
  { emoji: '🕶️', name: 'Kabir' },
  { emoji: '🕺', name: 'Bunny' },
  { emoji: '🤠', name: 'Circuit' },
  { emoji: '✨', name: 'Pooh' },
  { emoji: '🎬', name: 'Gabbar' }
];

export default function MultiplayerMode() {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [roomState, setRoomState] = useState(null);

  // Form inputs
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
  const [selectedTeam, setSelectedTeam] = useState('team_red');
  const [gameModeSelection, setGameModeSelection] = useState('teams');
  const [joinError, setJoinError] = useState('');

  // Floating reactions
  const [floatingReactions, setFloatingReactions] = useState([]);

  // WebSocket ref
  const wsRef = useRef(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Connect WebSocket
  const setupWebSocket = (code, pId) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected to party room server');
      ws.send(JSON.stringify({
        type: 'ATTACH',
        roomCode: code,
        playerId: pId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
    };

    wsRef.current = ws;
  };

  const handleServerMessage = (msg) => {
    switch (msg.type) {
      case 'SYNC_STATE':
      case 'ROUND_STARTED':
      case 'CLUE_ADVANCED':
      case 'ANSWER_REVEALED':
      case 'TEAM_UPDATED':
      case 'PLAYER_JOINED':
      case 'PLAYER_LEFT':
        if (msg.room) {
          setRoomState(msg.room);
          const currentP = msg.room.players?.find(p => p.id === playerId);
          if (currentP) setIsHost(Boolean(currentP.isHost));
        }
        break;

      case 'BUZZER_HIT':
        sounds.playBuzz();
        if (msg.room) setRoomState(msg.room);
        break;

      case 'ROUND_CORRECT':
        sounds.playCorrect();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        if (msg.room) setRoomState(msg.room);
        break;

      case 'ROUND_WRONG':
        sounds.playWrong();
        if (msg.room) setRoomState(msg.room);
        break;

      case 'REACTION':
        triggerFloatingReaction(msg.emoji, msg.playerName);
        break;

      default:
        break;
    }
  };

  const triggerFloatingReaction = (emoji, senderName) => {
    const id = Date.now() + Math.random();
    const xPos = Math.random() * 80 + 10;
    setFloatingReactions(prev => [...prev, { id, emoji, senderName, xPos }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2500);
  };

  const sendWsAction = (type, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        roomCode,
        playerId,
        ...payload
      }));
    }
  };

  // Create Room
  const handleCreateRoom = async () => {
    setJoinError('');
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerNameInput.trim() || 'Bollywood Host',
          avatar: selectedAvatar,
          gameMode: gameModeSelection
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRoomCode(data.roomCode);
      setPlayerId(data.hostId);
      setIsHost(true);
      setRoomState(data.room);
      setInRoom(true);
      setupWebSocket(data.roomCode, data.hostId);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    setJoinError('');
    const code = joinCodeInput.toUpperCase().trim();
    if (!code) {
      setJoinError('Please enter a room code.');
      return;
    }

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code,
          playerName: playerNameInput.trim() || 'Bollywood Player',
          avatar: selectedAvatar,
          team: selectedTeam
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRoomCode(code);
      setPlayerId(data.playerId);
      setRoomState(data.room);
      setInRoom(true);
      setupWebSocket(code, data.playerId);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Buzzer
  const handleBuzzerClick = () => {
    sendWsAction('BUZZ');
  };

  const handleHostDecision = (isCorrect) => {
    sendWsAction('DECIDE_ANSWER', { isCorrect });
  };

  const handleReactionClick = (emoji) => {
    sendWsAction('REACTION', { emoji });
  };

  const isBuzzerActive = roomState?.status === 'question' && !roomState?.buzzer?.playerId;
  const iBuzzedIn = roomState?.buzzer?.playerId === playerId;

  return (
    <div className="multiplayer-container">
      {/* Floating Reactions Overlay */}
      <div className="reactions-overlay">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="floating-reaction animate-float-up"
            style={{ left: `${r.xPos}%` }}
          >
            <span className="reaction-emoji">{r.emoji}</span>
            <span className="reaction-sender">{r.senderName}</span>
          </div>
        ))}
      </div>

      {!inRoom ? (
        /* LOBBY / SETUP SCREEN */
        <div className="multiplayer-auth-card animate-fade-in">
          <div className="auth-header">
            <span className="auth-icon">🎉</span>
            <h2>Live Bollywood Party Rooms</h2>
            <p>Play live with your friends on phones or laptops! Real-time buzzer, synchronized hints & music video reveals.</p>
          </div>

          {joinError && <div className="feedback-alert feedback-error">{joinError}</div>}

          {/* Profile Name & Avatar */}
          <div className="form-group">
            <label className="form-label">Your Nickname</label>
            <input
              type="text"
              value={playerNameInput}
              onChange={e => setPlayerNameInput(e.target.value)}
              placeholder="e.g. Raj, Geet, Bunty..."
              className="guess-input"
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Choose Your Bollywood Character</label>
            <div className="avatar-grid">
              {AVATARS.map(a => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setSelectedAvatar(a.emoji)}
                  className={`avatar-btn ${selectedAvatar === a.emoji ? 'selected' : ''}`}
                >
                  <span className="avatar-icon">{a.emoji}</span>
                  <span className="avatar-name">{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create or Join Tabs */}
          <div className="join-create-split">
            {/* Join an existing room */}
            <div className="split-box">
              <h3>Join a Party Room</h3>
              <input
                type="text"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE (e.g. A9K2)"
                className="guess-input text-center font-mono text-xl tracking-widest uppercase"
                maxLength={6}
              />
              <button onClick={handleJoinRoom} className="btn btn-primary w-full mt-3">
                <Users size={18} />
                <span>Join Room</span>
              </button>
            </div>

            <div className="divider-text">OR</div>

            {/* Create Room */}
            <div className="split-box">
              <h3>Host a New Party</h3>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setGameModeSelection('teams')}
                  className={`mode-btn flex-1 ${gameModeSelection === 'teams' ? 'active' : ''}`}
                >
                  Team Battle
                </button>
                <button
                  type="button"
                  onClick={() => setGameModeSelection('individual')}
                  className={`mode-btn flex-1 ${gameModeSelection === 'individual' ? 'active' : ''}`}
                >
                  Individual
                </button>
              </div>
              <button onClick={handleCreateRoom} className="btn btn-secondary w-full">
                <Play size={18} />
                <span>Create Party Room</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* IN-ROOM LIVE GAMEPLAY SCREEN */
        <div className="in-room-layout">
          {/* Header Bar */}
          <div className="room-header-bar">
            <div className="room-info">
              <span className="room-label">Room Code:</span>
              <button onClick={copyRoomCode} className="room-code-tag" title="Click to Copy">
                <span>{roomCode}</span>
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <span className="player-count">👥 {roomState?.players?.length || 1} online</span>
            </div>

            {/* In-game Reactions */}
            <div className="reactions-bar">
              {['🔥', '💃', '🕺', '👏', '🍿', '🏆'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="reaction-btn"
                  title="Send Reaction"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Teams Bar (if team mode) */}
          {roomState?.gameMode === 'teams' && roomState?.teams && (
            <div className="team-scores-header">
              {Object.values(roomState.teams).map(t => (
                <div key={t.id} className="team-score-card" style={{ borderColor: t.color }}>
                  <div className="team-tag" style={{ background: t.color }}>{t.name}</div>
                  <div className="team-points">{t.score} <span className="pts-label">pts</span></div>
                  <div className="team-members-list">
                    {t.members.map(mId => {
                      const p = roomState.players.find(x => x.id === mId);
                      return p ? (
                        <span key={p.id} className="member-chip" title={p.name}>
                          {p.avatar} {p.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOBBY STATE (Waiting for host to start) */}
          {roomState?.status === 'lobby' && (
            <div className="lobby-waiting-card animate-fade-in">
              <span className="lobby-badge">🎉 Party Lobby</span>
              <h2>Ready for Bollywood Antakshari?</h2>
              <p>Share Room Code <strong>{roomCode}</strong> with friends. Everyone can join right now!</p>

              <div className="players-lobby-list">
                {roomState?.players?.map(p => (
                  <div key={p.id} className="player-lobby-chip">
                    <span className="avatar-chip">{p.avatar}</span>
                    <span className="player-name-chip">{p.name}</span>
                    {p.isHost && <span className="host-badge">HOST</span>}
                  </div>
                ))}
              </div>

              {isHost ? (
                <button
                  onClick={() => sendWsAction('START_ROUND')}
                  className="btn btn-primary start-game-btn mt-6"
                >
                  <Play size={20} />
                  <span>Start First Round</span>
                </button>
              ) : (
                <p className="waiting-host-text animate-pulse">Waiting for host to start the game...</p>
              )}
            </div>
          )}

          {/* ACTIVE QUESTION / BUZZER ROUND */}
          {(roomState?.status === 'question' || roomState?.status === 'buzzed') && roomState?.currentCard && (
            <div className="active-multiplayer-round">
              <ClueCard
                card={roomState.currentCard}
                currentClueLevel={roomState.revealedClueLevel}
                onRevealNextClue={() => sendWsAction('ADVANCE_CLUE')}
                isAnswerRevealed={false}
              />

              {/* Buzzer Banner */}
              {roomState.status === 'buzzed' && roomState.buzzer && (
                <div className="buzzer-announcement animate-pop">
                  <Zap size={24} className="text-amber-400 animate-bounce" />
                  <div>
                    <span className="buzzer-user">
                      {roomState.buzzer.playerAvatar} {roomState.buzzer.playerName} BUZZED IN!
                    </span>
                    <p className="buzzer-timer">10 seconds to guess aloud!</p>
                  </div>
                </div>
              )}

              {/* Big Interactive BUZZER Button */}
              {roomState.status === 'question' && (
                <div className="buzzer-container">
                  <button
                    onClick={handleBuzzerClick}
                    className="big-party-buzzer animate-pulse-glow"
                  >
                    <span>BUZZ IN!</span>
                  </button>
                </div>
              )}

              {/* Host Verification Controls */}
              {isHost && roomState.status === 'buzzed' && (
                <div className="host-decision-bar animate-fade-in">
                  <p className="text-sm text-zinc-300 font-semibold mb-2">Host Decision:</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleHostDecision(true)}
                      className="btn btn-success flex-1"
                    >
                      Correct (+Points)
                    </button>
                    <button
                      onClick={() => handleHostDecision(false)}
                      className="btn btn-warning flex-1"
                    >
                      Wrong (Reopen Buzzer)
                    </button>
                  </div>
                </div>
              )}

              {/* Host can also reveal anytime */}
              {isHost && (
                <div className="text-center mt-3">
                  <button
                    onClick={() => sendWsAction('REVEAL_ANSWER')}
                    className="btn btn-ghost text-xs"
                  >
                    Reveal Answer & Video
                  </button>
                </div>
              )}
            </div>
          )}

          {/* REVEALED ROUND (Answer & In-App YouTube Video Synchronized for Everyone!) */}
          {roomState?.status === 'revealed' && roomState?.currentCard && (
            <div className="answer-card-revealed animate-scale-up">
              <div className="answer-header">
                <div className="song-badge">🎉 Revealed Song</div>
                <h2 className="song-title-highlight">{roomState.currentCard.song_name}</h2>
                <div className="movie-details">
                  <span>🎬 <strong>{roomState.currentCard.movie_name}</strong></span>
                  <span>•</span>
                  <span>🎤 <strong>{roomState.currentCard.artist}</strong></span>
                  <span>•</span>
                  <span>🗓️ <strong>{roomState.currentCard.release_year}</strong></span>
                </div>
              </div>

              {/* Lyrical Riddles Decoded (Clue 1 & Clue 2 mapped to Original Hindi) */}
              <LyricalDecodedCard card={roomState.currentCard} />

              {/* Synchronized In-App YouTube Player */}
              <YouTubePlayer
                videoId={roomState.currentCard.youtube_video_id}
                searchQuery={roomState.currentCard.youtube_search_query}
                songName={roomState.currentCard.song_name}
                movieName={roomState.currentCard.movie_name}
              />

              {isHost && (
                <div className="next-round-bar">
                  <button
                    onClick={() => sendWsAction('START_ROUND')}
                    className="btn btn-primary next-song-btn"
                  >
                    <span>Next Round</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
