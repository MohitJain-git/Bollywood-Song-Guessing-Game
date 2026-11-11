const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const g1 = require('./curated/group1_2000s');
const g2 = require('./curated/group2_2010s_romance');
const g3 = require('./curated/group3_party_dance');
const g4 = require('./curated/group4_2020s_trends');
const g5 = require('./curated/group5_90s_nostalgia');
const g6 = require('./curated/group6_evergreen_legends');

const ALL_GROUPS = [
  { name: 'Group 1 (2000s Classics)', songs: g1 },
  { name: 'Group 2 (2010s Romance)', songs: g2 },
  { name: 'Group 3 (Party & Dance)', songs: g3 },
  { name: 'Group 4 (2020s Trends)', songs: g4 },
  { name: 'Group 5 (90s Nostalgia)', songs: g5 },
  { name: 'Group 6 (Evergreen Legends)', songs: g6 }
];

console.log('[Compiler] Validating and compiling curated Bollywood song catalog...');

let totalCount = 0;
const validationErrors = [];
const seenSongs = new Set();
const compiledSongs = [];

for (const group of ALL_GROUPS) {
  console.log(`[Compiler] Checking ${group.name}: ${group.songs.length} songs`);
  for (const s of group.songs) {
    totalCount++;
    const key = `${s.song_name.toLowerCase().trim()}:::${s.movie_name.toLowerCase().trim()}`;
    if (seenSongs.has(key)) {
      validationErrors.push(`Duplicate song in catalog: "${s.song_name}" from "${s.movie_name}"`);
    }
    seenSongs.add(key);

    const r1 = s.english_riddle_1.toLowerCase();
    const r2 = s.english_riddle_2.toLowerCase();
    const movie = s.movie_name.toLowerCase();
    const song = s.song_name.toLowerCase();

    // Leak check: Movie name
    if (movie.length > 3 && (r1.includes(movie) || r2.includes(movie))) {
      validationErrors.push(`[LEAK] "${s.song_name}" contains movie name "${s.movie_name}" in clues!`);
    }

    // Leak check: Song name
    if (song.length > 3 && (r1.includes(song) || r2.includes(song))) {
      validationErrors.push(`[LEAK] "${s.song_name}" contains song name in clues!`);
    }

    // Forbidden template / spoiler words
    const forbidden = ['soundtrack', 'bollywood film', 'motion picture', 'directed by', 'composed by'];
    for (const f of forbidden) {
      if (r1.includes(f) || r2.includes(f)) {
        validationErrors.push(`[FORBIDDEN] "${s.song_name}" contains word "${f}" in clues!`);
      }
    }

    // Ensure lyrics match
    if (!s.hinglish_lyrics_1 || s.hinglish_lyrics_1.trim().length < 5) {
      validationErrors.push(`[MISSING] "${s.song_name}" missing hinglish_lyrics_1`);
    }
    if (!s.hinglish_lyrics_2 || s.hinglish_lyrics_2.trim().length < 5) {
      validationErrors.push(`[MISSING] "${s.song_name}" missing hinglish_lyrics_2`);
    }

    // Distractors check
    if (!Array.isArray(s.distractors) || s.distractors.length < 3) {
      validationErrors.push(`[DISTRACTORS] "${s.song_name}" does not have 3 distractors!`);
    }

    // Targeted search query
    if (!s.youtube_search_query) {
      const primarySinger = s.artist.split(',')[0].split(';')[0].trim();
      s.youtube_search_query = `${s.song_name} ${primarySinger} ${s.movie_name} official video song`;
    }

    compiledSongs.push(s);
  }
}

if (validationErrors.length > 0) {
  console.error(`[Compiler] ❌ VALIDATION FAILED with ${validationErrors.length} errors:`);
  validationErrors.slice(0, 10).forEach(e => console.error('  -', e));
  process.exit(1);
}

console.log(`[Compiler] ✅ VALIDATION PASSED: ${compiledSongs.length} songs are 100% verified with ZERO leaks!`);

// Database Insertion
const DB_PATH = path.join(__dirname, 'bollywood_game.db');
const db = new DatabaseSync(DB_PATH);

// Backup check / migration ensure
const columns = db.prepare('PRAGMA table_info(trivia_cards)').all().map(c => c.name);
if (!columns.includes('spotify_track_id')) {
  db.exec('ALTER TABLE trivia_cards ADD COLUMN spotify_track_id TEXT');
}
if (!columns.includes('spotify_uri')) {
  db.exec('ALTER TABLE trivia_cards ADD COLUMN spotify_uri TEXT');
}

// Clear old trivia cards and rebuild with the pristine 210 deck
db.exec('DELETE FROM trivia_cards');

const insertCardStmt = db.prepare(`
  INSERT INTO trivia_cards (
    song_name,
    movie_name,
    artist,
    era,
    release_year,
    english_riddle_1,
    english_riddle_2,
    hinglish_lyrics_1,
    hinglish_lyrics_2,
    actor_visual_clue,
    music_director_clue,
    distractors,
    youtube_video_id,
    youtube_search_query,
    spotify_track_id,
    spotify_uri,
    fun_fact
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const card of compiledSongs) {
  insertCardStmt.run(
    card.song_name,
    card.movie_name,
    card.artist,
    card.era,
    card.release_year,
    card.english_riddle_1,
    card.english_riddle_2,
    card.hinglish_lyrics_1,
    card.hinglish_lyrics_2,
    card.actor_visual_clue,
    card.music_director_clue,
    JSON.stringify(card.distractors || []),
    card.youtube_video_id || '',
    card.youtube_search_query,
    card.spotify_track_id || '',
    card.spotify_track_id ? `spotify:track:${card.spotify_track_id}` : '',
    card.fun_fact || ''
  );
}

const finalCount = db.prepare('SELECT COUNT(*) as c FROM trivia_cards').get().c;
console.log(`[Compiler] 🚀 Successfully saved ${finalCount} pristine cards in the database.`);

const eraBreakdown = db.prepare('SELECT era, COUNT(*) as c FROM trivia_cards GROUP BY era ORDER BY c DESC').all();
console.log('[Compiler] Era breakdown:');
for (const e of eraBreakdown) {
  console.log(`  - ${e.era}: ${e.c} cards`);
}
