const { db } = require('./database');
const { downloadAudioClip, isClipReady } = require('./audioDownloader');

async function runBatchDownloader(force = true) {
  console.log(`[BatchAudio] Starting clean batch downloader (force=${force})...`);
  const cards = db.prepare('SELECT id, song_name, movie_name, artist, youtube_video_id, youtube_search_query FROM trivia_cards ORDER BY id ASC').all();
  console.log(`[BatchAudio] Found ${cards.length} cards in database.`);

  let downloadedCount = 0;
  let alreadyReadyCount = 0;
  let errorCount = 0;

  const CONCURRENCY = 4;
  let idx = 0;

  async function worker(workerId) {
    while (idx < cards.length) {
      const currentIdx = idx++;
      const card = cards[currentIdx];
      if (!force && isClipReady(card.id)) {
        alreadyReadyCount++;
        continue;
      }

      try {
        console.log(`[Worker ${workerId}] [${currentIdx + 1}/${cards.length}] Processing: "${card.song_name}" (${card.movie_name})`);
        await downloadAudioClip(card, force);
        downloadedCount++;
      } catch (err) {
        errorCount++;
        console.warn(`[Worker ${workerId}] ⚠️ Error on Card #${card.id} "${card.song_name}":`, err.message);
      }
    }
  }

  const workers = [];
  for (let w = 1; w <= CONCURRENCY; w++) {
    workers.push(worker(w));
  }

  await Promise.all(workers);

  console.log('\n[BatchAudio] ========================================');
  console.log(`[BatchAudio] Batch Audio Clean Download Completed!`);
  console.log(`[BatchAudio] Already Ready: ${alreadyReadyCount}`);
  console.log(`[BatchAudio] Downloaded/Updated: ${downloadedCount}`);
  console.log(`[BatchAudio] Failed/Skipped: ${errorCount}`);
  console.log('[BatchAudio] ========================================\n');
}

if (require.main === module) {
  const force = process.argv.includes('--force') || true;
  runBatchDownloader(force).catch(err => console.error('[BatchAudio] Fatal error:', err));
}

module.exports = { runBatchDownloader };
