import React from 'react';
import { Sparkles, Film, Music, ChevronDown, BookOpen, Compass, KeyRound } from 'lucide-react';

const CLUE_STEPS = [
  { level: 1, label: 'Hook Riddle', pts: 100 },
  { level: 2, label: 'Verse Riddle', pts: 80 },
  { level: 3, label: 'Cinema Frame', pts: 60 },
  { level: 4, label: 'Maestro & Era', pts: 40 },
  { level: 5, label: 'Hinglish Lyrics', pts: 20 }
];

export default function ClueCard({
  card,
  currentClueLevel,
  onRevealNextClue,
  isAnswerRevealed,
  smartHint,
  onRequestSmartHint,
  loadingSmartHint
}) {
  if (!card) return null;

  return (
    <div className="clue-deck">
      {/* Interactive 5-Stage Clue Progression Track */}
      <div className="clue-stepper" role="region" aria-label="Clue progression steps">
        {CLUE_STEPS.map((step) => {
          const isUnlocked = currentClueLevel >= step.level;
          const isCurrent = currentClueLevel === step.level;
          return (
            <div
              key={step.level}
              className={`stepper-node ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
            >
              <span className="stepper-num">{step.level}</span>
              <div className="stepper-meta">
                <span className="stepper-label">{step.label}</span>
                <span className="stepper-pts">{step.pts} PTS</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clue 1: English Riddle (Chorus / Mukhda) */}
      <div className="clue-box primary-clue clue-entry-anim">
        <div className="clue-header">
          <span className="clue-badge gold">
            <Sparkles size={14} aria-hidden="true" />
            <span>Clue 1 • The Hook in English (Mukhda)</span>
          </span>
          <span className="clue-pts-pill gold-pill">100 PTS</span>
        </div>
        <blockquote className="clue-text-riddle">
          “{card.english_riddle_1}”
        </blockquote>
        <div className="clue-subtle-caption">
          <span>✨ 1:1 Poetic English translation of the iconic opening chorus</span>
        </div>
      </div>

      {/* Clue 2: English Verse (Antara) */}
      {currentClueLevel >= 2 && card.english_riddle_2 && (
        <div className="clue-box secondary-clue clue-entry-anim">
          <div className="clue-header">
            <span className="clue-badge blue">
              <BookOpen size={14} aria-hidden="true" />
              <span>Clue 2 • The Verse in English (Antara)</span>
            </span>
            <span className="clue-pts-pill blue-pill">80 PTS</span>
          </div>
          <blockquote className="clue-text-riddle">
            “{card.english_riddle_2}”
          </blockquote>
        </div>
      )}

      {/* Clue 3: Actor & Visual Clue */}
      {currentClueLevel >= 3 && card.actor_visual_clue && (
        <div className="clue-box visual-clue clue-entry-anim">
          <div className="clue-header">
            <span className="clue-badge purple">
              <Film size={14} aria-hidden="true" />
              <span>Clue 3 • Iconic Screen Frame & Choreography</span>
            </span>
            <span className="clue-pts-pill purple-pill">60 PTS</span>
          </div>
          <p className="clue-text-body">{card.actor_visual_clue}</p>
        </div>
      )}

      {/* Clue 4: Music Director & Era */}
      {currentClueLevel >= 4 && (card.music_director_clue || card.release_year) && (
        <div className="clue-box music-clue clue-entry-anim">
          <div className="clue-header">
            <span className="clue-badge amber">
              <Music size={14} aria-hidden="true" />
              <span>Clue 4 • Maestro, Instrumentation & Era</span>
            </span>
            <span className="clue-pts-pill amber-pill">40 PTS</span>
          </div>
          <p className="clue-text-body">
            {card.music_director_clue || `Released in ${card.release_year}.`}
            {card.era && <span className="era-tag"> • {card.era}</span>}
          </p>
        </div>
      )}

      {/* Clue 5: Romanized Hinglish Lyrics */}
      {currentClueLevel >= 5 && card.hinglish_lyrics_1 && (
        <div className="clue-box hindi-clue clue-entry-anim">
          <div className="clue-header">
            <span className="clue-badge emerald">
              <span aria-hidden="true">🇮🇳</span>
              <span>Clue 5 • Original Romanized Hindi Lyrics</span>
            </span>
            <span className="clue-pts-pill emerald-pill">20 PTS</span>
          </div>
          <p className="clue-text-hinglish">“{card.hinglish_lyrics_1}”</p>
          {card.hinglish_lyrics_2 && (
            <p className="clue-text-hinglish secondary">“{card.hinglish_lyrics_2}”</p>
          )}
        </div>
      )}

      {/* AI Shayari Metaphor Decoder & Word-Pattern Panel */}
      {smartHint && !isAnswerRevealed && (
        <div className="smart-decoder-card clue-entry-anim">
          <div className="decoder-header">
            <span className="decoder-badge">
              <Compass size={14} aria-hidden="true" />
              <span>AI Shayari Decoder & Word Pattern</span>
            </span>
            <span className="decoder-meta">
              {smartHint.wordCount} {smartHint.wordCount === 1 ? 'Word' : 'Words'} ({smartHint.letterCounts?.join(', ')} letters)
            </span>
          </div>

          <div className="title-mask-display" aria-label="Song title letter pattern">
            {smartHint.titleMask}
          </div>

          {smartHint.poeticNudge && (
            <p className="decoder-nudge">💡 {smartHint.poeticNudge}</p>
          )}

          {Array.isArray(smartHint.glossary) && smartHint.glossary.length > 0 && (
            <div className="glossary-pills">
              {smartHint.glossary.map((item, idx) => (
                <div key={idx} className="glossary-chip">
                  <span className="glossary-hindi">{item.word}</span>
                  <span className="glossary-sep">→</span>
                  <span className="glossary-meaning">{item.meaning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Next Clue & Decoder Action Bar */}
      {!isAnswerRevealed && (
        <div className="clue-action-bar">
          {currentClueLevel < 5 && (
            <button
              type="button"
              onClick={onRevealNextClue}
              className="btn btn-secondary reveal-clue-btn"
            >
              <ChevronDown size={18} aria-hidden="true" />
              <span>
                Unlock Clue {currentClueLevel + 1}{' '}
                {currentClueLevel === 1 && '• Verse in English (80 Pts)'}
                {currentClueLevel === 2 && '• Cinema Frame & Stars (60 Pts)'}
                {currentClueLevel === 3 && '• Maestro & Era (40 Pts)'}
                {currentClueLevel === 4 && '• Original Hinglish Lyrics (20 Pts)'}
              </span>
            </button>
          )}

          {!smartHint && onRequestSmartHint && (
            <button
              type="button"
              onClick={onRequestSmartHint}
              disabled={loadingSmartHint}
              className="btn btn-decoder-trigger"
              title="Reveal the word-length pattern & key Hindi-to-English poetic metaphors (No point penalty!)"
            >
              <KeyRound size={16} aria-hidden="true" />
              <span>
                {loadingSmartHint ? 'Decoding Metaphors...' : '🔍 Decode Word Pattern & Shayari Clues'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
