import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy, Clock, ArrowRight, RotateCcw, Sparkles, Check, X,
  ShieldAlert, Award, Eye, EyeOff, Search, Flame, Zap, Edit2
} from 'lucide-react';
import ClueCard from './ClueCard';
import YouTubePlayer from './YouTubePlayer';
import LyricalDecodedCard from './LyricalDecodedCard';
import AudioBlitzTeamMode from './AudioBlitzTeamMode';
import { sounds } from './SoundEffects';
import {
  matchBollywoodSongGuess,
  triggerViewTransition,
  loadSessionState,
  saveSessionState
} from '../utils/gameTech';

const TEAM_LYRICAL_STORAGE_KEY = 'bolly_team_lyrical_session_v1';

export default function TeamPartyMode() {
  const initialSession = loadSessionState(TEAM_LYRICAL_STORAGE_KEY, {
    teamBattleType: 'lyrical',
    teams: [
      { id: 'team_red', name: 'Team Sholay', color: '#e11d48', score: 0 },
      { id: 'team_blue', name: 'Team DDLJ', color: '#2563eb', score: 0 }
    ],
    activeTeamIdx: 0,
    roundNumber: 1,
    targetScore: 500,
    card: null,
    currentClueLevel: 1,
    isAnswerRevealed: false,
    guessStyle: 'type',
    usedMultipleChoice: false,
    teamGuessInput: '',
    shuffledOptions: [],
    guessFeedback: null,
    isStealPhase: false,
    stealInput: '',
    smartHint: null,
    timeLeft: 45,
    timerEnabled: true,
    winnerTeam: null,
    playedIds: []
  });

  const [teamBattleType, setTeamBattleType] = useState(initialSession.teamBattleType || 'lyrical'); // 'lyrical' | 'blitz'
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
  const [targetScore, setTargetScore] = useState(Number(initialSession.targetScore) || 500);

  const [card, setCard] = useState(initialSession.card || null);
  const [loading, setLoading] = useState(!initialSession.card);
  const [currentClueLevel, setCurrentClueLevel] = useState(initialSession.currentClueLevel || 1);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(Boolean(initialSession.isAnswerRevealed));

  // Guessing controls for team
  const [guessStyle, setGuessStyle] = useState(initialSession.guessStyle || 'type'); // 'type' | 'host'
  const [usedMultipleChoice, setUsedMultipleChoice] = useState(Boolean(initialSession.usedMultipleChoice));
  const [teamGuessInput, setTeamGuessInput] = useState(initialSession.teamGuessInput || '');
  const [shuffledOptions, setShuffledOptions] = useState(
    Array.isArray(initialSession.shuffledOptions) ? initialSession.shuffledOptions : []
  );
  const [guessFeedback, setGuessFeedback] = useState(initialSession.guessFeedback || null);

  // Steal state
  const [isStealPhase, setIsStealPhase] = useState(Boolean(initialSession.isStealPhase));
  const [stealInput, setStealInput] = useState(initialSession.stealInput || '');

  // Host secret peek & Smart Hint
  const [showHostPeek, setShowHostPeek] = useState(false);
  const [smartHint, setSmartHint] = useState(initialSession.smartHint || null);
  const [loadingSmartHint, setLoadingSmartHint] = useState(false);

  // Timer & Session History
  const [timerEnabled, setTimerEnabled] = useState(
    initialSession.timerEnabled !== undefined ? Boolean(initialSession.timerEnabled) : true
  );
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

  // Team editing
  const [editingTeamIdx, setEditingTeamIdx] = useState(null);
  const [editNameText, setEditNameText] = useState('');

  // Persist session state across browser reloads
  useEffect(() => {
    saveSessionState(TEAM_LYRICAL_STORAGE_KEY, {
      teamBattleType,
      teams,
      activeTeamIdx,
      roundNumber,
      targetScore,
      card,
      currentClueLevel,
      isAnswerRevealed,
      guessStyle,
      usedMultipleChoice,
      teamGuessInput,
      shuffledOptions,
      guessFeedback,
      isStealPhase,
      stealInput,
      smartHint,
      timeLeft,
      timerEnabled,
      winnerTeam,
      playedIds
    });
  }, [
    teamBattleType,
    teams,
    activeTeamIdx,
    roundNumber,
    targetScore,
    card,
    currentClueLevel,
    isAnswerRevealed,
    guessStyle,
    usedMultipleChoice,
    teamGuessInput,
    shuffledOptions,
    guessFeedback,
    isStealPhase,
    stealInput,
    smartHint,
    timeLeft,
    timerEnabled,
    winnerTeam,
    playedIds
  ]);

  const loadNewRound = async (excludeId = null) => {
    setLoading(true);
    setIsAnswerRevealed(false);
    setCurrentClueLevel(1);
    setTimeLeft(45);
    setTimerActive(true);
    setTeamGuessInput('');
    setStealInput('');
    setIsStealPhase(false);
    setUsedMultipleChoice(false);
    setGuessFeedback(null);
    setShowHostPeek(false);
    setSmartHint(null);

    try {
      const params = [];
      if (excludeId) params.push(`excludeId=${excludeId}`);
      const recentExcluded = playedIds.slice(-120);
      if (recentExcluded.length > 0) params.push(`excludeIds=${recentExcluded.join(',')}`);
      const url = `/api/trivia/next${params.length > 0 ? `?${params.join('&')}` : ''}`;
      const res = await fetch(url);
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
    if (!card) {
      loadNewRound();
    }
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (!timerEnabled || !timerActive || isAnswerRevealed || timeLeft <= 0) return;
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
  }, [timerEnabled, timerActive, isAnswerRevealed, timeLeft, isStealPhase]);

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
    if (smartHint) {
      base = Math.max(10, base - 30);
    }
    if (usedMultipleChoice) {
      return Math.max(5, Math.floor(base / 2)); // Halve points if multiple choice hint used
    }
    return base;
  };

  const calculateStealPoints = () => {
    return Math.max(20, Math.floor(calculatePoints() * 0.75));
  };

  const checkAnswerMatch = (guess) => {
    if (!card?.song_name) return false;
    return matchBollywoodSongGuess(guess, card.song_name).isMatch;
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
    sounds.playTick();
    setTeams(teams.map(t => ({ ...t, score: 0 })));
    setActiveTeamIdx(0);
    setRoundNumber(1);
    setWinnerTeam(null);
    setPlayedIds([]);
    loadNewRound(card?.id);
  };

  const activeTeam = teams[activeTeamIdx];
  const rivalTeam = teams[(activeTeamIdx + 1) % teams.length];

  return (
    <div className="team-mode-container animate-fade-in">
      {/* Team Battle Game Type Switcher */}
      <div className="guess-mode-switcher mb-4">
        <button
          type="button"
          onClick={() => {
            sounds.playTick();
            triggerViewTransition(() => setTeamBattleType('lyrical'));
          }}
          className={`mode-btn ${teamBattleType === 'lyrical' ? 'active' : ''}`}
        >
          📜 Lyrical Riddles Team Battle
        </button>
        <button
          type="button"
          onClick={() => {
            sounds.playTick();
            triggerViewTransition(() => setTeamBattleType('blitz'));
          }}
          className={`mode-btn ${teamBattleType === 'blitz' ? 'active' : ''}`}
        >
          ⚡ 5-Sec Audio Blitz Team Battle
        </button>
      </div>

      {teamBattleType === 'blitz' ? (
        <AudioBlitzTeamMode />
      ) : (
        <>
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

            <div className="flex items-center gap-2">
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

              <button
                type="button"
                onClick={handleRestartGame}
                className="host-peek-btn"
                title="Reset team scores and start a fresh match"
              >
                <RotateCcw size={14} />
                <span>Reset Game</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playTick();
                  setTimerEnabled(prev => !prev);
                }}
                className={`timer-toggle-btn ${
                  timerEnabled ? (timeLeft <= 10 ? 'timer-warning' : 'timer-on') : 'timer-off'
                }`}
                title="Toggle optional round countdown timer ON/OFF"
              >
                <Clock size={15} />
                <span>{timerEnabled ? `${timeLeft}s` : 'Timer Off'}</span>
                <span className="timer-state-pill">{timerEnabled ? 'ON' : 'OFF'}</span>
              </button>
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
                smartHint={smartHint}
                onRequestSmartHint={handleRequestSmartHint}
                loadingSmartHint={loadingSmartHint}
                usedMultipleChoice={usedMultipleChoice}
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
                          ⌨️ Team Guess Input
                        </button>
                        <button
                          onClick={() => setGuessStyle('host')}
                          className={`mode-btn ${guessStyle === 'host' ? 'active' : ''}`}
                        >
                          🎤 Verbal Host Controls
                        </button>
                      </div>

                      {/* Type & Check Answer Mode */}
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
                                  : `${activeTeam.name}, type for FULL POINTS (+${calculatePoints()} PTS)...`
                              }
                              className="guess-input"
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary team-check-btn">
                              <Search size={18} />
                              <span>Check ({calculatePoints()} Pts)</span>
                            </button>
                          </form>

                          {/* Multiple Choice as Hint (Halves Points) - mutually exclusive with Word Pattern Clue */}
                          {!usedMultipleChoice ? (
                            !smartHint && (
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
                                  <span>💡 Need Choices? Reveal 4 Options (Multiple Choice Hint — Half Points: {Math.floor(calculatePoints() / 2)} PTS)</span>
                                </button>
                              </div>
                            )
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

                      {usedMultipleChoice && (
                        <div className="options-grid mt-3">
                          {shuffledOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (opt === card.song_name) {
                                  handleTeamVictory(1 - activeTeamIdx, calculateStealPoints(), `🔥 INCREDIBLE STEAL! ${rivalTeam.name} stole it!`);
                                } else {
                                  sounds.playWrong();
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
        </>
      )}
    </div>
  );
}
