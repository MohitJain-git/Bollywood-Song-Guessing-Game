const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { SEED_TRIVIA_CARDS } = require('./seedData');

const DB_PATH = path.join(__dirname, 'bollywood_game.db');
const BASE_DIR = path.resolve(__dirname, '..');

const db = new DatabaseSync(DB_PATH);

function cleanSongTitle(title) {
  if (!title) return '';
  let cleaned = title.replace(/\s*\(From\s+["'].*?["']\)/i, '');
  cleaned = cleaned.replace(/\s*\(Original\s+Motion\s+Picture.*?\)/i, '');
  cleaned = cleaned.replace(/\s*\(From\s+.*?\)/i, '');
  cleaned = cleaned.replace(/\s*\(.*?\)/g, '');
  cleaned = cleaned.replace(/\s*\[.*?\]/g, '');
  cleaned = cleaned.replace(/\s*-\s*From\s+.*$/i, '');
  cleaned = cleaned.replace(/\s*-\s*Single$/i, '');
  cleaned = cleaned.replace(/\s*-\s*Remix$/i, '');
  return cleaned.trim();
}

function cleanMovieTitle(title) {
  if (!title) return '';
  let cleaned = title.replace(/\s*\(Original\s+Motion\s+Picture.*?\)/i, '');
  cleaned = cleaned.replace(/\s*\(From\s+.*?\)/i, '');
  cleaned = cleaned.replace(/\s*\(.*?\)/g, '');
  cleaned = cleaned.replace(/\s*-\s*Single$/i, '');
  cleaned = cleaned.replace(/\s*-\s*EP$/i, '');
  return cleaned.trim();
}

function determineEra(releaseDate) {
  if (!releaseDate) return '2000s';
  const yearMatch = releaseDate.match(/(\d{4})/);
  if (!yearMatch) return '2000s';
  const year = parseInt(yearMatch[1], 10);
  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '90s';
  return 'Classics';
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const regex = /(?:,|\n|^)(\"(?:(?:\"\")*[^\"]*)*\"|[^\",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1];
      if (val === undefined) break;
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      matches.push(val);
      if (regex.lastIndex >= line.length) break;
    }
    if (matches.length >= 5) {
      rows.push({
        uri: matches[0],
        song: matches[1],
        movie: matches[2],
        artist: matches[3],
        release_date: matches[4],
        popularity: parseInt(matches[6]) || 0
      });
    }
  }
  return rows;
}

function initDatabase() {
  console.log('[DB] Initializing SQLite database at:', DB_PATH);

  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_name TEXT NOT NULL,
      clean_song TEXT NOT NULL,
      movie_name TEXT,
      clean_movie TEXT,
      artists TEXT,
      release_date TEXT,
      release_year INTEGER,
      era TEXT,
      popularity INTEGER DEFAULT 0,
      spotify_uri TEXT,
      has_trivia INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trivia_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER,
      song_name TEXT NOT NULL,
      movie_name TEXT NOT NULL,
      artist TEXT NOT NULL,
      era TEXT,
      release_year INTEGER,
      english_riddle_1 TEXT NOT NULL,
      english_riddle_2 TEXT,
      hinglish_lyrics_1 TEXT NOT NULL,
      hinglish_lyrics_2 TEXT,
      actor_visual_clue TEXT,
      music_director_clue TEXT,
      distractors TEXT,
      youtube_video_id TEXT,
      youtube_search_query TEXT,
      fun_fact TEXT,
      times_played INTEGER DEFAULT 0,
      times_correct INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_rooms (
      room_code TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      room_name TEXT,
      game_mode TEXT DEFAULT 'standard',
      era_filter TEXT DEFAULT 'all',
      status TEXT DEFAULT 'lobby',
      current_card_id INTEGER,
      current_clue_level INTEGER DEFAULT 1,
      buzzer_player_id TEXT,
      buzzer_player_name TEXT,
      buzzer_team TEXT,
      buzzer_locked_at INTEGER,
      timer_seconds INTEGER DEFAULT 30,
      players_json TEXT DEFAULT '[]',
      teams_json TEXT DEFAULT '{"team_red":{"name":"Team Sholay","score":0,"members":[]},"team_blue":{"name":"Team DDLJ","score":0,"members":[]}}',
      scores_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Check if songs table has been populated from CSVs
  const songCount = db.prepare('SELECT COUNT(*) as count FROM songs').get().count;
  if (songCount === 0) {
    console.log('[DB] Importing songs from CSV datasets...');
    const files = ['Best_of_Bollywood_-_2000s.csv', 'New_Hindi_2020-2024.csv', 'H.csv'];
    const insertSong = db.prepare(`
      INSERT INTO songs (song_name, clean_song, movie_name, clean_movie, artists, release_date, release_year, era, popularity, spotify_uri)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seen = new Set();
    let totalImported = 0;

    for (const fileName of files) {
      const fullPath = path.join(BASE_DIR, fileName);
      const rows = parseCSV(fullPath);
      for (const row of rows) {
        if (!row.song || !row.song.trim()) continue;
        const cleanSong = cleanSongTitle(row.song);
        const cleanMovie = cleanMovieTitle(row.movie || row.song);
        const artists = (row.artist || '').replace(/;/g, ', ');
        const key = `${cleanSong.toLowerCase()}:::${cleanMovie.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const yearMatch = (row.release_date || '').match(/(\d{4})/);
        const releaseYear = yearMatch ? parseInt(yearMatch[1], 10) : 2005;
        const era = determineEra(row.release_date);

        insertSong.run(
          row.song,
          cleanSong,
          row.movie || cleanSong,
          cleanMovie,
          artists,
          row.release_date || '',
          releaseYear,
          era,
          row.popularity,
          row.uri || ''
        );
        totalImported++;
      }
    }
    console.log(`[DB] Successfully loaded ${totalImported} unique songs into database.`);
  }

  // 3. Seed starter trivia cards if empty
  const cardCount = db.prepare('SELECT COUNT(*) as count FROM trivia_cards').get().count;
  if (cardCount === 0) {
    console.log(`[DB] Seeding ${SEED_TRIVIA_CARDS.length} curated Bollywood trivia cards...`);
    const insertCard = db.prepare(`
      INSERT INTO trivia_cards (
        song_name, movie_name, artist, era, release_year,
        english_riddle_1, english_riddle_2, hinglish_lyrics_1, hinglish_lyrics_2,
        actor_visual_clue, music_director_clue, distractors,
        youtube_video_id, youtube_search_query, spotify_track_id, spotify_uri, fun_fact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const card of SEED_TRIVIA_CARDS) {
      insertCard.run(
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
        card.youtube_search_query || `${card.song_name} ${card.movie_name} official video`,
        card.spotify_track_id || '',
        card.spotify_track_id ? `spotify:track:${card.spotify_track_id}` : '',
        card.fun_fact || ''
      );
    }
    console.log('[DB] Curated cards seeded successfully.');
  }
}

// Trivia Card retrieval & queries
function getTriviaCard(filter = {}) {
  const { era, excludeId } = filter;
  let sql = 'SELECT * FROM trivia_cards WHERE 1=1';
  const params = [];

  if (era && era !== 'all') {
    sql += ' AND era = ?';
    params.push(era);
  }
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  // Prioritize unplayed cards first
  const unplayedSql = `${sql} AND times_played = 0 ORDER BY RANDOM() LIMIT 1`;
  let card = db.prepare(unplayedSql).get(...params);

  // If no unplayed cards left in this era, pick any random card
  if (!card) {
    const randomSql = `${sql} ORDER BY times_played ASC, RANDOM() LIMIT 1`;
    card = db.prepare(randomSql).get(...params);
  }

  if (card && card.distractors) {
    try {
      card.distractors = JSON.parse(card.distractors);
    } catch {
      card.distractors = [];
    }
  }

  return card;
}

function getCardById(id) {
  const card = db.prepare('SELECT * FROM trivia_cards WHERE id = ?').get(id);
  if (card && card.distractors) {
    try {
      card.distractors = JSON.parse(card.distractors);
    } catch {
      card.distractors = [];
    }
  }
  return card;
}

function recordCardPlay(id, isCorrect = false) {
  db.prepare(`
    UPDATE trivia_cards
    SET times_played = times_played + 1,
        times_correct = times_correct + ?
    WHERE id = ?
  `).run(isCorrect ? 1 : 0, id);
}

function insertTriviaCard(card) {
  const stmt = db.prepare(`
    INSERT INTO trivia_cards (
      song_name, movie_name, artist, era, release_year,
      english_riddle_1, english_riddle_2, hinglish_lyrics_1, hinglish_lyrics_2,
      actor_visual_clue, music_director_clue, distractors,
      youtube_video_id, youtube_search_query, fun_fact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    card.song_name,
    card.movie_name,
    card.artist,
    card.era || '2000s',
    card.release_year || 2005,
    card.english_riddle_1,
    card.english_riddle_2 || '',
    card.hinglish_lyrics_1,
    card.hinglish_lyrics_2 || '',
    card.actor_visual_clue || '',
    card.music_director_clue || '',
    JSON.stringify(card.distractors || []),
    card.youtube_video_id || '',
    card.youtube_search_query || `${card.song_name} ${card.movie_name} official song`,
    card.fun_fact || ''
  );

  return result.lastInsertRowid;
}

function getCandidateSongForGeneration(era) {
  let sql = `
    SELECT * FROM songs
    WHERE clean_song NOT IN (SELECT song_name FROM trivia_cards)
  `;
  const params = [];
  if (era && era !== 'all') {
    sql += ' AND era = ?';
    params.push(era);
  }
  sql += ' ORDER BY popularity DESC, RANDOM() LIMIT 1';
  return db.prepare(sql).get(...params);
}

function getDatabaseStats() {
  const totalSongs = db.prepare('SELECT COUNT(*) as c FROM songs').get().c;
  const totalCards = db.prepare('SELECT COUNT(*) as c FROM trivia_cards').get().c;
  const unplayedCards = db.prepare('SELECT COUNT(*) as c FROM trivia_cards WHERE times_played = 0').get().c;
  const eras = db.prepare('SELECT era, COUNT(*) as count FROM trivia_cards GROUP BY era').all();
  return {
    totalSongs,
    totalCards,
    unplayedCards,
    eras
  };
}

module.exports = {
  db,
  initDatabase,
  getTriviaCard,
  getCardById,
  recordCardPlay,
  insertTriviaCard,
  getCandidateSongForGeneration,
  getDatabaseStats,
  cleanSongTitle,
  cleanMovieTitle
};
