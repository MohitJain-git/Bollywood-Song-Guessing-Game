const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const dotenv = require('dotenv');

dotenv.config();

const {
  initDatabase,
  getTriviaCard,
  getCardById,
  recordCardPlay,
  insertTriviaCard,
  getCandidateSongForGeneration,
  getDatabaseStats
} = require('./database');

const {
  getApiKey,
  setApiKey,
  generateCardWithGemini,
  generateFallbackCard,
  generateSmartHint
} = require('./geminiService');

const {
  getClipPath,
  isClipReady,
  downloadAudioClip,
  CLIPS_DIR
} = require('./audioDownloader');

const roomManager = require('./roomManager');

// Initialize database
initDatabase();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Normalize URLs when running as a Vercel Serverless Function
app.use((req, res, next) => {
  if (req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  } else if ((req.url === '/api' || req.url === '/api/index.js' || req.url === '/index.js') && req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});

// Background Replenishment helper
let isReplenishing = false;
async function replenishCardsIfNeeded(targetEra = 'all') {
  if (isReplenishing) return;
  const stats = getDatabaseStats();
  if (stats.unplayedCards > 5) return;

  isReplenishing = true;
  console.log('[Replenishment] Unplayed cards running low. Generating new trivia cards...');

  try {
    const candidate = getCandidateSongForGeneration(targetEra);
    if (!candidate) {
      console.log('[Replenishment] No eligible un-generated songs found.');
      isReplenishing = false;
      return;
    }

    const apiKey = getApiKey();
    let newCard;
    if (apiKey) {
      newCard = await generateCardWithGemini(candidate);
    } else {
      newCard = generateFallbackCard(candidate);
    }

    const newId = insertTriviaCard(newCard);
    console.log(`[Replenishment] Successfully added new trivia card #${newId} for "${newCard.song_name}".`);
  } catch (err) {
    console.warn('[Replenishment] Auto-generation error:', err.message);
  } finally {
    isReplenishing = false;
  }
}

// ---------------- REST API ----------------

// Get next trivia card
app.get('/api/trivia/next', async (req, res) => {
  try {
    const era = req.query.era || 'all';
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId, 10) : null;
    
    let card = getTriviaCard({ era, excludeId });

    // If completely empty, generate one immediately
    if (!card) {
      const candidate = getCandidateSongForGeneration(era);
      if (candidate) {
        const apiKey = getApiKey();
        const generated = apiKey 
          ? await generateCardWithGemini(candidate) 
          : generateFallbackCard(candidate);
        const newId = insertTriviaCard(generated);
        card = getCardById(newId);
      }
    }

    // Trigger background replenishment check
    replenishCardsIfNeeded(era).catch(() => {});

    if (!card) {
      return res.status(404).json({ error: 'No songs available in database' });
    }

    res.json({ card });
  } catch (err) {
    console.error('[API] /api/trivia/next error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get AI Poetic Metaphor Decoder & Word-Pattern Hint for a card
app.get('/api/trivia/smart-hint/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const card = getCardById(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const hint = await generateSmartHint(card);
    res.json({ hint });
  } catch (err) {
    console.error('[API] /api/trivia/smart-hint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record play outcome
app.post('/api/trivia/record', (req, res) => {
  try {
    const { id, isCorrect } = req.body;
    if (id) {
      recordCardPlay(id, Boolean(isCorrect));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Explicitly generate new cards with Gemini
app.post('/api/trivia/generate', async (req, res) => {
  try {
    const era = req.body.era || 'all';
    const count = Math.min(Math.max(parseInt(req.body.count, 10) || 1, 1), 5);
    const results = [];

    for (let i = 0; i < count; i++) {
      const candidate = getCandidateSongForGeneration(era);
      if (!candidate) break;

      const apiKey = getApiKey();
      let cardData;
      if (apiKey) {
        cardData = await generateCardWithGemini(candidate);
      } else {
        cardData = generateFallbackCard(candidate);
      }
      const newId = insertTriviaCard(cardData);
      results.push({ id: newId, song_name: cardData.song_name, movie_name: cardData.movie_name });
    }

    res.json({
      success: true,
      message: `Generated and stored ${results.length} new Bollywood trivia cards!`,
      cards: results,
      stats: getDatabaseStats()
    });
  } catch (err) {
    console.error('[API] /api/trivia/generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Database stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Key settings
app.get('/api/settings/status', (req, res) => {
  const key = getApiKey();
  res.json({
    hasKey: Boolean(key && key.trim().length > 0),
    maskedKey: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : null
  });
});

app.post('/api/settings/api-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    setApiKey(apiKey);
    res.json({
      success: true,
      hasKey: Boolean(apiKey && apiKey.trim().length > 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multiplayer Room endpoints
app.post('/api/rooms/create', (req, res) => {
  try {
    const result = roomManager.createRoom(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/join', (req, res) => {
  try {
    const result = roomManager.joinRoom(req.body);
    if (result.error) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.rooms.get((req.params.code || '').toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room: roomManager.serializeRoom(room) });
});

// ---------------- WEBSOCKET HANDLING ----------------
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, roomCode, playerId } = data;

      switch (type) {
        case 'ATTACH':
          roomManager.attachSocket(ws, roomCode, playerId);
          break;

        case 'START_ROUND': {
          const room = roomManager.rooms.get(roomCode);
          if (room) {
            const card = getTriviaCard({ era: room.eraFilter });
            roomManager.startRound(roomCode, card);
          }
          break;
        }

        case 'ADVANCE_CLUE':
          roomManager.advanceClue(roomCode);
          break;

        case 'BUZZ':
          roomManager.handleBuzzer(roomCode, playerId);
          break;

        case 'DECIDE_ANSWER':
          roomManager.handleScoreDecision(roomCode, {
            isCorrect: data.isCorrect,
            pointsEarned: data.pointsEarned
          });
          break;

        case 'REVEAL_ANSWER':
          roomManager.revealAnswer(roomCode);
          break;

        case 'REACTION':
          roomManager.sendReaction(roomCode, {
            playerId,
            emoji: data.emoji
          });
          break;

        case 'SWITCH_TEAM':
          roomManager.switchTeam(roomCode, {
            playerId,
            targetTeam: data.targetTeam
          });
          break;

        default:
          console.warn('[WS] Unknown message type:', type);
      }
    } catch (err) {
      console.error('[WS] Message handling error:', err.message);
    }
  });

  ws.on('close', () => {
    roomManager.handleDisconnect(ws);
  });
});

// Serve local lightweight audio clips statically
app.use('/audio_clips', express.static(CLIPS_DIR));

// Audio stream & on-demand download endpoint for 5s/10s blitz
app.get('/api/audio/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).send('Invalid card ID');

  const clipPath = getClipPath(id);
  if (fs.existsSync(clipPath)) {
    return res.sendFile(`${id}.mp3`, { root: CLIPS_DIR });
  }

  const distClip = path.resolve(__dirname, '../dist/audio_clips', `${id}.mp3`);
  if (fs.existsSync(distClip)) {
    return res.sendFile(`${id}.mp3`, { root: path.resolve(__dirname, '../dist/audio_clips') });
  }

  if (isClipReady(id)) {
    return res.redirect(302, `/audio_clips/${id}.mp3`);
  }

  // On-demand fetch if not pre-downloaded
  try {
    const card = getCardById(id);
    if (!card) return res.status(404).send('Card not found in database');

    console.log(`[API /api/audio/${id}] Generating audio clip on-demand for "${card.song_name}"...`);
    await downloadAudioClip(card);

    if (isClipReady(id)) {
      return res.redirect(302, `/audio_clips/${id}.mp3`);
    }
    res.status(500).send('Failed to generate audio clip');
  } catch (err) {
    console.error(`[API /api/audio/${id}] Error:`, err.message);
    res.status(500).send(`Audio generation failed: ${err.message}`);
  }
});

// Check if audio clip is ready for immediate playback
app.get('/api/audio/status/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ready = isClipReady(id);
  res.json({
    ready,
    url: ready ? `/audio_clips/${id}.mp3` : null
  });
});

// Serve static frontend in production
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only start HTTP listener when not running inside Vercel serverless environment
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🎬 Bollywood Song Trivia Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  });
}

module.exports = app;
