import React, { useState, useEffect } from 'react';
import { X, Key, Database, Sparkles, Check, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState(null);
  const [savingKey, setSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Stats & Generation
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState('');
  const [generateEra, setGenerateEra] = useState('all');

  const fetchStatusAndStats = async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/settings/status'),
        fetch('/api/stats')
      ]);
      const statusData = await statusRes.json();
      const statsData = await statsRes.json();

      setHasKey(statusData.hasKey);
      setMaskedKey(statusData.maskedKey);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndStats();
    }
  }, [isOpen]);

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setSavingKey(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setHasKey(true);
        setSaveSuccess(true);
        setApiKeyInput('');
        fetchStatusAndStats();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(false);
    }
  };

  const handleGenerateCards = async () => {
    setGenerating(true);
    setGenerateMsg('');
    try {
      const res = await fetch('/api/trivia/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3, era: generateEra })
      });
      const data = await res.json();
      if (data.success) {
        setGenerateMsg(data.message);
        if (data.stats) setStats(data.stats);
      } else {
        setGenerateMsg(data.error || 'Generation failed.');
      }
    } catch (err) {
      setGenerateMsg(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-content animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={20} className="text-amber-400" />
            <h3>Game Settings & Gemini AI Engine</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gemini API Key Section */}
          <section className="settings-section">
            <div className="section-title">
              <Key size={18} className="text-amber-400" />
              <h4>Google Gemini API Key (Free)</h4>
            </div>
            <p className="section-desc">
              Powers automatic generation of poetic English riddles, Romanized Hinglish lyrics, and Bollywood trivia.
            </p>

            <div className="key-status-row">
              <span className="status-label">Current Status:</span>
              {hasKey ? (
                <span className="status-badge connected">
                  <Check size={14} />
                  <span>Configured ({maskedKey})</span>
                </span>
              ) : (
                <span className="status-badge missing">
                  <AlertCircle size={14} />
                  <span>Not Configured (Using Pre-loaded Deck)</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveApiKey} className="key-input-form">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="Paste Gemini API Key (e.g. AIzaSy...)"
                className="guess-input"
              />
              <button
                type="submit"
                disabled={savingKey || !apiKeyInput.trim()}
                className="btn btn-primary whitespace-nowrap"
              >
                {savingKey ? 'Saving...' : 'Save Key'}
              </button>
            </form>

            {saveSuccess && (
              <div className="feedback-alert feedback-success mt-2">
                <Check size={16} />
                <span>API Key saved and active!</span>
              </div>
            )}

            <div className="get-key-hint">
              <span>Don't have a Gemini API key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                <span>Get a free key from Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </section>

          {/* Database & Auto-Replenishment Stats */}
          <section className="settings-section">
            <div className="section-title">
              <Database size={18} className="text-blue-400" />
              <h4>Database & Auto-Replenishment</h4>
            </div>
            <p className="section-desc">
              Songs from CSV files are permanently stored in SQLite. Whenever unplayed questions run low, the database automatically replenishes new ones!
            </p>

            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-num">{stats.totalCards}</span>
                  <span className="stat-sub">Active Game Songs</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num text-emerald-400">{stats.dailyLatestCount || 0}</span>
                  <span className="stat-sub">Daily Latest Added</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num text-amber-400">{stats.unplayedCards}</span>
                  <span className="stat-sub">Unplayed Cards</span>
                </div>
              </div>
            )}

            {/* Daily 10 Latest Songs Verification Panel */}
            {stats && (
              <div className="mt-4 p-3 rounded-xl bg-zinc-900/90 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-300">
                    📅 Daily 10 Latest Songs Auto-Sync
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                    {stats.dailySync?.isSyncedToday
                      ? `✅ Synced Today (${stats.dailySync?.todayDate})`
                      : `Last Sync: ${stats.dailySync?.lastSyncDate || 'Ready'}`}
                  </span>
                </div>

                {Array.isArray(stats.recentDailySongs) && stats.recentDailySongs.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 mt-2">
                    {stats.recentDailySongs.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs bg-zinc-800/70 px-2.5 py-1.5 rounded-lg border border-zinc-700/60"
                      >
                        <div className="truncate pr-2">
                          <span className="text-amber-400 font-bold mr-1.5">#{s.id}</span>
                          <strong className="text-white">{s.song_name}</strong>
                          <span className="text-zinc-400"> • {s.movie_name} ({s.release_year})</span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono shrink-0">
                          {s.added_date || 'Synced'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Trigger to Generate New Cards */}
            <div className="generate-box">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-xs text-zinc-300 font-semibold">Select Era:</span>
                <select
                  value={generateEra}
                  onChange={e => setGenerateEra(e.target.value)}
                  className="era-dropdown"
                >
                  <option value="all">All Eras</option>
                  <option value="2000s">2000s Hits</option>
                  <option value="2010s">2010s Blockbusters</option>
                  <option value="2020s">2020s Trends</option>
                  <option value="90s">90s Nostalgia</option>
                </select>
              </div>

              <button
                onClick={handleGenerateCards}
                disabled={generating}
                className="btn btn-secondary w-full"
              >
                <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                <span>{generating ? 'Crafting 3 Cards with Gemini...' : '⚡ Generate 3 New Cards Now'}</span>
              </button>

              {generateMsg && (
                <div className="feedback-alert feedback-success mt-2">
                  <Check size={16} />
                  <span>{generateMsg}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
