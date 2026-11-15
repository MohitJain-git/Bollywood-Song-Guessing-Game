import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2,
  XCircle, ArrowRight, Trophy, Flame, Film, Clock,
  Headphones, Disc, Mic2, Calendar, AlertTriangle
} from 'lucide-react';
import YouTubePlayer from './YouTubePlayer';
import AudioBlitzTeamMode from './AudioBlitzTeamMode';
import { sounds } from './SoundEffects';
import {
  ERA_THEMES,
  applyEraTheme,
  matchBollywoodSongGuess,
  triggerViewTransition
} from '../utils/gameTech';

const DEFAULT_BARS = [
  24, 42, 32, 64, 48, 76, 38, 84, 56, 36, 68, 52,
  88, 44, 72, 58, 80, 40, 62, 50, 74, 34, 58, 28
];

export default function AudioBlitzMode() {
  const [blitzSubMode, setBlitzSubMode] = useState('solo'); // 'solo' | 'teams'
  const [playlistEra, setPlaylistEra] = useState('all');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio blitz clip states
  const [clipSeconds, setClipSeconds] = useState(5); // 5 or 10
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasPlayed5s, setHasPlayed5s] = useState(false);
  const [hasUnlocked10s, setHasUnlocked10s] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Audio & Web Audio API Frequency Visualizer refs
  const [audioReady, setAudioReady] = useState(false);
  const [freqBars, setFreqBars] = useState(DEFAULT_BARS);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const rafRef = useRef(null);

  // Guessing
  const [userGuess, setUserGuess] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [guessFeedback, setGuessFeedback] = useState(null);
  const [usedMultipleChoice, setUsedMultipleChoice] = useState(false);

  // Score
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    applyEraTheme(playlistEra);
  }, [playlistEra]);

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
      // Fallback to CSS animation if Web Audio graph is already bound
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

  const loadNextSong = async (excludeId = null) => {
    stopAudio();
    setLoading(true);
    setError(null);
    setIsAnswerRevealed(false);
    setClipSeconds(5);
    setCurrentTime(0);
    setHasPlayed5s(false);
    setHasUnlocked10s(false);
    setUserGuess('');
    setGuessFeedback(null);
    setUsedMultipleChoice(false);
    setAudioReady(false);

    try {
      let url = `/api/trivia/next?era=${playlistEra}`;
      if (excludeId) url += `&excludeId=${excludeId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load song');
      const data = await res.json();
      setCard(data.card);

      if (data.card) {
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
    loadNextSong();
  }, [playlistEra]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

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

  const handleAudioCanPlay = () => {
    setAudioReady(true);
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
          .catch((err) => {
            console.warn('[AudioBlitz] Autoplay error:', err);
            setIsPlayingClip(false);
          });
      }
    } catch (e) {
      console.warn('[AudioBlitz] Play error:', e);
    }
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

  const handleCorrectGuess = () => {
    stopAudio();
    sounds.playCorrect();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f43f5e', '#34d399', '#38bdf8']
    });

    const points = calculatePoints();
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore((prev) => prev + points);

    triggerViewTransition(() => {
      setGuessFeedback({
        status: 'correct',
        message: `🎉 Master Ears! You recognized "${card.song_name}" in ${clipSeconds}s! (+${points} PTS)`
      });
      setIsAnswerRevealed(true);
    }, '#blitz-revealed-heading');

    if (card?.id) {
      fetch('/api/trivia/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isCorrect: true })
      }).catch(() => {});
    }
  };

  const handleCloseGuess = () => {
    sounds.playTick();
    setGuessFeedback({
      status: 'close',
      message: '🔥 Bohot Kareeb! Your spelling is just 1–2 letters off — check the letter pattern or try again!'
    });
  };

  const handleWrongGuess = () => {
    sounds.playWrong();
    setStreak(0);
    setGuessFeedback({
      status: 'wrong',
      message: '❌ Not quite! Replay the clip, extend to 10 seconds, or reveal the letter pattern!'
    });
  };

  const handleOptionClick = (option) => {
    if (isAnswerRevealed) return;
    if (option === card.song_name) {
      handleCorrectGuess();
    } else {
      handleWrongGuess();
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!userGuess.trim() || isAnswerRevealed) return;

    const result = matchBollywoodSongGuess(userGuess, card.song_name);
    if (result.isMatch) {
      handleCorrectGuess();
    } else if (result.isClose) {
      handleCloseGuess();
    } else {
      handleWrongGuess();
    }
  };

  const activeEraMeta = ERA_THEMES[playlistEra] || ERA_THEMES.all;

  return (
    <div className="audio-blitz-container clue-entry-anim">
      {/* Solo vs Team Battle Switcher for 5-Sec Game */}
      <div className="guess-mode-switcher mb-4">
        <button
          type="button"
          onClick={() => {
            sounds.playTick();
            stopAudio();
            triggerViewTransition(() => setBlitzSubMode('solo'));
          }}
          className={`mode-btn ${blitzSubMode === 'solo' ? 'active' : ''}`}
        >
          🎧 Solo 5-Sec Challenge
        </button>
        <button
          type="button"
          onClick={() => {
            sounds.playTick();
            stopAudio();
            triggerViewTransition(() => setBlitzSubMode('teams'));
          }}
          className={`mode-btn ${blitzSubMode === 'teams' ? 'active' : ''}`}
        >
          ⚔️ 5-Sec Team Battle (Sholay vs DDLJ)
        </button>
      </div>

      {blitzSubMode === 'teams' ? (
        <AudioBlitzTeamMode initialEra={playlistEra} />
      ) : (
        <>
          {/* Top Banner Stats */}
          <div className="stats-bar">
        <div className="stat-pill score-pill">
          <Trophy size={16} className="text-amber-400" aria-hidden="true" />
          <span>Score: <strong>{score}</strong></span>
        </div>
        <div className="stat-pill streak-pill">
          <Flame size={16} className={streak > 0 ? 'text-orange-500 animate-pulse' : 'text-zinc-500'} aria-hidden="true" />
          <span>Streak: <strong>{streak}</strong></span>
        </div>
        <div className="stat-pill best-pill">
          <Clock size={16} className="text-blue-400" aria-hidden="true" />
          <span>Best Streak: <strong>{bestStreak}</strong></span>
        </div>
      </div>

      {/* Playlist Selector */}
      <div className="era-selector-block">
        <div className="era-filter-tabs" role="tablist" aria-label="Select Bollywood Blitz Era">
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
                sounds.playTick();
                triggerViewTransition(() => setPlaylistEra(tab.id));
              }}
              className={`era-tab-btn ${playlistEra === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="era-tagline">{activeEraMeta.tagline}</p>
      </div>

      {loading && (
        <div className="game-loading-state">
          <div className="spinner"></div>
          <p>Tuning high-definition audio clip from CDN...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button onClick={() => loadNextSong()} className="btn btn-primary mt-2">
            <RotateCcw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {!loading && card && (
        <div className="blitz-play-area">
          {/* NATIVE HTML5 AUDIO ELEMENT */}
          <audio
            ref={audioRef}
            src={card.preview_url && card.id > 220 ? card.preview_url : `/audio_clips/${card.id}.mp3`}
            preload="auto"
            crossOrigin="anonymous"
            onTimeUpdate={handleTimeUpdate}
            onCanPlay={handleAudioCanPlay}
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

          {/* MYSTERY AUDIO STATION (WHEN NOT REVEALED) */}
          {!isAnswerRevealed ? (
            <div className="mystery-audio-card clue-entry-anim">
              <div className="mystery-header">
                <span className="mystery-badge">
                  <Headphones size={14} className="text-amber-400" aria-hidden="true" />
                  <span>Live Studio Audio Challenge • {card.era || 'Bollywood'}</span>
                </span>
                <span className="mystery-pts">
                  Potential: <strong>+{calculatePoints()} PTS</strong>
                  {usedMultipleChoice ? (
                    <span className="ml-2 text-xs text-amber-400 font-bold">(Half Pts — Hint Used)</span>
                  ) : (
                    <span className="ml-2 text-xs text-emerald-400 font-bold">(Full Pts)</span>
                  )}
                </span>
              </div>

              {/* Live Web Audio Spectrum & Spinning Vinyl Deck */}
              <div className={`audio-waveform-box ${isPlayingClip ? 'is-playing' : ''}`}>
                <div className={`vinyl-disc-turntable ${isPlayingClip ? 'spinning' : ''}`} aria-hidden="true">
                  <div className="vinyl-grooves">
                    <div className="vinyl-center-label">
                      <span>🎵</span>
                    </div>
                  </div>
                </div>

                <div className="waveform-bars" aria-hidden="true">
                  {freqBars.map((h, i) => (
                    <span
                      key={i}
                      className="wave-bar"
                      style={{
                        height: isPlayingClip ? `${h}%` : '18%',
                        animationDelay: `${i * 0.04}s`
                      }}
                    />
                  ))}
                </div>

                {/* Progress bar inside waveform */}
                <div className="audio-progress-container">
                  <div
                    className="audio-progress-fill"
                    style={{
                      width: `${Math.min(100, (currentTime / clipSeconds) * 100)}%`
                    }}
                  />
                </div>

                <div className="audio-timer-overlay">
                  {isPlayingClip ? (
                    <div className="playing-state-tag">
                      <Volume2 size={22} className="text-amber-400" aria-hidden="true" />
                      <span>
                        Playing Studio Cut: <strong>{currentTime.toFixed(1)}s</strong> / {clipSeconds}.0s
                      </span>
                    </div>
                  ) : (
                    <span className="idle-state-tag">
                      {hasPlayed5s
                        ? `Paused at ${currentTime.toFixed(1)}s • Replay 5s or Unlock 10s!`
                        : `Press Play to hear the opening 5 seconds of the song!`}
                    </span>
                  )}
                </div>
              </div>

              {/* REAL AUDIO CONTROLS WITH REPLAY & EXTEND */}
              <div className="clip-control-buttons">
                <button
                  type="button"
                  onClick={() => handlePlayClip(5)}
                  disabled={isPlayingClip}
                  className="btn btn-primary clip-play-btn"
                >
                  {hasPlayed5s ? <RotateCcw size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                  <span>
                    {hasPlayed5s
                      ? '🔁 Replay First 5s (100 Pts)'
                      : '▶️ Play First 5 Seconds (100 Pts)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayClip(10)}
                  disabled={isPlayingClip}
                  className="btn btn-secondary clip-play-btn"
                  title="Hear 0:00 - 0:10 for half points (50 Pts)"
                >
                  {hasUnlocked10s ? <RotateCcw size={18} aria-hidden="true" /> : <Clock size={18} aria-hidden="true" />}
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
                    <Pause size={18} aria-hidden="true" />
                    <span>⏸️ Pause Audio</span>
                  </button>
                )}
              </div>

              {/* Feedback Alert */}
              {guessFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`feedback-alert ${
                    guessFeedback.status === 'correct'
                      ? 'feedback-success'
                      : guessFeedback.status === 'close'
                      ? 'feedback-warning'
                      : 'feedback-error'
                  } animate-pop mt-3`}
                >
                  {guessFeedback.status === 'correct' && <CheckCircle2 size={20} aria-hidden="true" />}
                  {guessFeedback.status === 'close' && <AlertTriangle size={20} aria-hidden="true" />}
                  {guessFeedback.status === 'wrong' && <XCircle size={20} aria-hidden="true" />}
                  <span>{guessFeedback.message}</span>
                </div>
              )}

              {/* Guessing Controls */}
              <div className="guess-section mt-4">
                <form onSubmit={handleTextSubmit} className="text-guess-form">
                  <input
                    type="text"
                    value={userGuess}
                    onChange={(e) => setUserGuess(e.target.value)}
                    placeholder={
                      usedMultipleChoice
                        ? `Type song name or pick from choices below (+${calculatePoints()} PTS)...`
                        : `Type song name for FULL POINTS (+${calculatePoints()} PTS)...`
                    }
                    aria-label="Type your Bollywood song guess"
                    className="guess-input"
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary guess-submit-btn">
                    Submit ({calculatePoints()} Pts)
                  </button>
                </form>

                {/* Hint Buttons Row */}
                {!usedMultipleChoice && (
                  <div className="blitz-lifelines-row">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTick();
                        triggerViewTransition(() => setUsedMultipleChoice(true));
                      }}
                      className="btn-hint-outline"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      <span>💡 Reveal 4 Choices (Half Points: {Math.floor(calculatePoints() / 2)} PTS)</span>
                    </button>
                  </div>
                )}

                {usedMultipleChoice && (
                  <div className="open-choices-section clue-entry-anim mt-3">
                    <div className="open-choices-header">
                      <span className="open-choices-title">
                        🎯 Multiple Choice Hint Active — Pick your song for {calculatePoints()} PTS:
                      </span>
                    </div>

                    <div className="options-grid">
                      {shuffledOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOptionClick(opt)}
                          className="option-card-btn"
                        >
                          <span className="option-number">{idx + 1}</span>
                          <span className="option-title">{opt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="reveal-bar">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTick();
                      stopAudio();
                      triggerViewTransition(() => {
                        setIsAnswerRevealed(true);
                        setStreak(0);
                      }, '#blitz-revealed-heading');
                    }}
                    className="btn btn-ghost text-xs"
                  >
                    Give Up & Reveal Answer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* REVEALED SONG CARD WITH PURE SONG DETAILS & FULL PLAYERS */
            <div className="answer-card-revealed clue-entry-anim">
              <div className="answer-header">
                <div className="song-badge">🎉 5-Sec Audio Challenge Solved!</div>
                <h2
                  id="blitz-revealed-heading"
                  tabIndex={-1}
                  className="song-title-highlight"
                >
                  {card.song_name}
                </h2>
                <div className="movie-details">
                  <span><Film size={14} className="inline mr-1 text-purple-400" aria-hidden="true" /><strong>{card.movie_name}</strong></span>
                  <span>•</span>
                  <span><Mic2 size={14} className="inline mr-1 text-amber-400" aria-hidden="true" /><strong>{card.artist}</strong></span>
                  <span>•</span>
                  <span><Calendar size={14} className="inline mr-1 text-blue-400" aria-hidden="true" /><strong>{card.release_year}</strong></span>
                  <span>•</span>
                  <span><Disc size={14} className="inline mr-1 text-rose-400" aria-hidden="true" /><em>{card.era}</em></span>
                </div>
              </div>

              {/* Deep Trivia Fun Fact */}
              {card.fun_fact && (
                <div className="trivia-fact-box mt-3 mb-4">
                  <span className="fact-badge">✨ Behind-the-Scenes Trivia</span>
                  <p>{card.fun_fact}</p>
                </div>
              )}

              {/* Full In-App Media Player */}
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
                <button
                  type="button"
                  onClick={() => loadNextSong(card.id)}
                  className="btn btn-primary next-song-btn"
                >
                  <span>Play Next 5-Sec Song</span>
                  <ArrowRight size={18} aria-hidden="true" />
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
