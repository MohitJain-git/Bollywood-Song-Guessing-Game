import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Eye, ArrowRight, RotateCcw, CheckCircle2, XCircle,
  Sparkles, Trophy, Flame, AlertTriangle, Film, Mic2, Calendar, Disc
} from 'lucide-react';
import ClueCard from './ClueCard';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import { sounds } from './SoundEffects';
import {
  ERA_THEMES,
  applyEraTheme,
  matchBollywoodSongGuess,
  triggerViewTransition,
  loadSessionState,
  saveSessionState
} from '../utils/gameTech';

const SOLO_STORAGE_KEY = 'bolly_solo_session_v1';

export default function SoloMode({ onOpenSettings }) {
  const initialSession = loadSessionState(SOLO_STORAGE_KEY, {
    selectedEra: 'all',
    card: null,
    currentClueLevel: 1,
    isAnswerRevealed: false,
    userGuess: '',
    guessFeedback: null,
    shuffledOptions: [],
    usedMultipleChoice: false,
    smartHint: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    playedIds: []
  });

  const [selectedEra, setSelectedEra] = useState(initialSession.selectedEra || 'all');
  const [card, setCard] = useState(initialSession.card || null);
  const [loading, setLoading] = useState(!initialSession.card);
  const [error, setError] = useState(null);

  const [currentClueLevel, setCurrentClueLevel] = useState(initialSession.currentClueLevel || 1);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(Boolean(initialSession.isAnswerRevealed));
  const [userGuess, setUserGuess] = useState(initialSession.userGuess || '');
  const [guessFeedback, setGuessFeedback] = useState(initialSession.guessFeedback || null);
  const [shuffledOptions, setShuffledOptions] = useState(
    Array.isArray(initialSession.shuffledOptions) ? initialSession.shuffledOptions : []
  );
  const [usedMultipleChoice, setUsedMultipleChoice] = useState(Boolean(initialSession.usedMultipleChoice));

  // AI Smart Hint / Shayari Decoder
  const [smartHint, setSmartHint] = useState(initialSession.smartHint || null);
  const [loadingSmartHint, setLoadingSmartHint] = useState(false);

  // Score & Session History state
  const [score, setScore] = useState(Number(initialSession.score) || 0);
  const [streak, setStreak] = useState(Number(initialSession.streak) || 0);
  const [bestStreak, setBestStreak] = useState(Number(initialSession.bestStreak) || 0);
  const [playedIds, setPlayedIds] = useState(
    Array.isArray(initialSession.playedIds) ? initialSession.playedIds : []
  );

  // Apply dynamic era color theme
  useEffect(() => {
    applyEraTheme(selectedEra);
  }, [selectedEra]);

  // Persist session state across browser reloads
  useEffect(() => {
    saveSessionState(SOLO_STORAGE_KEY, {
      selectedEra,
      card,
      currentClueLevel,
      isAnswerRevealed,
      userGuess,
      guessFeedback,
      shuffledOptions,
      usedMultipleChoice,
      smartHint,
      score,
      streak,
      bestStreak,
      playedIds
    });
  }, [
    selectedEra,
    card,
    currentClueLevel,
    isAnswerRevealed,
    userGuess,
    guessFeedback,
    shuffledOptions,
    usedMultipleChoice,
    smartHint,
    score,
    streak,
    bestStreak,
    playedIds
  ]);

  // Load new card
  const loadNextCard = async (excludeId = null, eraOverride = null) => {
    const activeEra = eraOverride || selectedEra;
    setLoading(true);
    setError(null);
    setIsAnswerRevealed(false);
    setCurrentClueLevel(1);
    setUserGuess('');
    setGuessFeedback(null);
    setUsedMultipleChoice(false);
    setSmartHint(null);

    try {
      let url = `/api/trivia/next?era=${activeEra}`;
      if (excludeId) url += `&excludeId=${excludeId}`;
      const recentExcluded = playedIds.slice(-120);
      if (recentExcluded.length > 0) {
        url += `&excludeIds=${recentExcluded.join(',')}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load Bollywood song');
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
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only fetch on initial mount if there was no saved card in session
  useEffect(() => {
    if (!card) {
      loadNextCard();
    }
  }, []);

  const handleRequestSmartHint = async () => {
    if (!card?.id || smartHint || loadingSmartHint) return;
    sounds.playTick();
    setLoadingSmartHint(true);
    try {
      const res = await fetch(`/api/trivia/smart-hint/${card.id}`);
      if (res.ok) {
        const data = await res.json();
        triggerViewTransition(() => {
          setSmartHint(data.hint);
        });
      }
    } catch (e) {
      console.warn('Smart hint fetch failed:', e);
    } finally {
      setLoadingSmartHint(false);
    }
  };

  const handleRevealNextClue = () => {
    if (currentClueLevel < 5) {
      sounds.playTick();
      triggerViewTransition(() => {
        setCurrentClueLevel((prev) => prev + 1);
      });
    }
  };

  const calculatePoints = () => {
    let base = 20;
    switch (currentClueLevel) {
      case 1: base = 100; break;
      case 2: base = 80; break;
      case 3: base = 60; break;
      case 4: base = 40; break;
      case 5: base = 20; break;
      default: base = 20;
    }
    if (usedMultipleChoice) {
      return Math.floor(base / 2);
    }
    return base;
  };

  const handleCorrectGuess = (pointsEarned) => {
    sounds.playCorrect();
    confetti({
      particleCount: 95,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f43f5e', '#34d399', '#c084fc']
    });

    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore((prev) => prev + pointsEarned);

    triggerViewTransition(() => {
      setGuessFeedback({
        status: 'correct',
        message: `🎉 Kya Baat Hai! Spot on! +${pointsEarned} PTS added to your score!`
      });
      setIsAnswerRevealed(true);
      setCurrentClueLevel(5);
    }, '#revealed-song-heading');

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
      message: '🔥 Bohot Kareeb! You are just a couple letters off — check your spelling and hit Submit!'
    });
  };

  const handleWrongGuess = () => {
    sounds.playWrong();
    setStreak(0);
    setGuessFeedback({
      status: 'wrong',
      message: '❌ Not quite! Unlock the next clue, decode the word pattern, or try again!'
    });
  };

  const handleOptionClick = (option) => {
    if (isAnswerRevealed) return;
    if (option === card.song_name) {
      handleCorrectGuess(calculatePoints());
    } else {
      sounds.playWrong();
      setStreak(0);
      triggerViewTransition(() => {
        setIsAnswerRevealed(true);
        setCurrentClueLevel(5);
        setGuessFeedback({
          status: 'wrong',
          message: `❌ Wrong multiple-choice pick ("${option}")! 0 PTS awarded — the track was "${card.song_name}".`
        });
      }, '#revealed-song-heading');

      if (card?.id) {
        fetch('/api/trivia/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, isCorrect: false })
        }).catch(() => {});
      }
    }
  };

  const handleTextGuessSubmit = (e) => {
    e.preventDefault();
    if (!userGuess.trim() || isAnswerRevealed) return;

    const result = matchBollywoodSongGuess(userGuess, card.song_name);
    if (result.isMatch) {
      handleCorrectGuess(calculatePoints());
    } else if (result.isClose) {
      handleCloseGuess();
    } else {
      handleWrongGuess();
    }
  };

  const handleDirectReveal = () => {
    sounds.playTick();
    triggerViewTransition(() => {
      setIsAnswerRevealed(true);
      setCurrentClueLevel(5);
      setStreak(0);
      setGuessFeedback({
        status: 'wrong',
        message: `Curtain raised! The track is "${card.song_name}"`
      });
    }, '#revealed-song-heading');

    if (card?.id) {
      fetch('/api/trivia/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isCorrect: false })
      }).catch(() => {});
    }
  };

  const activeEraMeta = ERA_THEMES[selectedEra] || ERA_THEMES.all;

  return (
    <div className="solo-container">
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
        {bestStreak > 0 && (
          <div className="stat-pill best-pill">
            <span>Best: <strong>{bestStreak}</strong></span>
          </div>
        )}
      </div>

      {/* Era Selector Filter with Ambient Theme Shifting */}
      <div className="era-selector-block">
        <div className="era-filter-tabs" role="tablist" aria-label="Filter songs by Bollywood era">
          {[
            { id: 'all', label: '🌟 All Eras' },
            { id: 'Classics', label: '📻 Classics' },
            { id: '90s', label: '📼 90s Nostalgia' },
            { id: '2000s', label: '🎧 2000s Golden' },
            { id: '2010s', label: '🔥 2010s Hits' },
            { id: '2020s', label: '✨ 2020s Trending' }
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selectedEra === tab.id}
              onClick={() => {
                if (selectedEra === tab.id) return;
                sounds.playTick();
                triggerViewTransition(() => {
                  setSelectedEra(tab.id);
                  loadNextCard(card?.id, tab.id);
                });
              }}
              className={`era-tab-btn ${selectedEra === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="era-tagline">{activeEraMeta.tagline}</p>
      </div>

      {/* Card Loading / Error */}
      {loading && (
        <div className="game-loading-state">
          <div className="spinner"></div>
          <p>🎧 Curating your next Bollywood lyrical riddle...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button onClick={() => loadNextCard()} className="btn btn-primary mt-2">
            <RotateCcw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Main Game Screen */}
      {!loading && card && (
        <div className="game-play-area">
          {/* Lyrical Clues & AI Shayari Decoder */}
          <ClueCard
            card={card}
            currentClueLevel={currentClueLevel}
            onRevealNextClue={handleRevealNextClue}
            isAnswerRevealed={isAnswerRevealed}
            smartHint={smartHint}
            onRequestSmartHint={handleRequestSmartHint}
            loadingSmartHint={loadingSmartHint}
          />

          {/* Accessible Feedback Banner (Uses Icon + Text + Color per WCAG 1.4.1) */}
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
              } animate-pop`}
            >
              {guessFeedback.status === 'correct' && <CheckCircle2 size={20} aria-hidden="true" />}
              {guessFeedback.status === 'close' && <AlertTriangle size={20} aria-hidden="true" />}
              {guessFeedback.status === 'wrong' && <XCircle size={20} aria-hidden="true" />}
              <span>{guessFeedback.message}</span>
            </div>
          )}

          {/* Interactive Guessing Controls */}
          {!isAnswerRevealed ? (
            <div className="guess-section clue-entry-anim">
              <form onSubmit={handleTextGuessSubmit} className="text-guess-form">
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  placeholder={
                    usedMultipleChoice
                      ? `Type song title or choose below (+${calculatePoints()} PTS)...`
                      : `Type Bollywood song title for FULL POINTS (+${calculatePoints()} PTS)...`
                  }
                  aria-label="Type your Bollywood song guess"
                  className="guess-input"
                  autoFocus
                />
                <button type="submit" className="btn btn-primary guess-submit-btn">
                  Submit ({calculatePoints()} Pts)
                </button>
              </form>

              {/* Multiple Choice as Hint (Halves Points) */}
              {!usedMultipleChoice ? (
                <div className="mc-hint-box text-center">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTick();
                      triggerViewTransition(() => setUsedMultipleChoice(true));
                    }}
                    className="btn-hint-outline"
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    <span>💡 Need Options? Reveal 4 Multiple-Choice Options (Half Points: {Math.floor(calculatePoints() / 2)} PTS)</span>
                  </button>
                </div>
              ) : (
                <div className="open-choices-section clue-entry-anim mt-3">
                  <div className="open-choices-header">
                    <span className="open-choices-title">
                      🎯 Multiple Choice Lifeline Active — Select the right track for {calculatePoints()} PTS:
                    </span>
                  </div>

                  <div className="options-grid">
                    {shuffledOptions.map((option, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOptionClick(option)}
                        className="option-card-btn"
                      >
                        <span className="option-number">{idx + 1}</span>
                        <span className="option-title">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reveal answer button */}
              <div className="reveal-bar">
                <button
                  type="button"
                  onClick={handleDirectReveal}
                  className="btn btn-ghost"
                >
                  <Eye size={16} aria-hidden="true" />
                  <span>Give Up & Reveal Song</span>
                </button>
              </div>
            </div>
          ) : (
            /* REVEALED ANSWER & YOUTUBE PLAYER */
            <div className="answer-card-revealed clue-entry-anim">
              <div className="answer-header">
                <div className="song-badge">
                  {guessFeedback?.status === 'correct'
                    ? '🎉 Bollywood Track Solved!'
                    : '🎵 Bollywood Track Revealed (0 PTS)'}
                </div>
                <h2
                  id="revealed-song-heading"
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
                  {card.era && (
                    <>
                      <span>•</span>
                      <span><Disc size={14} className="inline mr-1 text-rose-400" aria-hidden="true" /><em>{card.era}</em></span>
                    </>
                  )}
                </div>
              </div>

              {/* Lyrical Riddles Decoded (Clue 1 & Clue 2 mapped 1:1 to Hindi) */}
              <LyricalDecodedCard card={card} />

              {card.fun_fact && (
                <div className="trivia-fact-box">
                  <span className="fact-badge">✨ Behind-the-Scenes Trivia</span>
                  <p>{card.fun_fact}</p>
                </div>
              )}

              {/* In-App Dual Media Player */}
              <YouTubePlayer
                videoId={card.youtube_video_id}
                searchQuery={card.youtube_search_query}
                songName={card.song_name}
                movieName={card.movie_name}
                artist={card.artist}
                spotifyTrackId={card.spotify_track_id}
                cardId={card.id}
              />

              {/* Next Round Action */}
              <div className="next-round-bar">
                <button
                  type="button"
                  onClick={() => loadNextCard(card.id)}
                  className="btn btn-primary next-song-btn"
                >
                  <span>Play Next Bollywood Song</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
