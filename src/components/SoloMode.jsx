import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Eye, ArrowRight, RotateCcw, CheckCircle2, XCircle, Sparkles, Trophy, Flame } from 'lucide-react';
import ClueCard from './ClueCard';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import { sounds } from './SoundEffects';

export default function SoloMode({ onOpenSettings }) {
  const [selectedEra, setSelectedEra] = useState('all');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentClueLevel, setCurrentClueLevel] = useState(1);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [guessFeedback, setGuessFeedback] = useState(null); // { correct: boolean, message: string }
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [usedMultipleChoice, setUsedMultipleChoice] = useState(false); // Multiple Choice as Hint (Halves points)

  // Score state
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Load new card
  const loadNextCard = async (excludeId = null) => {
    setLoading(true);
    setError(null);
    setIsAnswerRevealed(false);
    setCurrentClueLevel(1);
    setUserGuess('');
    setGuessFeedback(null);
    setUsedMultipleChoice(false);

    try {
      let url = `/api/trivia/next?era=${selectedEra}`;
      if (excludeId) url += `&excludeId=${excludeId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load Bollywood song');
      const data = await res.json();
      setCard(data.card);

      // Prepare multiple choice options
      if (data.card) {
        const options = [
          data.card.song_name,
          ...(Array.isArray(data.card.distractors) ? data.card.distractors : [])
        ];
        // Shuffle options
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

  useEffect(() => {
    loadNextCard();
  }, [selectedEra]);

  const handleRevealNextClue = () => {
    if (currentClueLevel < 5) {
      sounds.playTick();
      setCurrentClueLevel(prev => prev + 1);
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
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore(prev => prev + pointsEarned);

    setGuessFeedback({
      correct: true,
      message: `🎉 Kya Baat Hai! Correct! +${pointsEarned} points!`
    });
    setIsAnswerRevealed(true);
    setCurrentClueLevel(5);

    // Record in DB
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
      message: '❌ Not quite! Check another clue or try again!'
    });
  };

  const handleOptionClick = (option) => {
    if (isAnswerRevealed) return;
    if (option === card.song_name) {
      handleCorrectGuess(calculatePoints());
    } else {
      handleWrongGuess();
    }
  };

  const handleTextGuessSubmit = (e) => {
    e.preventDefault();
    if (!userGuess.trim() || isAnswerRevealed) return;

    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = normalize(card.song_name);
    const cleanGuess = normalize(userGuess);

    // Exact or near match
    if (cleanGuess === cleanTarget || cleanTarget.includes(cleanGuess) && cleanGuess.length > 4) {
      handleCorrectGuess(calculatePoints());
    } else {
      handleWrongGuess();
    }
  };

  const handleDirectReveal = () => {
    sounds.playTick();
    setIsAnswerRevealed(true);
    setCurrentClueLevel(5);
    setStreak(0);
    setGuessFeedback({
      correct: false,
      message: `Revealed! The song is "${card.song_name}"`
    });

    if (card?.id) {
      fetch('/api/trivia/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isCorrect: false })
      }).catch(() => {});
    }
  };

  return (
    <div className="solo-container">
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
        {bestStreak > 0 && (
          <div className="stat-pill best-pill">
            <span>Best: <strong>{bestStreak}</strong></span>
          </div>
        )}
      </div>

      {/* Era Selector Filter */}
      <div className="era-filter-tabs">
        {[
          { id: 'all', label: '🌟 All Eras' },
          { id: '2000s', label: '🎧 2000s Golden' },
          { id: '2010s', label: '🔥 2010s Hits' },
          { id: '2020s', label: '✨ 2020s Trending' },
          { id: '90s', label: '📼 90s Nostalgia' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedEra(tab.id)}
            className={`era-tab-btn ${selectedEra === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card Loading / Error */}
      {loading && (
        <div className="game-loading-state">
          <div className="spinner"></div>
          <p>🎧 Finding the next Bollywood lyrical puzzle...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button onClick={() => loadNextCard()} className="btn btn-primary mt-2">
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Main Game Screen */}
      {!loading && card && (
        <div className="game-play-area">
          {/* Lyrical Clues */}
          <ClueCard
            card={card}
            currentClueLevel={currentClueLevel}
            onRevealNextClue={handleRevealNextClue}
            isAnswerRevealed={isAnswerRevealed}
          />

          {/* Feedback Banner */}
          {guessFeedback && (
            <div className={`feedback-alert ${guessFeedback.correct ? 'feedback-success' : 'feedback-error'} animate-pop`}>
              {guessFeedback.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <span>{guessFeedback.message}</span>
            </div>
          )}

          {/* Interactive Guessing Controls: Type for Full Points OR Reveal Choices as Hint for Half Points */}
          {!isAnswerRevealed ? (
            <div className="guess-section animate-fade-in">
              <form onSubmit={handleTextGuessSubmit} className="text-guess-form">
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  placeholder={
                    usedMultipleChoice
                      ? `Type song name or pick from choices below (+${calculatePoints()} PTS)...`
                      : `Type song name for FULL POINTS (+${calculatePoints()} PTS)...`
                  }
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
                      setUsedMultipleChoice(true);
                    }}
                    className="btn-hint-outline"
                  >
                    <Sparkles size={16} />
                    <span>💡 Need a hint? Reveal 4 Choices (Half Points: {Math.floor(calculatePoints() / 2)} PTS)</span>
                  </button>
                </div>
              ) : (
                <div className="open-choices-section animate-scale-up mt-3">
                  <div className="open-choices-header">
                    <span className="open-choices-title">
                      🎯 Multiple Choice Hint Active — Pick your song for {calculatePoints()} PTS:
                    </span>
                  </div>

                  <div className="options-grid">
                    {shuffledOptions.map((option, idx) => (
                      <button
                        key={idx}
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
                  onClick={handleDirectReveal}
                  className="btn btn-ghost"
                >
                  <Eye size={16} />
                  <span>Give Up & Reveal Answer</span>
                </button>
              </div>
            </div>
          ) : (
            /* REVEALED ANSWER & YOUTUBE PLAYER */
            <div className="answer-card-revealed animate-scale-up">
              <div className="answer-header">
                <div className="song-badge">🎉 Target Bollywood Track</div>
                <h2 className="song-title-highlight">{card.song_name}</h2>
                <div className="movie-details">
                  <span>🎬 <strong>{card.movie_name}</strong></span>
                  <span>•</span>
                  <span>🎤 <strong>{card.artist}</strong></span>
                  <span>•</span>
                  <span>🗓️ <strong>{card.release_year}</strong></span>
                </div>
              </div>

              {/* Lyrical Riddles Decoded (Clue 1 & Clue 2 mapped to Hindi) */}
              <LyricalDecodedCard card={card} />

              {card.fun_fact && (
                <div className="trivia-fact-box">
                  <span className="fact-badge">✨ Bollywood Trivia Fact</span>
                  <p>{card.fun_fact}</p>
                </div>
              )}

              {/* In-App Dual Media Player (YouTube + Spotify + Local Audio) */}
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
                  onClick={() => loadNextCard(card.id)}
                  className="btn btn-primary next-song-btn"
                >
                  <span>Play Next Bollywood Song</span>
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
