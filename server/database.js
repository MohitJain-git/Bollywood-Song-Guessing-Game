const fs = require('fs');
const path = require('path');
const { CURATED_210_SONGS } = require('./curated');
const { SEED_TRIVIA_CARDS } = require('./seedData');

const BASE_DIR = path.resolve(__dirname, '..');
let db = null;
let useMemoryFallback = false;

// Prepare memory card catalog as pristine fallback
const inMemoryCards = CURATED_210_SONGS.map((c, idx) => ({
  ...c,
  id: c.id || (idx + 1),
  times_played: 0,
  times_correct: 0,
  distractors: Array.isArray(c.distractors) ? c.distractors : []
}));

// Initialize SQLite connection safely
try {
  let DB_PATH = path.join(__dirname, 'bollywood_game.db');

  // When deployed to Vercel or AWS Lambda, the local application directory is read-only.
  // We copy the database file to /tmp (which is writable in serverless environments).
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = '/tmp';
    const tmpDbPath = path.join(tmpDir, 'bollywood_game.db');
    try {
      if (fs.existsSync(DB_PATH) && !fs.existsSync(tmpDbPath)) {
        fs.copyFileSync(DB_PATH, tmpDbPath);
      }
      if (fs.existsSync(tmpDbPath)) {
        DB_PATH = tmpDbPath;
      }
    } catch (e) {
      console.warn('[DB] Could not setup /tmp database on serverless:', e.message);
    }
  }

  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  console.log('[DB] Connected to SQLite database at:', DB_PATH);
} catch (err) {
  console.warn('[DB] SQLite is not available or read-only; switching to In-Memory Curated Catalog:', err.message);
  db = null;
  useMemoryFallback = true;
}

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
  if (!db || useMemoryFallback) {
    console.log('[DB] In-Memory Curated Catalog active (210 songs ready).');
    return;
  }

  try {
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
        let fullPath = path.join(BASE_DIR, fileName);
        if (!fs.existsSync(fullPath)) {
          const altPath = path.join(BASE_DIR, 'streamlit_app', fileName);
          if (fs.existsSync(altPath)) fullPath = altPath;
        }
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
      console.log(`[DB] Seeding ${CURATED_210_SONGS.length} curated Bollywood trivia cards...`);
      const insertCard = db.prepare(`
        INSERT INTO trivia_cards (
          song_name, movie_name, artist, era, release_year,
          english_riddle_1, english_riddle_2, hinglish_lyrics_1, hinglish_lyrics_2,
          actor_visual_clue, music_director_clue, distractors,
          youtube_video_id, youtube_search_query, fun_fact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const card of CURATED_210_SONGS) {
        insertCard.run(
          card.song_name,
          card.movie_name,
          card.artist,
          card.era,
          card.release_year,
          card.english_riddle_1,
          card.english_riddle_2 || '',
          card.hinglish_lyrics_1,
          card.hinglish_lyrics_2 || '',
          card.actor_visual_clue || '',
          card.music_director_clue || '',
          JSON.stringify(card.distractors || []),
          card.youtube_video_id || '',
          card.youtube_search_query || `${card.song_name} ${card.movie_name} official video`,
          card.fun_fact || ''
        );
      }
      console.log('[DB] Curated cards seeded successfully.');
    }
  } catch (err) {
    console.warn('[DB] Failed to run schema migration on SQLite; falling back to In-Memory Catalog:', err.message);
    useMemoryFallback = true;
  }
}

// Trivia Card retrieval & queries
function getTriviaCard(filter = {}) {
  const { era, excludeId } = filter;

  if (db && !useMemoryFallback) {
    try {
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

      if (card) return card;
    } catch (err) {
      console.warn('[DB] getTriviaCard SQLite query failed, falling back to memory:', err.message);
    }
  }

  // In-Memory Fallback (Guaranteed to return a card on Vercel)
  let pool = inMemoryCards;
  if (era && era !== 'all') {
    pool = pool.filter(c => c.era === era);
    if (pool.length === 0) pool = inMemoryCards;
  }
  if (excludeId) {
    const withoutExcluded = pool.filter(c => c.id !== parseInt(excludeId, 10));
    if (withoutExcluded.length > 0) pool = withoutExcluded;
  }

  // Prioritize unplayed
  const unplayed = pool.filter(c => c.times_played === 0);
  const candidates = unplayed.length > 0 ? unplayed : pool;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  return JSON.parse(JSON.stringify(picked));
}

function getCardById(id) {
  const numId = parseInt(id, 10);

  if (db && !useMemoryFallback) {
    try {
      const card = db.prepare('SELECT * FROM trivia_cards WHERE id = ?').get(numId);
      if (card) {
        if (card.distractors) {
          try {
            card.distractors = JSON.parse(card.distractors);
          } catch {
            card.distractors = [];
          }
        }
        return card;
      }
    } catch (err) {
      console.warn('[DB] getCardById SQLite failed:', err.message);
    }
  }

  const memoryMatch = inMemoryCards.find(c => c.id === numId);
  if (memoryMatch) return JSON.parse(JSON.stringify(memoryMatch));
  return inMemoryCards[0] || null;
}

function recordCardPlay(id, isCorrect = false) {
  const numId = parseInt(id, 10);

  if (db && !useMemoryFallback) {
    try {
      const stmt = db.prepare(`
        UPDATE trivia_cards
        SET times_played = times_played + 1,
            times_correct = times_correct + ?
        WHERE id = ?
      `);
      stmt.run(isCorrect ? 1 : 0, numId);
      return;
    } catch (err) {
      console.warn('[DB] recordCardPlay SQLite failed:', err.message);
    }
  }

  const card = inMemoryCards.find(c => c.id === numId);
  if (card) {
    card.times_played = (card.times_played || 0) + 1;
    if (isCorrect) card.times_correct = (card.times_correct || 0) + 1;
  }
}

function insertTriviaCard(card) {
  if (db && !useMemoryFallback) {
    try {
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
    } catch (err) {
      console.warn('[DB] insertTriviaCard SQLite failed, adding to memory catalog:', err.message);
    }
  }

  const newId = inMemoryCards.length + 1000;
  const newCard = {
    ...card,
    id: newId,
    times_played: 0,
    times_correct: 0,
    distractors: Array.isArray(card.distractors) ? card.distractors : []
  };
  inMemoryCards.push(newCard);
  return newId;
}

function getCandidateSongForGeneration(era) {
  if (db && !useMemoryFallback) {
    try {
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
    } catch (err) {
      console.warn('[DB] getCandidateSongForGeneration SQLite failed:', err.message);
    }
  }

  const randomSong = inMemoryCards[Math.floor(Math.random() * inMemoryCards.length)];
  return {
    song_name: randomSong.song_name,
    movie_name: randomSong.movie_name,
    artists: randomSong.artist,
    era: randomSong.era
  };
}

function getDatabaseStats() {
  if (db && !useMemoryFallback) {
    try {
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
    } catch (err) {
      console.warn('[DB] getDatabaseStats SQLite failed, calculating from memory:', err.message);
    }
  }

  const eraMap = {};
  inMemoryCards.forEach(c => {
    eraMap[c.era] = (eraMap[c.era] || 0) + 1;
  });
  const eras = Object.entries(eraMap).map(([era, count]) => ({ era, count }));

  return {
    totalSongs: 1243,
    totalCards: inMemoryCards.length,
    unplayedCards: inMemoryCards.filter(c => c.times_played === 0).length,
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
