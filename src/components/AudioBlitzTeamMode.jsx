import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play, Pause, RotateCcw, Sparkles, Check, X,
  ArrowRight, Trophy, Flame, Film, Clock,
  Headphones, Disc, Mic2, Calendar, ShieldAlert,
  Eye, EyeOff, Search, Zap, Edit2
} from 'lucide-react';
import YouTubePlayer from './YouTubePlayer';
import { sounds } from './SoundEffects';
import {
  ERA_THEMES,
  applyEraTheme,
  matchBollywoodSongGuess,
  triggerViewTransition,
  loadSessionState,
  saveSessionState
} from '../utils/gameTech';

const TEAM_BLITZ_STORAGE_KEY = 'bolly_team_blitz_session_v1';

const DEFAULT_BARS = [
  24, 42, 32, 64, 48, 76, 38, 84, 56, 36, 68, 52,
  88, 44, 72, 58, 80, 40, 62, 50, 74, 34, 58, 28
];

export default function AudioBlitzTeamMode({ initialEra = 'all' }) {
  const initialSession = loadSessionState(TEAM_BLITZ_STORAGE_KEY, {
    playlistEra: initialEra,
    teams: [
      { id: 'team_red', name: 'Team Sholay', color: '#e11d48', score: 0 },
      { id: 'team_blue', name: 'Team DDLJ', color: '#2563eb', score: 0 }
    ],
    activeTeamIdx: 0,
    roundNumber: 1,
    card: null,
    clipSeconds: 5,
    hasPlayed5s: false,
    hasUnlocked10s: false,
    isAnswerRevealed: false,
    guessStyle: 'type',
    usedMultipleChoice: false,
    teamGuessInput: '',
    shuffledOptions: [],
    guessFeedback: null,
    isStealPhase: false,
    stealInput: '',
    timeLeft: 45,
    winnerTeam: null,
    playedIds: []
  });

  const [playlistEra, setPlaylistEra] = useState(initialSession.playlistEra || initialEra);
  const [teams, setTeams] = useState(
    Array.isArray(initialSession.teams) && initialSession.teams.length === 2
      ? initialSession.teams
      : [
          { id: 'team_red', name: 'Team Sholay', color: '#e11d48', score: 0 },
          { id: 'team_blue', name: 'Team DDLJ', color: '#2563eb', score: 0 }
        ]
  );
  const [activeTeamIdx, setActiveTeamIdx] = useState(Number(initialSession.activeTeamIdx) || 0);
  const [roundNumber, setRoundNumber] = useState(Number(initialSession.roundNumber) || 1);
  const [targetScore] = useState(500);

  const [card, setCard] = useState(initialSession.card || null);
  const [loading, setLoading] = useState(!initialSession.card);
  const [error, setError] = useState(null);

  // Audio clip state
  const [clipSeconds, setClipSeconds] = useState(initialSession.clipSeconds || 5); // 5 or 10
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasPlayed5s, setHasPlayed5s] = useState(Boolean(initialSession.hasPlayed5s));
  const [hasUnlocked10s, setHasUnlocked10s] = useState(Boolean(initialSession.hasUnlocked10s));
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(Boolean(initialSession.isAnswerRevealed));

  // Web Audio visualizer refs
  const [freqBars, setFreqBars] = useState(DEFAULT_BARS);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const rafRef = useRef(null);

  // Team guessing controls
  const [guessStyle, setGuessStyle] = useState(initialSession.guessStyle || 'type'); // 'type' | 'host'
  const [usedMultipleChoice, setUsedMultipleChoice] = useState(Boolean(initialSession.usedMultipleChoice));
  const [teamGuessInput, setTeamGuessInput] = useState(initialSession.teamGuessInput || '');
  const [shuffledOptions, setShuffledOptions] = useState(
    Array.isArray(initialSession.shuffledOptions) ? initialSession.shuffledOptions : []
  );
  const [guessFeedback, setGuessFeedback] = useState(initialSession.guessFeedback || null);

  // Steal phase
  const [isStealPhase, setIsStealPhase] = useState(Boolean(initialSession.isStealPhase));
  const [stealInput, setStealInput] = useState(initialSession.stealInput || '');

  // Host secret peek
  const [showHostPeek, setShowHostPeek] = useState(false);

  // Timer, Winner & Session History
  const [timeLeft, setTimeLeft] = useState(
    typeof initialSession.timeLeft === 'number' && initialSession.timeLeft > 0
      ? initialSession.timeLeft
      : 45
  );
  const [timerActive, setTimerActive] = useState(!initialSession.isAnswerRevealed);
  const [winnerTeam, setWinnerTeam] = useState(initialSession.winnerTeam || null);
  const [playedIds, setPlayedIds] = useState(
    Array.isArray(initialSession.playedIds) ? initialSession.playedIds : []
  );

  // Team name editing
  const [editingTeamIdx, setEditingTeamIdx] = useState(null);
  const [editNameText, setEditNameText] = useState('');

  useEffect(() => {
    applyEraTheme(playlistEra);
  }, [playlistEra]);

  // Persist session state across browser reloads
  useEffect(() => {
    saveSessionState(TEAM_BLITZ_STORAGE_KEY, {
      playlistEra,
      teams,
      activeTeamIdx,
      roundNumber,
      card,
      clipSeconds,
      hasPlayed5s,
      hasUnlocked10s,
      isAnswerRevealed,
      guessStyle,
      usedMultipleChoice,
      teamGuessInput,
      shuffledOptions,
      guessFeedback,
      isStealPhase,
      stealInput,
      timeLeft,
      winnerTeam,
      playedIds
    });
  }, [
    playlistEra,
    teams,
    activeTeamIdx,
    roundNumber,
    card,
    clipSeconds,
    hasPlayed5s,
    hasUnlocked10s,
    isAnswerRevealed,
    guessStyle,
    usedMultipleChoice,
    teamGuessInput,
    shuffledOptions,
    guessFeedback,
    isStealPhase,
    stealInput,
    timeLeft,
    winnerTeam,
    playedIds
  ]);

  const stopVisualizerLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setFreqBars(DEFAULT_BARS);
  };

  const startVisualizerLoop = () => {
    try {
      if (!audioRef.current) return;
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (audioCtxRef.current && !sourceNodeRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.78;
        const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioCtxRef.current.destination);
        sourceNodeRef.current = source;
        analyserRef.current = analyser;
      }

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateBars = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const nextBars = Array.from({ length: 24 }, (_, idx) => {
            const val = dataArray[idx % bufferLength] || 0;
            return Math.max(16, Math.min(98, Math.round((val / 255) * 95) + 12));
          });
          setFreqBars(nextBars);
          rafRef.current = requestAnimationFrame(updateBars);
        };
        rafRef.current = requestAnimationFrame(updateBars);
      }
    } catch (e) {
      // Fallback to static bars if Web Audio graph is already bound
    }
  };

  const stopAudio = () => {
    stopVisualizerLoop();
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (e) {}
    }
    setIsPlayingClip(false);
  };

  const loadNewRound = async (excludeId = null, eraOverride = null) => {
    const activeEra = eraOverride || playlistEra;
    stopAudio();
    setLoading(true);
    setError(null);
    setIsAnswerRevealed(false);
    setClipSeconds(5);
    setCurrentTime(0);
    setHasPlayed5s(false);
    setHasUnlocked10s(false);
    setTimeLeft(45);
    setTimerActive(true);
    setTeamGuessInput('');
    setStealInput('');
    setIsStealPhase(false);
    setUsedMultipleChoice(false);
    setGuessFeedback(null);
    setShowHostPeek(false);

    try {
      let url = `/api/trivia/next?era=${activeEra}`;
      if (excludeId) url += `&excludeId=${excludeId}`;
      const recentExcluded = playedIds.slice(-120);
      if (recentExcluded.length > 0) {
        url += `&excludeIds=${recentExcluded.join(',')}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load song');
      const data = await res.json();
      setCard(data.card);

      if (data.card) {
        setPlayedIds((prev) =>
          prev.includes(data.card.id) ? prev : [...prev.slice(-149), data.card.id]
        );
        const options = [
          data.card.song_name,
          ...(Array.isArray(data.card.distractors) ? data.card.distractors : [])
        ];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        setShuffledOptions(options);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!card) {
      loadNewRound();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Round countdown timer
  useEffect(() => {
    if (!timerActive || isAnswerRevealed || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          sounds.playBuzz();
          setTimerActive(false);
          if (!isStealPhase) {
            handleActivateSteal('Time is UP for the active team!');
          }
          return 0;
        }
        if (prev <= 6) {
          sounds.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, isAnswerRevealed, timeLeft, isStealPhase]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);

    if (curr >= clipSeconds) {
      audioRef.current.pause();
      stopVisualizerLoop();
      setIsPlayingClip(false);
      sounds.playTick();
    }
  };

  const handlePlayClip = (duration) => {
    if (!audioRef.current) return;
    sounds.playTick();

    setClipSeconds(duration);
    if (duration === 5) {
      setHasPlayed5s(true);
    } else {
      setHasUnlocked10s(true);
    }

    try {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingClip(true);
            startVisualizerLoop();
          })
          .catch(() => {
            setIsPlayingClip(false);
          });
      }
    } catch (e) {}
  };

  const handlePauseClip = () => {
    stopAudio();
    sounds.playTick();
  };

  const calculatePoints = () => {
    const base = hasUnlocked10s || clipSeconds === 10 ? 50 : 100;
    if (usedMultipleChoice) {
      return Math.floor(base / 2);
    }
    return base;
  };

  const calculateStealPoints = () => {
    return Math.max(25, Math.floor(calculatePoints() * 0.75));
  };

  const checkAnswerMatch = (guess) => {
    if (!card?.song_name) return false;
    return matchBollywoodSongGuess(guess, card.song_name).isMatch;
  };

  const handleActivateSteal = (reasonMessage) => {
    stopAudio();
    setIsStealPhase(true);
    setTimeLeft(25);
    setTimerActive(true);
    setGuessFeedback({
      correct: false,
      message: `${reasonMessage} Steal Opportunity for ${teams[(activeTeamIdx + 1) % teams.length].name}!`
    });
  };

  const handleTeamVictory = (awardedTeamIdx, points, message) => {
    stopAudio();
    sounds.playCorrect();
    confetti({
      particleCount: 120,
      spread: 85,
      origin: { y: 0.6 }
    });

    const updatedTeams = [...teams];
    updatedTeams[awardedTeamIdx].score += points;
    setTeams(updatedTeams);

    setGuessFeedback({
      correct: true,
      message: `${message} (+${points} PTS)`
    });

    setIsAnswerRevealed(true);
    setTimerActive(false);

    if (updatedTeams[awardedTeamIdx].score >= targetScore) {
      setWinnerTeam(updatedTeams[awardedTeamIdx]);
      sounds.playFanfare();
    }

    if (card?.id) {
      fetch('/api/trivia/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isCorrect: true })
      }).catch(() => {});
    }
  };

  const handleCheckActiveTeamGuess = (e) => {
    if (e) e.preventDefault();
    if (!teamGuessInput.trim() || isAnswerRevealed) return;

    if (checkAnswerMatch(teamGuessInput)) {
      handleTeamVictory(
        activeTeamIdx,
        calculatePoints(),
        `🎉 Master Ears! ${teams[activeTeamIdx].name} nailed it in ${clipSeconds}s!`
      );
    } else {
      sounds.playWrong();
      handleActivateSteal(`❌ Wrong guess by ${teams[activeTeamIdx].name} ("${teamGuessInput}")!`);
    }
  };

  const handleOptionPick = (option) => {
    if (isAnswerRevealed) return;
    if (option === card.song_name) {
      handleTeamVictory(
        activeTeamIdx,
        calculatePoints(),
        `🎉 BINGO! ${teams[activeTeamIdx].name} picked the right song!`
      );
    } else {
      sounds.playWrong();
      handleActivateSteal(`❌ Wrong choice by ${teams[activeTeamIdx].name}!`);
    }
  };

  const handleCheckStealGuess = (e) => {
    if (e) e.preventDefault();
    if (!stealInput.trim() || isAnswerRevealed) return;

    const rivalTeamIdx = (activeTeamIdx + 1) % teams.length;
    if (checkAnswerMatch(stealInput)) {
      handleTeamVictory(
        rivalTeamIdx,
        calculateStealPoints(),
        `⚡ UNBELIEVABLE 5-SEC STEAL by ${teams[rivalTeamIdx].name}!`
      );
    } else {
      sounds.playWrong();
      stopAudio();
      setGuessFeedback({
        correct: false,
        message: '❌ Steal failed! Neither team got it.'
      });
      setIsAnswerRevealed(true);
      setTimerActive(false);
    }
  };

  const handleNextRound = () => {
    setActiveTeamIdx((activeTeamIdx + 1) % teams.length);
    setRoundNumber((prev) => prev + 1);
    loadNewRound(card?.id);
  };

  const handleRestartGame = () => {
    setTeams(teams.map((t) => ({ ...t, score: 0 })));
    setActiveTeamIdx(0);
    setRoundNumber(1);
    setWinnerTeam(null);
    loadNewRound();
  };

  const activeTeam = teams[activeTeamIdx];
  const rivalTeam = teams[(activeTeamIdx + 1) % teams.length];
  const activeEraMeta = ERA_THEMES[playlistEra] || ERA_THEMES.all;

  return (
    <div className="team-mode-container animate-fade-in">
      {/* Team Scoreboard Banner */}
      <div className="team-scores-header">
        {teams.map((t, idx) => (
          <div
            key={t.id}
            className={`team-score-card ${idx === activeTeamIdx && !winnerTeam ? 'is-turn' : ''} ${
              isStealPhase && idx !== activeTeamIdx ? 'is-stealing' : ''
            }`}
            style={{ borderColor: t.color }}
          >
            <div className="team-tag-row">
              <span className="team-tag" style={{ background: t.color }}>
                {t.name}
              </span>
              <button
                onClick={() => {
                  setEditingTeamIdx(idx);
                  setEditNameText(t.name);
                }}
                className="edit-team-btn"
                title="Rename Team"
              >
                <Edit2 size={12} />
              </button>
            </div>

            <div className="team-points">
              {t.score} <span className="pts-label">pts</span>
            </div>

            {idx === activeTeamIdx && !winnerTeam && !isStealPhase && (
              <span className="turn-indicator">⭐ Active Turn</span>
            )}

            {isStealPhase && idx !== activeTeamIdx && !winnerTeam && (
              <span className="steal-indicator animate-pulse">⚡ STEAL PHASE!</span>
            )}
          </div>
        ))}
      </div>

      {/* Team Name Edit Popover */}
      {editingTeamIdx !== null && (
        <div className="team-edit-bar animate-pop">
          <span>Rename Team:</span>
          <input
            type="text"
            value={editNameText}
            onChange={(e) => setEditNameText(e.target.value)}
            className="guess-input text-sm py-1 px-2"
            autoFocus
          />
          <button
            onClick={() => {
              if (editNameText.trim()) {
                const updated = [...teams];
                updated[editingTeamIdx].name = editNameText.trim();
                setTeams(updated);
              }
              setEditingTeamIdx(null);
            }}
            className="btn btn-primary text-xs py-1 px-3"
          >
            Save
          </button>
          <button onClick={() => setEditingTeamIdx(null)} className="btn btn-ghost text-xs py-1 px-2">
            Cancel
          </button>
        </div>
      )}

      {/* Era Filter Selector */}
      <div className="era-selector-block">
        <div className="era-filter-tabs" role="tablist" aria-label="Select 5-Sec Team Battle Era">
          {[
            { id: 'all', label: '🔥 All-Time Hits' },
            { id: 'Classics', label: '📻 Evergreen Legends' },
            { id: '90s', label: '📼 90s Golden Era' },
            { id: '2000s', label: '🎧 2000s Nostalgia' },
            { id: '2010s', label: '✨ 2010s Romance & Pop' },
            { id: '2020s', label: '🚀 2020s Reels & Trends' }
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={playlistEra === tab.id}
              onClick={() => {
                if (playlistEra === tab.id) return;
                sounds.playTick();
                triggerViewTransition(() => {
                  setPlaylistEra(tab.id);
                  loadNewRound(card?.id, tab.id);
                });
              }}
              className={`era-tab-btn ${playlistEra === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="era-tagline">{activeEraMeta.tagline}</p>
      </div>

      {/* Winner Podium Screen */}
      {winnerTeam ? (
        <div className="winner-podium animate-scale-up">
          <Trophy size={64} className="text-amber-400 trophy-bounce" />
          <h1 className="winner-title">🏆 {winnerTeam.name} Wins the 5-Sec Audio Battle!</h1>
          <p className="winner-subtitle">Magnificent victory with {winnerTeam.score} points!</p>
          <button onClick={handleRestartGame} className="btn btn-primary mt-4">
            <RotateCcw size={18} />
            <span>Play Rematch</span>
          </button>
        </div>
      ) : (
        <>
          {/* Round Status Bar & Timer */}
          <div className="round-status-bar">
            <div className="round-label">
              <span>Round {roundNumber}</span>
              <span className="round-target">• First to {targetScore} Pts</span>
            </div>

            {card && !isAnswerRevealed && (
              <button
                onClick={() => setShowHostPeek((prev) => !prev)}
                className="host-peek-btn"
                title="Host secret answer checker"
              >
                {showHostPeek ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showHostPeek ? 'Hide Secret Answer' : 'Host Secret Peek'}</span>
              </button>
            )}

            <div className={`timer-badge ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
              <Clock size={16} />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Host Secret Answer Box */}
          {showHostPeek && card && !isAnswerRevealed && (
            <div className="host-secret-drawer animate-pop">
              <span className="secret-badge">🤫 HOST PEEK (Do not show players!)</span>
              <p className="secret-text">
                Target Song: <strong>"{card.song_name}"</strong> from <em>{card.movie_name}</em>
              </p>
              <div className="secret-actions">
                <button
                  onClick={() =>
                    handleTeamVictory(
                      activeTeamIdx,
                      calculatePoints(),
                      `Host marked ${activeTeam.name} correct!`
                    )
                  }
                  className="btn btn-success text-xs py-1 px-3"
                >
                  <Check size={14} />
                  <span>Mark {activeTeam.name} Correct</span>
                </button>
                <button
                  onClick={() => handleActivateSteal(`Host offered steal to ${rivalTeam.name}!`)}
                  className="btn btn-warning text-xs py-1 px-3"
                >
                  <ShieldAlert size={14} />
                  <span>Pass Steal to {rivalTeam.name}</span>
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="game-loading-state">
              <div className="spinner"></div>
              <p>Tuning 5-second team audio challenge...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-card">
              <p>⚠️ {error}</p>
              <button onClick={() => loadNewRound()} className="btn btn-primary mt-2">
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {!loading && card && (
            <div className="team-play-area">
              {/* Native HTML5 Audio Element */}
              <audio
                ref={audioRef}
                src={card.preview_url && card.id > 230 ? card.preview_url : `/audio_clips/${card.id}.mp3`}
                preload="auto"
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  stopVisualizerLoop();
                  setIsPlayingClip(false);
                }}
                onError={(e) => {
                  if (!e.target.dataset.retried) {
                    e.target.dataset.retried = 'true';
                    e.target.src = card.preview_url || `/api/audio/${card.id}`;
                  }
                }}
              />

              {!isAnswerRevealed ? (
                <>
                  {/* 5-Sec / 10-Sec Audio Deck */}
                  <div className="mystery-audio-card clue-entry-anim mb-4">
                    <div className="mystery-header">
                      <span className="mystery-badge">
                        <Headphones size={14} className="text-amber-400" aria-hidden="true" />
                        <span>5-Sec Team Audio Battle • {card.era || 'Bollywood'}</span>
                      </span>
                      <span className="mystery-pts">
                        Active Value: <strong>+{ isStealPhase ? calculateStealPoints() : calculatePoints() } PTS</strong>
                      </span>
                    </div>

                    <div className="vinyl-turntable-stage">
                      <div className={`vinyl-disc ${isPlayingClip ? 'spinning' : ''}`}>
                        <div className="vinyl-grooves"></div>
                        <div className="vinyl-center-label">
                          <Disc size={28} className="text-amber-950" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="audio-waveform-box">
                        <div className="waveform-status-row">
                          <span className="clip-mode-tag">
                            {isPlayingClip
                              ? `🔊 Playing ${clipSeconds}s Intro Snippet...`
                              : `⏸️ Ready (${clipSeconds}s Mode)`}
                          </span>
                          <span className="clip-time-counter">
                            {Math.min(currentTime, clipSeconds).toFixed(1)}s / {clipSeconds}.0s
                          </span>
                        </div>

                        <div className="clip-progress-track">
                          <div
                            className="clip-progress-fill"
                            style={{ width: `${Math.min(100, (currentTime / clipSeconds) * 100)}%` }}
                          />
                        </div>

                        <div className={`sound-bars ${isPlayingClip ? 'active' : ''}`} aria-hidden="true">
                          {freqBars.map((heightPct, idx) => (
                            <span
                              key={idx}
                              className="bar"
                              style={{ height: isPlayingClip ? `${heightPct}%` : '22%' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="blitz-playback-controls">
                      <button
                        type="button"
                        onClick={() => handlePlayClip(5)}
                        disabled={isPlayingClip}
                        className="btn btn-primary clip-play-btn"
                      >
                        {hasPlayed5s ? <RotateCcw size={18} /> : <Play size={18} />}
                        <span>
                          {hasPlayed5s
                            ? '🔁 Replay 5 Seconds (100 Pts)'
                            : '▶️ Play 5 Seconds [100 Pts]'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayClip(10)}
                        disabled={isPlayingClip}
                        className="btn btn-secondary clip-play-btn"
                      >
                        {hasUnlocked10s ? <RotateCcw size={18} /> : <Clock size={18} />}
                        <span>
                          {hasUnlocked10s
                            ? '🔁 Replay 10 Seconds (50 Pts)'
                            : '➕ Extend to 10 Seconds [50 Pts]'}
                        </span>
                      </button>

                      {isPlayingClip && (
                        <button
                          type="button"
                          onClick={handlePauseClip}
                          className="btn btn-danger clip-play-btn animate-pop"
                        >
                          <Pause size={18} />
                          <span>⏸️ Pause Audio</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback Banner */}
                  {guessFeedback && (
                    <div
                      className={`feedback-alert ${
                        guessFeedback.correct ? 'feedback-success' : 'feedback-error'
                      } animate-pop mb-3`}
                    >
                      {guessFeedback.correct ? <Check size={20} /> : <X size={20} />}
                      <span>{guessFeedback.message}</span>
                    </div>
                  )}

                  {/* Team Guessing Box */}
                  <div className="team-checking-deck animate-fade-in">
                    {!isStealPhase ? (
                      <div className="active-turn-box" style={{ borderColor: activeTeam.color }}>
                        <div className="turn-banner" style={{ background: `${activeTeam.color}22` }}>
                          <div className="flex items-center gap-2">
                            <Flame size={20} style={{ color: activeTeam.color }} />
                            <span className="font-bold text-lg text-white">
                              {activeTeam.name}'s Turn to Guess!
                            </span>
                          </div>
                          <span className="pts-badge-glow">+{calculatePoints()} PTS</span>
                        </div>

                        <div className="guess-mode-switcher mt-3">
                          <button
                            onClick={() => setGuessStyle('type')}
                            className={`mode-btn ${guessStyle === 'type' ? 'active' : ''}`}
                          >
                            ⌨️ Team Guess Input
                          </button>
                          <button
                            onClick={() => setGuessStyle('host')}
                            className={`mode-btn ${guessStyle === 'host' ? 'active' : ''}`}
                          >
                            🎤 Verbal Host Controls
                          </button>
                        </div>

                        {guessStyle === 'type' && (
                          <div className="team-type-wrapper mt-3">
                            <form onSubmit={handleCheckActiveTeamGuess} className="team-guess-form">
                              <input
                                type="text"
                                value={teamGuessInput}
                                onChange={(e) => setTeamGuessInput(e.target.value)}
                                placeholder={
                                  usedMultipleChoice
                                    ? `${activeTeam.name}, type or click a choice below (+${calculatePoints()} PTS)...`
                                    : `${activeTeam.name}, type song name for FULL POINTS (+${calculatePoints()} PTS)...`
                                }
                                className="guess-input"
                                autoFocus
                              />
                              <button type="submit" className="btn btn-primary team-check-btn">
                                <Search size={18} />
                                <span>Check ({calculatePoints()} Pts)</span>
                              </button>
                            </form>

                            {!usedMultipleChoice ? (
                              <div className="mc-hint-box text-center mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playTick();
                                    setUsedMultipleChoice(true);
                                  }}
                                  className="btn-hint-outline"
                                >
                                  <Sparkles size={16} />
                                  <span>
                                    💡 Need Choices? Reveal 4 Options (Half Points: {Math.floor(calculatePoints() / 2)} PTS)
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="open-choices-section animate-scale-up mt-3">
                                <div className="open-choices-header">
                                  <span className="open-choices-title">
                                    🎯 Multiple Choice Hint Active — Pick for {activeTeam.name} ({calculatePoints()} PTS):
                                  </span>
                                </div>
                                <div className="options-grid">
                                  {shuffledOptions.map((opt, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleOptionPick(opt)}
                                      className="option-card-btn"
                                    >
                                      <span className="option-number">{idx + 1}</span>
                                      <span className="option-title">{opt}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {guessStyle === 'host' && (
                          <div className="verbal-controls-grid mt-3">
                            <button
                              onClick={() =>
                                handleTeamVictory(
                                  activeTeamIdx,
                                  calculatePoints(),
                                  `${activeTeam.name} got it right!`
                                )
                              }
                              className="btn btn-success flex-1 py-3"
                            >
                              <Check size={18} />
                              <span>{activeTeam.name} is Correct! (+{calculatePoints()} pts)</span>
                            </button>
                            <button
                              onClick={() =>
                                handleActivateSteal(`${activeTeam.name} passed/got it wrong!`)
                              }
                              className="btn btn-warning flex-1 py-3"
                            >
                              <ShieldAlert size={18} />
                              <span>Wrong / Pass to {rivalTeam.name}</span>
                            </button>
                          </div>
                        )}

                        <div className="team-pass-row mt-3">
                          <button
                            onClick={() =>
                              handleActivateSteal(`${activeTeam.name} passed their turn!`)
                            }
                            className="btn btn-ghost text-xs"
                          >
                            Pass to {rivalTeam.name} (Activate Steal)
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Phase 2: Steal Phase for Rival Team */
                      <div className="steal-turn-box animate-scale-up" style={{ borderColor: rivalTeam.color }}>
                        <div className="steal-banner-header" style={{ background: `${rivalTeam.color}25` }}>
                          <div className="flex items-center gap-2">
                            <Zap size={22} className="text-amber-400 animate-bounce" />
                            <span className="font-bold text-lg text-amber-300">
                              STEAL CHANCE FOR {rivalTeam.name.toUpperCase()}!
                            </span>
                          </div>
                          <span className="pts-badge-glow">+{calculateStealPoints()} STEAL PTS</span>
                        </div>

                        <form onSubmit={handleCheckStealGuess} className="team-guess-form mt-3">
                          <input
                            type="text"
                            value={stealInput}
                            onChange={(e) => setStealInput(e.target.value)}
                            placeholder={`${rivalTeam.name}, type your steal guess...`}
                            className="guess-input border-amber-400"
                            autoFocus
                          />
                          <button type="submit" className="btn btn-warning team-check-btn">
                            <Zap size={18} />
                            <span>Submit Steal</span>
                          </button>
                        </form>

                        {!usedMultipleChoice ? (
                          <div className="mc-hint-box text-center mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playTick();
                                setUsedMultipleChoice(true);
                              }}
                              className="btn-hint-outline"
                            >
                              <Sparkles size={16} />
                              <span>💡 Reveal 4 Choices for Steal (Half Points)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="options-grid mt-3">
                            {shuffledOptions.map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (opt === card.song_name) {
                                    handleTeamVictory(
                                      1 - activeTeamIdx,
                                      calculateStealPoints(),
                                      `🔥 INCREDIBLE STEAL! ${rivalTeam.name} stole it!`
                                    );
                                  } else {
                                    sounds.playWrong();
                                    stopAudio();
                                    setIsAnswerRevealed(true);
                                    setTimerActive(false);
                                    setGuessFeedback({
                                      correct: false,
                                      message: `❌ Wrong steal by ${rivalTeam.name}!`
                                    });
                                  }
                                }}
                                className="option-card-btn border-amber-400/50"
                              >
                                <span className="option-number">{idx + 1}</span>
                                <span className="option-title">{opt}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="team-pass-row mt-3">
                          <button
                            onClick={() => {
                              stopAudio();
                              setIsAnswerRevealed(true);
                              setTimerActive(false);
                            }}
                            className="btn btn-ghost text-xs"
                          >
                            Neither Team Knows (Reveal Song & Video)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* REVEALED ANSWER (PURE SONG DETAILS + TRIVIA + YOUTUBE PLAYER — NO LYRICAL DECODES) */
                <div className="answer-card-revealed animate-scale-up">
                  {guessFeedback && (
                    <div
                      className={`feedback-alert ${
                        guessFeedback.correct ? 'feedback-success' : 'feedback-error'
                      } animate-pop mb-4`}
                    >
                      {guessFeedback.correct ? <Check size={20} /> : <X size={20} />}
                      <span>{guessFeedback.message}</span>
                    </div>
                  )}

                  <div className="answer-header">
                    <div className="song-badge">🎉 5-Sec Team Battle Solved!</div>
                    <h2 className="song-title-highlight">{card.song_name}</h2>
                    <div className="movie-details">
                      <span>
                        <Film size={14} className="inline mr-1 text-purple-400" />
                        <strong>{card.movie_name}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        <Mic2 size={14} className="inline mr-1 text-amber-400" />
                        <strong>{card.artist}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        <Calendar size={14} className="inline mr-1 text-blue-400" />
                        <strong>{card.release_year}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        <Disc size={14} className="inline mr-1 text-rose-400" />
                        <em>{card.era}</em>
                      </span>
                    </div>
                  </div>

                  {card.fun_fact && (
                    <div className="trivia-fact-box mt-3 mb-4">
                      <span className="fact-badge">✨ Behind-the-Scenes Trivia</span>
                      <p>{card.fun_fact}</p>
                    </div>
                  )}

                  <YouTubePlayer
                    videoId={card.youtube_video_id}
                    searchQuery={card.youtube_search_query}
                    songName={card.song_name}
                    movieName={card.movie_name}
                    artist={card.artist}
                    spotifyTrackId={card.spotify_track_id}
                    cardId={card.id}
                  />

                  <div className="next-round-bar">
                    <button onClick={handleNextRound} className="btn btn-primary next-song-btn">
                      <span>Next Round ({rivalTeam.name}'s Turn)</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
