import React from 'react';
import { Sparkles, Film, Music, Eye, ChevronDown } from 'lucide-react';

export default function ClueCard({ card, currentClueLevel, onRevealNextClue, isAnswerRevealed }) {
  if (!card) return null;

  return (
    <div className="clue-deck">
      {/* Clue 1: English Riddle (Chorus / Hook) */}
      <div className="clue-box primary-clue animate-fade-in">
        <div className="clue-header">
          <span className="clue-badge gold">
            <Sparkles size={14} />
            <span>Clue 1: The English Riddle (Hook)</span>
          </span>
          <span className="clue-pts">100 Pts</span>
        </div>
        <p className="clue-text-riddle">"{card.english_riddle_1}"</p>
      </div>

      {/* Clue 2: English Verse */}
      {currentClueLevel >= 2 && card.english_riddle_2 && (
        <div className="clue-box secondary-clue animate-slide-up">
          <div className="clue-header">
            <span className="clue-badge blue">
              <Sparkles size={14} />
              <span>Clue 2: Verse in English</span>
            </span>
            <span className="clue-pts">80 Pts</span>
          </div>
          <p className="clue-text-riddle">"{card.english_riddle_2}"</p>
        </div>
      )}

      {/* Clue 3: Actor & Visual Clue */}
      {currentClueLevel >= 3 && card.actor_visual_clue && (
        <div className="clue-box visual-clue animate-slide-up">
          <div className="clue-header">
            <span className="clue-badge purple">
              <Film size={14} />
              <span>Clue 3: Star Cast & Hook Step</span>
            </span>
            <span className="clue-pts">60 Pts</span>
          </div>
          <p className="clue-text-body">{card.actor_visual_clue}</p>
        </div>
      )}

      {/* Clue 4: Music Director & Year */}
      {currentClueLevel >= 4 && (card.music_director_clue || card.release_year) && (
        <div className="clue-box music-clue animate-slide-up">
          <div className="clue-header">
            <span className="clue-badge amber">
              <Music size={14} />
              <span>Clue 4: Music & Era</span>
            </span>
            <span className="clue-pts">40 Pts</span>
          </div>
          <p className="clue-text-body">
            {card.music_director_clue || `Released in ${card.release_year}.`}
            {card.era && <span className="era-tag"> • {card.era}</span>}
          </p>
        </div>
      )}

      {/* Clue 5: Romanized Hinglish Lyrics */}
      {currentClueLevel >= 5 && card.hinglish_lyrics_1 && (
        <div className="clue-box hindi-clue animate-slide-up">
          <div className="clue-header">
            <span className="clue-badge emerald">
              <span>🇮🇳</span>
              <span>Clue 5: Original Romanized Lyrics</span>
            </span>
            <span className="clue-pts">20 Pts</span>
          </div>
          <p className="clue-text-hinglish">"{card.hinglish_lyrics_1}"</p>
          {card.hinglish_lyrics_2 && (
            <p className="clue-text-hinglish secondary">"{card.hinglish_lyrics_2}"</p>
          )}
        </div>
      )}

      {/* Next Clue Button */}
      {!isAnswerRevealed && currentClueLevel < 5 && (
        <div className="clue-action-bar">
          <button
            onClick={onRevealNextClue}
            className="btn btn-secondary reveal-clue-btn"
          >
            <ChevronDown size={18} />
            <span>
              Unlock Clue {currentClueLevel + 1}{' '}
              {currentClueLevel === 1 && '(Another Verse)'}
              {currentClueLevel === 2 && '(Actor & Visuals)'}
              {currentClueLevel === 3 && '(Music & Year)'}
              {currentClueLevel === 4 && '(Original Hindi Lyrics)'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
