import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2,
  XCircle, ArrowRight, Trophy, Flame, Music, Film, Clock, HelpCircle, ShieldCheck,
  VolumeX, AlertCircle, ExternalLink
} from 'lucide-react';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import { sounds } from './SoundEffects';

export default function AudioBlitzMode() {
  const [playlistEra, setPlaylistEra] = useState('all');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio blitz clip states
  const [clipSeconds, setClipSeconds] = useState(5); // 5 or 10
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [clipCountdown, setClipCountdown] = useState(0);
  const [hasPlayed5s, setHasPlayed5s] = useState(false);
  const [hasUnlocked10s, setHasUnlocked10s] = useState(false);
  const [revealedMovieHint, setRevealedMovieHint] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Guessing
  const [userGuess, setUserGuess] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [guessFeedback, setGuessFeedback] = useState(null);
  const [modeType, setModeType] = useState('multiple-choice'); // 'multiple-choice' | 'type-guess'

  // Score
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Hidden audio / player controls
  const ytPlayerRef = useRef(null);
  const ytIframeRef = useRef(null);
  const playbackTimerRef = useRef(null);

  const sendYtCommand = (func, args = []) => {
    // 1. Try window.YT.Player instance
    if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === 'function') {
      try {
        ytPlayerRef.current[func](...args);
      } catch (e) {
        console.warn('[Blitz] YT player error:', e);
      }
    }
    // 2. Also send postMessage to iframe directly
    if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (e) {
        console.warn('[Blitz] postMessage error:', e);
      }
    }
  };

  const stopAllPlayback = () => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    sendYtCommand('pauseVideo');
    setIsPlayingClip(false);
    setClipCountdown(0);
  };

  const loadNextSong = async (excludeId = null) => {
    stopAllPlayback();
    setLoading(true);
    setError(null);
    setIsAnswerRevealed(false);
    setClipSeconds(5);
    setHasPlayed5s(false);
    setHasUnlocked10s(false);
    setRevealedMovieHint(false);
    setUserGuess('');
    setGuessFeedback(null);
    setShowTroubleshoot(false);

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, []);

  // Real YouTube audio controller for 5s and 10s playback
  const handlePlayAudioClip = (duration) => {
    sounds.playTick();
    stopAllPlayback();

    setClipSeconds(duration);
    if (duration === 5) {
      setHasPlayed5s(true);
    } else {
      setHasUnlocked10s(true);
    }

    setIsPlayingClip(true);
    setClipCountdown(duration);

    // Unmute, seek to start, and trigger real playback
    sendYtCommand('unMute');
    sendYtCommand('setVolume', [100]);
    sendYtCommand('seekTo', [0, true]);
    sendYtCommand('playVideo');

    let remaining = duration;
    playbackTimerRef.current = setInterval(() => {
      remaining -= 1;
      setClipCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(playbackTimerRef.current);
        sendYtCommand('pauseVideo');
        setIsPlayingClip(false);
        sounds.playTick();
      }
    }, 1000);
  };

  const handlePauseAudioClip = () => {
    stopAllPlayback();
    sounds.playTick();
  };

  const calculatePoints = () => {
    if (revealedMovieHint) return 25;
    if (hasUnlocked10s || clipSeconds === 10) return 50; // 10s clip is half points!
    return 100; // 5s is full points!
  };

  const handleCorrectGuess = () => {
    stopAllPlayback();
    sounds.playCorrect();
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });

    const points = calculatePoints();
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore(prev => prev + points);

    setGuessFeedback({
      correct: true,
      message: `🎉 Spot On! You identified "${card.song_name}" in ${clipSeconds}s! (+${points} PTS)`
    });
    setIsAnswerRevealed(true);

    if (card?.id) {
      fetch('/api/trivia/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isCorrect: true })
      }).catch(() => {});
    }
  };

  const handleWrongGuess = () => {
    sounds.playWrong();
    setStreak(0);
    setGuessFeedback({
      correct: false,
      message: `❌ Not quite! Listen again or unlock 5 more seconds (0:00 - 0:10)!`
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

    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = normalize(card.song_name);
    const cleanGuess = normalize(userGuess);

    if (cleanGuess === cleanTarget || (cleanTarget.includes(cleanGuess) && cleanGuess.length >= 4)) {
      handleCorrectGuess();
    } else {
      handleWrongGuess();
    }
  };

  return (
    <div className="audio-blitz-container animate-fade-in">
      {/* Top Banner Stats */}
      <div className="stats-bar">
        <div className="stat-pill score-pill">
          <Trophy size={16} className="text-amber-400" />
          <span>Score: <strong>{score}</strong></span>
        </div>
        <div className="stat-pill streak-pill">
          <Flame size={16} className={streak > 0 ? 'text-orange-500 animate-pulse' : 'text-zinc-500'} />
          <span>Streak: <strong>{streak}</strong></span>
        </div>
        <div className="stat-pill best-pill">
          <Clock size={16} className="text-blue-400" />
          <span>Best Streak: <strong>{bestStreak}</strong></span>
        </div>
      </div>

      {/* Playlist Selector */}
      <div className="era-filter-tabs">
        {[
          { id: 'all', label: '🔥 All-Time Hits (210 Songs)' },
          { id: '2000s', label: '🎧 2000s Nostalgia' },
          { id: '2010s', label: '✨ 2010s Chartbusters' },
          { id: '2020s', label: '🚀 2020s Reels Trends' },
          { id: '90s', label: '📼 90s Golden Era' },
          { id: 'Classics', label: '📻 Evergreen 70s-80s' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setPlaylistEra(tab.id)}
            className={`era-tab-btn ${playlistEra === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="game-loading-state">
          <div className="spinner"></div>
          <p>Tuning the audio radio clip from the 210-song catalog...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button onClick={() => loadNextSong()} className="btn btn-primary mt-2">
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {!loading && card && (
        <div className="blitz-play-area">
          {/* HIDDEN YOUTUBE AUDIO ENGINE (PLAYS AUDIO WITHOUT VIDEO VISIBLE) */}
          <div
            style={{
              position: 'fixed',
              top: '-9999px',
              left: '-9999px',
              width: '200px',
              height: '200px',
              opacity: 0.001,
              pointerEvents: 'none',
              zIndex: -1
            }}
          >
            <iframe
              id="blitz-yt-audio-iframe"
              ref={ytIframeRef}
              src={`https://www.youtube.com/embed/${card.youtube_video_id}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&autoplay=0&controls=0&disablekb=1&fs=0&rel=0`}
              title="Hidden Audio Engine"
              allow="autoplay; encrypted-media"
              width="200"
              height="200"
            />
          </div>

          {/* MYSTERY AUDIO STATION (WHEN NOT REVEALED) */}
          {!isAnswerRevealed ? (
            <div className="mystery-audio-card animate-scale-up">
              <div className="mystery-header">
                <span className="mystery-badge">
                  <Music size={14} />
                  <span>5-Second Audio Challenge</span>
                </span>
                <span className="mystery-pts">
                  Potential: <strong>+{calculatePoints()} PTS</strong>
                </span>
              </div>

              {/* Pulsing Audio Waveform Visualizer */}
              <div className={`audio-waveform-box ${isPlayingClip ? 'is-playing' : ''}`}>
                <div className="waveform-bars">
                  {[35, 75, 55, 95, 60, 85, 45, 98, 70, 50, 80, 65, 90, 45, 75, 60, 88].map((h, i) => (
                    <span
                      key={i}
                      className="wave-bar"
                      style={{
                        height: isPlayingClip ? `${Math.max(25, (h * (i % 2 === 0 ? 1.15 : 0.85)) % 100)}%` : '15%',
                        animationDelay: `${i * 0.06}s`
                      }}
                    />
                  ))}
                </div>

                <div className="audio-timer-overlay">
                  {isPlayingClip ? (
                    <div className="playing-state-tag animate-pulse">
                      <Volume2 size={24} className="text-amber-400" />
                      <span>Listening... ({clipCountdown}s left)</span>
                    </div>
                  ) : (
                    <span className="idle-state-tag">
                      {hasPlayed5s
                        ? `Paused. Press Replay or Unlock 5 More Seconds!`
                        : `Click Play to start the real 5-second music clip!`}
                    </span>
                  )}
                </div>
              </div>

              {/* REAL AUDIO CONTROLS WITH REPLAY & EXTEND */}
              <div className="clip-control-buttons">
                {/* 5-SECOND BUTTON */}
                <button
                  onClick={() => handlePlayAudioClip(5)}
                  disabled={isPlayingClip}
                  className="btn btn-primary clip-play-btn"
                >
                  {hasPlayed5s ? <RotateCcw size={18} /> : <Play size={18} />}
                  <span>
                    {hasPlayed5s
                      ? '🔁 Replay First 5s (100 Pts)'
                      : '▶️ Play First 5 Seconds (100 Pts)'}
                  </span>
                </button>

                {/* 10-SECOND BUTTON (HALF POINTS) */}
                <button
                  onClick={() => handlePlayAudioClip(10)}
                  disabled={isPlayingClip}
                  className="btn btn-secondary clip-play-btn"
                  title="Hear 0:00 - 0:10 for half points (50 Pts)"
                >
                  {hasUnlocked10s ? <RotateCcw size={18} /> : <Clock size={18} />}
                  <span>
                    {hasUnlocked10s
                      ? '🔁 Replay 10 Seconds (50 Pts)'
                      : '➕ Hear 5 More Seconds (0:00 - 0:10) [50 Pts]'}
                  </span>
                </button>

                {/* PAUSE BUTTON (ONLY VISIBLE WHILE AUDIO IS PLAYING) */}
                {isPlayingClip && (
                  <button
                    onClick={handlePauseAudioClip}
                    className="btn btn-danger clip-play-btn"
                  >
                    <Pause size={18} />
                    <span>⏸️ Stop Audio</span>
                  </button>
                )}
              </div>

              {/* Audio Troubleshooting Assistance */}
              <div className="text-center mt-2">
                <button
                  onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                  className="text-xs text-zinc-400 hover:text-amber-300 underline inline-flex items-center gap-1"
                >
                  <AlertCircle size={12} />
                  <span>Trouble hearing audio? Click here for quick fixes</span>
                </button>
              </div>

              {showTroubleshoot && (
                <div className="troubleshoot-box animate-fade-in mt-2 p-3 bg-zinc-800/80 rounded-lg text-xs text-zinc-300 border border-zinc-700">
                  <p className="font-semibold text-amber-300 mb-1">🎧 Audio Troubleshooting Tips:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Most browsers require you to click <strong>Play</strong> first before allowing audio.</li>
                    <li>Ensure your computer / tab volume is not muted.</li>
                    <li>
                      If the YouTube video is restricted by record label, you can also test with Spotify:
                      {card.spotify_track_id && (
                        <a
                          href={`https://open.spotify.com/track/${card.spotify_track_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 ml-1 underline inline-flex items-center gap-1"
                        >
                          Open in Spotify <ExternalLink size={10} />
                        </a>
                      )}
                    </li>
                  </ul>
                </div>
              )}

              {/* Optional Clue Reveal for 25 Pts */}
              {!revealedMovieHint ? (
                <div className="text-center mt-3">
                  <button
                    onClick={() => {
                      sounds.playTick();
                      setRevealedMovieHint(true);
                    }}
                    className="btn btn-ghost text-xs"
                  >
                    <HelpCircle size={14} />
                    <span>Need Help? Reveal Movie & Era Clue (25 Pts)</span>
                  </button>
                </div>
              ) : (
                <div className="movie-hint-box animate-pop mt-3">
                  <Film size={16} className="text-purple-400" />
                  <span>
                    🎬 Movie Clue: <strong>{card.movie_name}</strong> ({card.release_year}) • <em>{card.era}</em>
                  </span>
                </div>
              )}

              {/* Feedback Alert */}
              {guessFeedback && (
                <div className={`feedback-alert ${guessFeedback.correct ? 'feedback-success' : 'feedback-error'} animate-pop mt-3`}>
                  {guessFeedback.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  <span>{guessFeedback.message}</span>
                </div>
              )}

              {/* Guessing Controls */}
              <div className="guess-section mt-4">
                <div className="guess-mode-switcher">
                  <button
                    onClick={() => setModeType('multiple-choice')}
                    className={`mode-btn ${modeType === 'multiple-choice' ? 'active' : ''}`}
                  >
                    Multiple Choice (4 Songs)
                  </button>
                  <button
                    onClick={() => setModeType('type-guess')}
                    className={`mode-btn ${modeType === 'type-guess' ? 'active' : ''}`}
                  >
                    Type Song Name
                  </button>
                </div>

                {modeType === 'multiple-choice' ? (
                  <div className="options-grid">
                    {shuffledOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        className="option-card-btn"
                      >
                        <span className="option-number">{idx + 1}</span>
                        <span className="option-title">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleTextSubmit} className="text-guess-form">
                    <input
                      type="text"
                      value={userGuess}
                      onChange={e => setUserGuess(e.target.value)}
                      placeholder="Type the Bollywood song name..."
                      className="guess-input"
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary guess-submit-btn">
                      Submit Guess
                    </button>
                  </form>
                )}

                <div className="reveal-bar">
                  <button
                    onClick={() => {
                      sounds.playTick();
                      stopAllPlayback();
                      setIsAnswerRevealed(true);
                      setStreak(0);
                    }}
                    className="btn btn-ghost text-xs"
                  >
                    Give Up & Reveal Answer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* REVEALED SONG CARD WITH FULL PLAYERS & DEEP TRIVIA */
            <div className="answer-card-revealed animate-scale-up">
              <div className="answer-header">
                <div className="song-badge">🎉 5-Sec Audio Riddle Solved!</div>
                <h2 className="song-title-highlight">{card.song_name}</h2>
                <div className="movie-details">
                  <span>🎬 <strong>{card.movie_name}</strong></span>
                  <span>•</span>
                  <span>🎤 <strong>{card.artist}</strong></span>
                  <span>•</span>
                  <span>🗓️ <strong>{card.release_year}</strong></span>
                </div>
              </div>

              {/* Lyrical Riddles Decoded (Clue 1 & Clue 2 with 1:1 Hinglish Lyrics) */}
              <LyricalDecodedCard card={card} />

              {/* Deep Trivia Fun Fact */}
              {card.fun_fact && (
                <div className="trivia-fact-box mt-3">
                  <span className="fact-badge">✨ Bollywood Trivia</span>
                  <p>{card.fun_fact}</p>
                </div>
              )}

              {/* Full In-App Media Player (YouTube Video + Spotify Copyright-Free) */}
              <YouTubePlayer
                videoId={card.youtube_video_id}
                searchQuery={card.youtube_search_query}
                songName={card.song_name}
                movieName={card.movie_name}
                artist={card.artist}
                spotifyTrackId={card.spotify_track_id}
              />

              <div className="next-round-bar">
                <button
                  onClick={() => loadNextSong(card.id)}
                  className="btn btn-primary next-song-btn"
                >
                  <span>Play Next 5-Sec Song</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
