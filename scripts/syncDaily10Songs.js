#!/usr/bin/env node
/**
 * Automated Daily 10 Latest Bollywood Songs Sync Script
 * Runs daily via GitHub Actions / Cron or server background scheduler to:
 * 1. Discover & add 10 fresh latest Bollywood songs to the SQLite database (`bollywood_game.db`)
 * 2. Extract 15-second studio MP3 clips (`public/audio_clips/<id>.mp3`) for 5-Second Audio Blitz
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { initDatabase, getCardById } = require('../server/database');
const { syncDailyLatestSongs } = require('../server/dailySongsService');

function findFfmpeg() {
  const candidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', 'ffmpeg'];
  for (const c of candidates) {
    if (c === 'ffmpeg' || fs.existsSync(c)) return c;
  }
  return 'ffmpeg';
}

(async () => {
  initDatabase();
  const result = await syncDailyLatestSongs(10);
  console.log(`[Daily 10 Sync] Date: ${result.date} | Added: ${result.addedCount} songs`);

  const ffmpegBin = findFfmpeg();
  const clipsDir = path.resolve(__dirname, '../public/audio_clips');
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  for (const item of result.songs || []) {
    const card = getCardById(item.id);
    if (card && card.preview_url) {
      const outPath = path.join(clipsDir, `${card.id}.mp3`);
      try {
        execFileSync(
          ffmpegBin,
          ['-y', '-i', card.preview_url, '-t', '15', '-c:a', 'libmp3lame', '-q:a', '5', outPath],
          { stdio: 'ignore' }
        );
        console.log(`[Daily 10 Sync] ✅ Extracted 15s studio MP3: public/audio_clips/${card.id}.mp3 (${card.song_name})`);
      } catch (err) {
        console.warn(`[Daily 10 Sync] ⚠️ Could not write local MP3 for #${card.id} (will stream via preview_url):`, err.message);
      }
    }
  }
})();
