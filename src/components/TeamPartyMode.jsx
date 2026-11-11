import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy, Clock, ArrowRight, RotateCcw, Sparkles, Check, X,
  ShieldAlert, Award, Eye, EyeOff, Search, Flame, Zap, Edit2
} from 'lucide-react';
import ClueCard from './ClueCard';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import { sounds } from './SoundEffects';

export default function TeamPartyMode() {
  const [teams, setTeams] = useState([
    { id: 'team_red', name: 'Team Sholay', color: '#e11d48', score: 0 },
    { id: 'team_blue', name: 'Team DDLJ', color: '#2563eb', score: 0 }
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [targetScore, setTargetScore] = useState(500);

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentClueLevel, setCurrentClueLevel] = useState(1);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Guessing controls for team
  const [guessStyle, setGuessStyle] = useState('type'); // 'type' | 'options' | 'host'
  const [teamGuessInput, setTeamGuessInput] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [guessFeedback, setGuessFeedback] = useState(null); // { correct: boolean, message: string }

  // Steal state
  const [isStealPhase, setIsStealPhase] = useState(false);
  const [stealInput, setStealInput] = useState('');

  // Host secret peek
  const [showHostPeek, setShowHostPeek] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(true);
  const [winnerTeam, setWinnerTeam] = useState(null);

  // Team editing
  const [editingTeamIdx, setEditingTeamIdx] = useState(null);
  const [editNameText, setEditNameText] = useState('');

  const loadNewRound = async (excludeId = null) => {
    setLoading(true);
    setIsAnswerRevealed(false);
    setCurrentClueLevel(1);
    setTimeLeft(45);
    setTimerActive(true);
    setTeamGuessInput('');
    setStealInput('');
    setIsStealPhase(false);
    setGuessFeedback(null);
    setShowHostPeek(false);

    try {
      let url = '/api/trivia/next';
      if (excludeId) url += `?excludeId=${excludeId}`;
      const res = await fetch(url);
      const data = await res.json();
      setCard(data.card);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewRound();
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (!timerActive || isAnswerRevealed || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          sounds.playBuzz();
          setTimerActive(false);
          // Auto trigger steal if not yet in steal phase
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

  const calculatePoints = () => {
    switch (currentClueLevel) {
      case 1: return 100;
      case 2: return 80;
      case 3: return 60;
      case 4: return 40;
      case 5: return 20;
      default: return 20;
    }
  };

  const calculateStealPoints = () => {
    return Math.max(30, Math.floor(calculatePoints() * 0.75));
  };

  const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const checkAnswerMatch = (guess) => {
    if (!card?.song_name) return false;
    const cleanTarget = normalize(card.song_name);
    const cleanGuess = normalize(guess);
    if (!cleanGuess) return false;
    return cleanGuess === cleanTarget || (cleanTarget.includes(cleanGuess) && cleanGuess.length >= 4);
  };

  // When active team checks answer
  const handleCheckActiveTeamGuess = (e) => {
    if (e) e.preventDefault();
    if (!teamGuessInput.trim() || isAnswerRevealed) return;

    if (checkAnswerMatch(teamGuessInput)) {
      handleTeamVictory(activeTeamIdx, calculatePoints(), `🎉 Brilliant! ${teams[activeTeamIdx].name} guessed it!`);
    } else {
      sounds.playWrong();
      handleActivateSteal(`❌ Wrong guess by ${teams[activeTeamIdx].name} ("${teamGuessInput}")!`);
    }
  };

  // When active team picks multiple-choice option
  const handleOptionPick = (option) => {
    if (isAnswerRevealed) return;
    if (option === card.song_name) {
      handleTeamVictory(activeTeamIdx, calculatePoints(), `🎉 BINGO! ${teams[activeTeamIdx].name} picked the right song!`);
    } else {
      sounds.playWrong();
      handleActivateSteal(`❌ Wrong choice by ${teams[activeTeamIdx].name}!`);
    }
  };

  // When rival team attempts steal
  const handleCheckStealGuess = (e) => {
    if (e) e.preventDefault();
    if (!stealInput.trim() || isAnswerRevealed) return;

    const rivalTeamIdx = (activeTeamIdx + 1) % teams.length;
    if (checkAnswerMatch(stealInput)) {
      handleTeamVictory(rivalTeamIdx, calculateStealPoints(), `⚡ UNBELIEVABLE STEAL by ${teams[rivalTeamIdx].name}!`);
    } else {
      sounds.playWrong();
      setGuessFeedback({
        correct: false,
        message: `❌ Steal failed! Neither team got it.`
      });
      setIsAnswerRevealed(true);
      setTimerActive(false);
    }
  };

  const handleActivateSteal = (reasonMessage) => {
    setIsStealPhase(true);
    setTimeLeft(25); // 25 seconds for steal
    setTimerActive(true);
    setGuessFeedback({
      correct: false,
      message: `${reasonMessage} Steal Opportunity for ${teams[(activeTeamIdx + 1) % teams.length].name}!`
    });
  };

  const handleTeamVictory = (awardedTeamIdx, points, message) => {
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

  const handleNextRound = () => {
    setActiveTeamIdx((activeTeamIdx + 1) % teams.length);
    setRoundNumber(prev => prev + 1);
    loadNewRound(card?.id);
  };

  const handleRestartGame = () => {
    setTeams(teams.map(t => ({ ...t, score: 0 })));
    setActiveTeamIdx(0);
    setRoundNumber(1);
    setWinnerTeam(null);
    loadNewRound();
  };

  const activeTeam = teams[activeTeamIdx];
  const rivalTeam = teams[(activeTeamIdx + 1) % teams.length];

  return (
    <div className="team-mode-container animate-fade-in">
      {/* Team Scoreboard Banner */}
      <div className="team-scores-header">
        {teams.map((t, idx) => (
          <div
            key={t.id}
            className={`team-score-card ${idx === activeTeamIdx && !winnerTeam ? 'is-turn' : ''} ${isStealPhase && idx !== activeTeamIdx ? 'is-stealing' : ''}`}
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

      {/* Team Name Edit Modal/Popover */}
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

      {/* Winner Podium Screen */}
      {winnerTeam ? (
        <div className="winner-podium animate-scale-up">
          <Trophy size={64} className="text-amber-400 trophy-bounce" />
          <h1 className="winner-title">🏆 {winnerTeam.name} Wins the Bollywood Battle!</h1>
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

            {/* Host Secret Peek Button */}
            {card && !isAnswerRevealed && (
              <button
                onClick={() => setShowHostPeek(prev => !prev)}
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

          {/* Host Secret Answer Box (for spoken verification) */}
          {showHostPeek && card && !isAnswerRevealed && (
            <div className="host-secret-drawer animate-pop">
              <span className="secret-badge">🤫 HOST PEEK (Do not show players!)</span>
              <p className="secret-text">
                Target Song: <strong>"{card.song_name}"</strong> from <em>{card.movie_name}</em>
              </p>
              <div className="secret-actions">
                <button
                  onClick={() => handleTeamVictory(activeTeamIdx, calculatePoints(), `Host marked ${activeTeam.name} correct!`)}
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

          {loading ? (
            <div className="game-loading-state">
              <div className="spinner"></div>
              <p>Preparing team Bollywood challenge...</p>
            </div>
          ) : card && (
            <div className="team-play-area">
              {/* Clues Deck */}
              <ClueCard
                card={card}
                currentClueLevel={currentClueLevel}
                onRevealNextClue={() => setCurrentClueLevel(prev => Math.min(prev + 1, 5))}
                isAnswerRevealed={isAnswerRevealed}
              />

              {/* Feedback Banner */}
              {guessFeedback && (
                <div className={`feedback-alert ${guessFeedback.correct ? 'feedback-success' : 'feedback-error'} animate-pop`}>
                  {guessFeedback.correct ? <Check size={20} /> : <X size={20} />}
                  <span>{guessFeedback.message}</span>
                </div>
              )}

              {/* ACTIVE GUESSING / CHECKING INTERACTION (WHEN NOT REVEALED) */}
              {!isAnswerRevealed ? (
                <div className="team-checking-deck animate-fade-in">
                  {/* Phase 1: Active Team's Turn */}
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

                      {/* Guess Mode Switcher for Active Team */}
                      <div className="guess-mode-switcher mt-3">
                        <button
                          onClick={() => setGuessStyle('type')}
                          className={`mode-btn ${guessStyle === 'type' ? 'active' : ''}`}
                        >
                          Type & Check Answer
                        </button>
                        <button
                          onClick={() => setGuessStyle('options')}
                          className={`mode-btn ${guessStyle === 'options' ? 'active' : ''}`}
                        >
                          Multiple Choice (4 Options)
                        </button>
                        <button
                          onClick={() => setGuessStyle('host')}
                          className={`mode-btn ${guessStyle === 'host' ? 'active' : ''}`}
                        >
                          Verbal Host Controls
                        </button>
                      </div>

                      {/* Type & Check Answer Mode */}
                      {guessStyle === 'type' && (
                        <form onSubmit={handleCheckActiveTeamGuess} className="team-guess-form mt-3">
                          <input
                            type="text"
                            value={teamGuessInput}
                            onChange={(e) => setTeamGuessInput(e.target.value)}
                            placeholder={`${activeTeam.name}, type your song guess...`}
                            className="guess-input"
                            autoFocus
                          />
                          <button type="submit" className="btn btn-primary team-check-btn">
                            <Search size={18} />
                            <span>Check Answer</span>
                          </button>
                        </form>
                      )}

                      {/* Multiple Choice Mode */}
                      {guessStyle === 'options' && (
                        <div className="options-grid mt-3">
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
                      )}

                      {/* Verbal Host Controls */}
                      {guessStyle === 'host' && (
                        <div className="verbal-controls-grid mt-3">
                          <button
                            onClick={() => handleTeamVictory(activeTeamIdx, calculatePoints(), `${activeTeam.name} got it right!`)}
                            className="btn btn-success flex-1 py-3"
                          >
                            <Check size={18} />
                            <span>{activeTeam.name} is Correct! (+{calculatePoints()} pts)</span>
                          </button>
                          <button
                            onClick={() => handleActivateSteal(`${activeTeam.name} passed/got it wrong!`)}
                            className="btn btn-warning flex-1 py-3"
                          >
                            <ShieldAlert size={18} />
                            <span>Wrong / Pass to {rivalTeam.name}</span>
                          </button>
                        </div>
                      )}

                      {/* Pass / Give Up */}
                      <div className="team-pass-row mt-3">
                        <button
                          onClick={() => handleActivateSteal(`${activeTeam.name} passed their turn!`)}
                          className="btn btn-ghost text-xs"
                        >
                          Pass to {rivalTeam.name} (Activate Steal)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Phase 2: STEAL PHASE FOR RIVAL TEAM */
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

                      <div className="team-pass-row mt-3">
                        <button
                          onClick={() => {
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
              ) : (
                /* REVEALED ANSWER & COMPREHENSIVE CLUE 1 & 2 DECODED CARD */
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

                  {/* Lyrical Riddles Decoded (Clue 1 & Clue 2 mapped to Original Hindi) */}
                  <LyricalDecodedCard card={card} />

                  {card.fun_fact && (
                    <div className="trivia-fact-box mt-3">
                      <span className="fact-badge">✨ Bollywood Trivia</span>
                      <p>{card.fun_fact}</p>
                    </div>
                  )}

                  {/* Embedded Dual Media Player (YouTube + Spotify + Local Audio) */}
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
