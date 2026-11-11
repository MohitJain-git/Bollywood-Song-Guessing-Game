import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2,
  XCircle, ArrowRight, Trophy, Flame, Music, Film, Clock, HelpCircle,
  VolumeX, AlertCircle, Headphones
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
  const [currentTime, setCurrentTime] = useState(0);
  const [hasPlayed5s, setHasPlayed5s] = useState(false);
  const [hasUnlocked10s, setHasUnlocked10s] = useState(false);
  const [revealedMovieHint, setRevealedMovieHint] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Audio element states
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  // Guessing
  const [userGuess, setUserGuess] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [guessFeedback, setGuessFeedback] = useState(null);
  const [modeType, setModeType] = useState('multiple-choice'); // 'multiple-choice' | 'type-guess'

  // Score
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const stopAudio = () => {
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
    setRevealedMovieHint(false);
    setUserGuess('');
    setGuessFeedback(null);
    setAudioReady(false);
    setAudioError(null);

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

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // HTML5 audio time tracking
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);

    // Auto-pause when playback reaches target clip limit (5.0s or 10.0s)
    if (curr >= clipSeconds) {
      audioRef.current.pause();
      setIsPlayingClip(false);
      sounds.playTick();
    }
  };

  const handleAudioCanPlay = () => {
    setAudioReady(true);
    setAudioError(null);
  };

  const handleAudioError = (e) => {
    console.warn('[AudioBlitz] Local clip loading error:', e);
    // Don't crash; the on-demand generator will retry
  };

  // Play audio from 0:00 up to clipSeconds
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
    if (revealedMovieHint) return 25;
    if (hasUnlocked10s || clipSeconds === 10) return 50; // 10s is half points!
    return 100; // 5s is full 100 points!
  };

  const handleCorrectGuess = () => {
    stopAudio();
    sounds.playCorrect();
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });

    const points = calculatePoints();
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore((prev) => prev + points);

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

    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
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
        ].map((tab) => (
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
          <p>Tuning the audio clip from local storage...</p>
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
          {/* NATIVE HTML5 AUDIO ELEMENT (100% RELIABLE LOCAL STORAGE STREAMING) */}
          <audio
            ref={audioRef}
            src={`/api/audio/${card.id}`}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onCanPlay={handleAudioCanPlay}
            onEnded={() => setIsPlayingClip(false)}
            onError={handleAudioError}
          />

          {/* MYSTERY AUDIO STATION (WHEN NOT REVEALED) */}
          {!isAnswerRevealed ? (
            <div className="mystery-audio-card animate-scale-up">
              <div className="mystery-header">
                <span className="mystery-badge">
                  <Headphones size={14} className="text-amber-400" />
                  <span>5-Second Audio Challenge (Local Audio Engine)</span>
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
                        height: isPlayingClip
                          ? `${Math.max(25, (h * (i % 2 === 0 ? 1.15 : 0.85)) % 100)}%`
                          : '15%',
                        animationDelay: `${i * 0.06}s`
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
                    <div className="playing-state-tag animate-pulse">
                      <Volume2 size={24} className="text-amber-400" />
                      <span>
                        Playing: <strong>{currentTime.toFixed(1)}s</strong> / {clipSeconds}s
                      </span>
                    </div>
                  ) : (
                    <span className="idle-state-tag">
                      {hasPlayed5s
                        ? `Paused at ${currentTime.toFixed(1)}s. Click Replay or Unlock 5 More Seconds!`
                        : `Click Play to start the first 5 seconds of the song!`}
                    </span>
                  )}
                </div>
              </div>

              {/* REAL AUDIO CONTROLS WITH REPLAY & EXTEND */}
              <div className="clip-control-buttons">
                {/* 5-SECOND BUTTON */}
                <button
                  onClick={() => handlePlayClip(5)}
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
                  onClick={() => handlePlayClip(10)}
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
                    onClick={handlePauseClip}
                    className="btn btn-danger clip-play-btn animate-pop"
                  >
                    <Pause size={18} />
                    <span>⏸️ Stop Audio</span>
                  </button>
                )}
              </div>

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
                      onChange={(e) => setUserGuess(e.target.value)}
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
                      stopAudio();
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

              {/* Full In-App Media Player (YouTube Official Video) */}
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
