import React from 'react';
import { Sparkles, ArrowRight, Music2, BookOpen } from 'lucide-react';

export default function LyricalDecodedCard({ card }) {
  if (!card) return null;

  return (
    <div className="lyrical-decoded-card animate-fade-in">
      <div className="decoded-header">
        <Sparkles size={20} className="text-amber-400" />
        <div>
          <h3 className="decoded-title">📜 Lyrical Riddles Decoded</h3>
          <p className="decoded-subtitle">
            See how the English clues match the original Hindi lyrics word-for-word!
          </p>
        </div>
      </div>

      <div className="decoded-pairs-container">
        {/* Clue 1: Hook Comparison */}
        {card.english_riddle_1 && (
          <div className="decoded-pair-box">
            <div className="pair-badge hook-badge">
              <Sparkles size={14} />
              <span>Clue 1 (The Hook / Chorus)</span>
            </div>

            <div className="comparison-flow">
              <div className="comparison-panel english-panel">
                <span className="panel-tag">English Riddle Clue:</span>
                <p className="panel-quote">"{card.english_riddle_1}"</p>
              </div>

              <div className="comparison-arrow">
                <span className="arrow-text">Translates To</span>
                <ArrowRight size={20} className="text-amber-400" />
              </div>

              <div className="comparison-panel hindi-panel">
                <span className="panel-tag hindi-tag">
                  <span>🇮🇳</span>
                  <span>Original Hindi Lyrics (Hinglish):</span>
                </span>
                <p className="panel-quote hindi-quote">"{card.hinglish_lyrics_1}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Clue 2: Verse Comparison */}
        {card.english_riddle_2 && (
          <div className="decoded-pair-box mt-3">
            <div className="pair-badge verse-badge">
              <BookOpen size={14} />
              <span>Clue 2 (The Verse / Antara)</span>
            </div>

            <div className="comparison-flow">
              <div className="comparison-panel english-panel">
                <span className="panel-tag">English Verse Clue:</span>
                <p className="panel-quote">"{card.english_riddle_2}"</p>
              </div>

              <div className="comparison-arrow">
                <span className="arrow-text">Translates To</span>
                <ArrowRight size={20} className="text-amber-400" />
              </div>

              <div className="comparison-panel hindi-panel">
                <span className="panel-tag hindi-tag">
                  <span>🇮🇳</span>
                  <span>Original Hindi Verse (Hinglish):</span>
                </span>
                <p className="panel-quote hindi-quote">"{card.hinglish_lyrics_2 || card.hinglish_lyrics_1}"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
