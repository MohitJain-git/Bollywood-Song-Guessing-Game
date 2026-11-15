const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_PATH = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: ENV_PATH });

let activeApiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Built-in Bollywood Urdu/Hindi poetic lexicon for instant metaphor decoding
const BOLLYWOOD_LEXICON = {
  dil: { word: 'Dil', meaning: 'Heart / Soul', vibe: 'Emotional core' },
  ishq: { word: 'Ishq', meaning: 'Passionate, all-consuming love', vibe: 'Sufi romance' },
  mohabbat: { word: 'Mohabbat', meaning: 'Deep affection & devotion', vibe: 'Timeless romance' },
  pyaar: { word: 'Pyaar', meaning: 'Love & tenderness', vibe: 'Romantic' },
  noor: { word: 'Noor', meaning: 'Divine radiance / Celestial light', vibe: 'Ethereal beauty' },
  fanaa: { word: 'Fanaa', meaning: 'Annihilated / Completely dissolved in love', vibe: 'Sufi intensity' },
  sajda: { word: 'Sajda', meaning: 'Bowing down in reverence', vibe: 'Devotional love' },
  mannat: { word: 'Mannat', meaning: 'Sacred wish or prayer', vibe: 'Hopeful yearning' },
  khwaab: { word: 'Khwaab', meaning: 'Dream / Vision', vibe: 'Dreamy' },
  sapna: { word: 'Sapna', meaning: 'Dream', vibe: 'Wistful' },
  naina: { word: 'Naina', meaning: 'Eyes (poetic)', vibe: 'Expressive gaze' },
  aankhein: { word: 'Aankhein', meaning: 'Eyes', vibe: 'Visual poetry' },
  dhadkan: { word: 'Dhadkan', meaning: 'Heartbeat / Pulse', vibe: 'Passionate rhythm' },
  saans: { word: 'Saans', meaning: 'Breath / Life force', vibe: 'Intimate' },
  raahein: { word: 'Raahein', meaning: 'Paths / Journeys', vibe: 'Wanderlust' },
  safar: { word: 'Safar', meaning: 'Journey / Voyage', vibe: 'Adventure & life' },
  manzil: { word: 'Manzil', meaning: 'Destination / Destiny', vibe: 'Purpose' },
  tanhai: { word: 'Tanhai', meaning: 'Solitude / Melancholic loneliness', vibe: 'Heartbreak' },
  judai: { word: 'Judai', meaning: 'Separation from the beloved', vibe: 'Pathos' },
  junoon: { word: 'Junoon', meaning: 'Obsession / Fiery passion', vibe: 'Intense' },
  fitoor: { word: 'Fitoor', meaning: 'Madness of love / Infatuation', vibe: 'Reckless love' },
  bekhayali: { word: 'Bekhayali', meaning: 'Lost in thought / Restless distraction', vibe: 'Brooding heartbreak' },
  mehfil: { word: 'Mehfil', meaning: 'Festive gathering of music & poetry', vibe: 'Celebratory' },
  saawan: { word: 'Saawan', meaning: 'Monsoon rain season of romance', vibe: 'Rain & longing' },
  baarish: { word: 'Baarish', meaning: 'Rain', vibe: 'Romantic showers' },
  zindagi: { word: 'Zindagi', meaning: 'Life / Existence', vibe: 'Philosophical' },
  waqt: { word: 'Waqt', meaning: 'Time / The passing moment', vibe: 'Nostalgic' },
  kal: { word: 'Kal', meaning: 'Tomorrow / Yesterday', vibe: 'Fleeting time' },
  pal: { word: 'Pal', meaning: 'A fleeting moment', vibe: 'Present mindfulness' },
  lamha: { word: 'Lamha', meaning: 'An cherished instant', vibe: 'Poetic memory' },
  chand: { word: 'Chaand', meaning: 'The Moon (metaphor for the beloved)', vibe: 'Night romance' },
  sitare: { word: 'Sitaare', meaning: 'Stars', vibe: 'Celestial' },
  hawa: { word: 'Hawa', meaning: 'Breeze / Wind', vibe: 'Free-spirited' },
  khushi: { word: 'Khushi', meaning: 'Happiness / Joy', vibe: 'Euphoria' },
  gham: { word: 'Gham', meaning: 'Sorrow / Grief', vibe: 'Soulful' },
  duaa: { word: 'Duaa', meaning: 'Blessing / Prayer from the heart', vibe: 'Spiritual' },
  rasiya: { word: 'Rasiya', meaning: 'Connoisseur of love & beauty', vibe: 'Folk romance' },
  kesariya: { word: 'Kesariya', meaning: 'Saffron-hued (color of love & devotion)', vibe: 'Vibrant romance' },
  mast: { word: 'Mast', meaning: 'Intoxicated with joy / Carefree', vibe: 'Ecstatic' },
  deewana: { word: 'Deewana', meaning: 'Madly in love / Admirer', vibe: 'Classic Bollywood' },
  aashiq: { word: 'Aashiq', meaning: 'True lover', vibe: 'Romantic hero' },
  sanam: { word: 'Sanam', meaning: 'Beloved idol', vibe: 'Retro romance' },
  yaar: { word: 'Yaar', meaning: 'Beloved friend / Companion', vibe: 'Warmth & camaraderie' },
  dosti: { word: 'Dosti', meaning: 'Unbreakable friendship', vibe: 'Anthemic bond' }
};

function getApiKey() {
  return activeApiKey;
}

function setApiKey(key) {
  activeApiKey = (key || '').trim();
  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/g, `GEMINI_API_KEY=${activeApiKey}$1`);
      } else {
        envContent += `\nGEMINI_API_KEY=${activeApiKey}\n`;
      }
    } else {
      envContent = `GEMINI_API_KEY=${activeApiKey}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n', 'utf8');
  } catch (err) {
    console.warn('[Gemini] Could not persist .env (normal on read-only serverless):', err.message);
  }
}

function cleanJsonResponse(text) {
  if (!text) return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('[Gemini] JSON parse failed on raw text:', text.slice(0, 200));
    return null;
  }
}

/**
 * Creates a masked word pattern for a song title (e.g. "Kal Ho Naa Ho" -> "K _ _   H _   N _ _   H _")
 */
function buildWordPatternMask(title = '') {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const maskedWords = words.map((w) => {
    const clean = w.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length <= 1) return clean.toUpperCase();
    return clean[0].toUpperCase() + ' ' + '_ '.repeat(clean.length - 1).trim();
  });
  return {
    mask: maskedWords.join('   •   '),
    wordCount: words.length,
    letterCounts: words.map((w) => w.replace(/[^a-zA-Z0-9]/g, '').length)
  };
}

/**
 * Extracts Hindi/Urdu poetic terms present in the card's Hinglish lyrics
 */
function extractLyricGlossary(card) {
  const combinedHinglish = `${card.hinglish_lyrics_1 || ''} ${card.hinglish_lyrics_2 || ''}`.toLowerCase();
  const tokens = combinedHinglish.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const matches = [];
  const seen = new Set();

  for (const token of tokens) {
    for (const [key, entry] of Object.entries(BOLLYWOOD_LEXICON)) {
      if ((token === key || token.startsWith(key)) && !seen.has(entry.word)) {
        seen.add(entry.word);
        matches.push(entry);
        if (matches.length >= 3) break;
      }
    }
    if (matches.length >= 3) break;
  }

  if (matches.length === 0) {
    matches.push(
      { word: 'Mukhda', meaning: 'The signature opening chorus hook translated in Clue 1', vibe: 'Main Hook' },
      { word: 'Antara', meaning: 'The narrative verse translated word-for-word in Clue 2', vibe: 'Poetic Verse' }
    );
  }

  return matches;
}

const SYSTEM_INSTRUCTION = `You are an elite Bollywood Musicologist, Urdu/Hindi Shayar (Poet), and Master Puzzle Architect.
Your role is to craft deeply authentic, 1-to-1 logically accurate, and poetic Bollywood song guessing cards.

STRICT GOLDEN RULES:
1. ZERO SPOILERS IN RIDDLES: Never mention the song title in Hindi, never mention the movie name, and never mention actor names inside "english_riddle_1" or "english_riddle_2".
2. PURE LYRICAL TRANSLATION: "english_riddle_1" MUST be a faithful, line-by-line poetic English translation of the iconic Chorus (Mukhda) found in "hinglish_lyrics_1". Every Hindi metaphor (like chand, noor, dhadkan, saawan, fanaa, dil) must map logically to its English counterpart so players can deduce the Hindi words from the English poetry!
3. VERSE FIDELITY: "english_riddle_2" MUST be a faithful, evocative English translation of the famous Verse (Antara) in "hinglish_lyrics_2".
4. CINEMATIC SCENE WITHOUT SPOILERS: "actor_visual_clue" must paint the exact iconic visual frame (costumes, setting, choreography, weather, emotional tension, lead actors' screen dynamic) WITHOUT naming the song or movie title.
5. DEEP MUSICALITY: "music_director_clue" must highlight the composer/music director, signature instruments (e.g., santoor, sarangi, acoustic guitar, dholak, synth), raga or genre (Sufi qawwali, retro disco, monsoon ballad), and vocalists.
6. ROMANIZED HINGLISH ONLY: "hinglish_lyrics_1" and "hinglish_lyrics_2" must use clean Roman alphabet (never Devanagari script).`;

const CARD_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    english_riddle_1: {
      type: 'STRING',
      description: 'Faithful, poetic 1-to-1 English translation of the Chorus/Mukhda lyrics (2-3 sentences). No Hindi words or movie spoilers.'
    },
    english_riddle_2: {
      type: 'STRING',
      description: 'Faithful, expressive English translation of a famous Verse/Antara matching hinglish_lyrics_2.'
    },
    hinglish_lyrics_1: {
      type: 'STRING',
      description: 'Exact original Hindi lyrics of the Chorus/Mukhda in clean Romanized Hinglish matching english_riddle_1.'
    },
    hinglish_lyrics_2: {
      type: 'STRING',
      description: 'Exact original Hindi lyrics of the Verse/Antara in clean Romanized Hinglish matching english_riddle_2.'
    },
    actor_visual_clue: {
      type: 'STRING',
      description: 'Vivid cinematic description of the lead actors, setting, costumes, and iconic dance/scene moment without naming the song.'
    },
    music_director_clue: {
      type: 'STRING',
      description: 'Deep musical clue naming the composer, vocalists, signature instruments, and musical mood.'
    },
    distractors: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '3 plausible Bollywood songs from the same era and mood that are NOT the target song.'
    },
    youtube_search_query: {
      type: 'STRING',
      description: 'Specific YouTube search query to find the official music video.'
    },
    fun_fact: {
      type: 'STRING',
      description: 'A fascinating, verified behind-the-scenes story, recording anecdote, or award milestone about the song.'
    }
  },
  required: [
    'english_riddle_1',
    'english_riddle_2',
    'hinglish_lyrics_1',
    'hinglish_lyrics_2',
    'actor_visual_clue',
    'music_director_clue',
    'distractors',
    'youtube_search_query',
    'fun_fact'
  ]
};

/**
 * Masterpiece Gemini Prompt to generate Bollywood trivia card
 */
async function generateCardWithGemini(song, options = {}) {
  const apiKey = options.apiKey || activeApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Settings.');
  }

  const targetSong = song.clean_song || song.song_name;
  const targetMovie = song.clean_movie || song.movie_name;

  const userPrompt = `Craft a masterpiece Bollywood lyrical trivia card for the following track:

TARGET TRACK METADATA:
- Song Title: "${targetSong}"
- Movie / Album: "${targetMovie}"
- Artist / Singer(s): "${song.artists}"
- Era / Release Year: "${song.era || '2000s'}" (${song.release_year || 'Classic'})

VERIFICATION CHECKLIST BEFORE RESPONDING:
1. Check that "english_riddle_1" is a true, logical English translation of the exact Hindi lines in "hinglish_lyrics_1" (the Chorus/Hook).
2. Check that "english_riddle_2" is a true, logical English translation of the exact Hindi lines in "hinglish_lyrics_2" (the Verse/Antara).
3. Ensure NEITHER English riddle contains the words "${targetSong}" or "${targetMovie}".
4. Ensure "actor_visual_clue", "music_director_clue", and "fun_fact" contain rich, specific cultural & cinematic details.`;

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: CARD_RESPONSE_SCHEMA
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Gemini API error (${model} - HTTP ${res.status}): ${errorBody}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = cleanJsonResponse(rawText);

      if (parsed && parsed.english_riddle_1 && parsed.hinglish_lyrics_1) {
        return {
          song_name: targetSong,
          movie_name: targetMovie,
          artist: song.artists,
          era: song.era || '2000s',
          release_year: song.release_year,
          english_riddle_1: parsed.english_riddle_1,
          english_riddle_2: parsed.english_riddle_2 || '',
          hinglish_lyrics_1: parsed.hinglish_lyrics_1,
          hinglish_lyrics_2: parsed.hinglish_lyrics_2 || '',
          actor_visual_clue: parsed.actor_visual_clue || '',
          music_director_clue: parsed.music_director_clue || '',
          distractors:
            Array.isArray(parsed.distractors) && parsed.distractors.length >= 3
              ? parsed.distractors.slice(0, 3)
              : ['Chaiyya Chaiyya', 'Tum Hi Ho', 'Kal Ho Naa Ho'],
          youtube_video_id: '',
          youtube_search_query:
            parsed.youtube_search_query || `${targetSong} ${targetMovie} ${song.artists} official song`,
          fun_fact: parsed.fun_fact || `Iconic soundtrack highlight from ${targetMovie}, brought to life by ${song.artists}.`
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Failed with model ${model}:`, err.message);
    }
  }

  throw lastError || new Error('Failed to generate song trivia with Gemini models');
}

/**
 * Generates an interactive Poetic Metaphor Decoder & Word-Pattern Hint for any card.
 * Works instantaneously with local lexicon analysis, enhanced by Gemini if API key is present.
 */
async function generateSmartHint(card) {
  if (!card) return null;

  const pattern = buildWordPatternMask(card.song_name);
  const glossary = extractLyricGlossary(card);

  // Build deterministic poetic nudge without spoiling the answer
  const firstLetter = (card.song_name || 'B')[0].toUpperCase();
  const eraLabel = card.era || 'Bollywood';
  let poeticNudge = `This ${eraLabel} gem (${pattern.wordCount} ${pattern.wordCount === 1 ? 'word' : 'words'}, starting with "${firstLetter}") weaves ${glossary.map(g => g.word).join(' & ')} into its melody.`;

  if (activeApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;
      const prompt = `Given this Bollywood song "${card.song_name}" (Lyrics: "${card.hinglish_lyrics_1}"), write ONE clever, poetic 1-sentence lateral-thinking hint that helps the player bridge the English translation ("${card.english_riddle_1}") to the Hindi title WITHOUT using any word from "${card.song_name}" or "${card.movie_name}". Keep it under 22 words.`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 80 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (aiText && aiText.length > 10) {
          poeticNudge = aiText.replace(/^["']|["']$/g, '');
        }
      }
    } catch (e) {
      // Fallback to deterministic poetic nudge silently
    }
  }

  return {
    titleMask: pattern.mask,
    wordCount: pattern.wordCount,
    letterCounts: pattern.letterCounts,
    glossary,
    poeticNudge
  };
}

/**
 * Intelligent fallback generator when Gemini API is offline or quota reached
 */
function generateFallbackCard(song) {
  const songName = song.clean_song || song.song_name;
  const movieName = song.clean_movie || song.movie_name;
  const artists = song.artists;
  const era = song.era || '2000s';
  const year = song.release_year || 2005;

  return {
    song_name: songName,
    movie_name: movieName,
    artist: artists,
    era: era,
    release_year: year,
    english_riddle_1: `My heart whispers an unspoken vow across the silence of the night, asking you to stay before the fleeting moment turns into a memory.`,
    english_riddle_2: `Every step along this winding path carries the fragrance of your presence, turning ordinary breaths into a timeless melody.`,
    hinglish_lyrics_1: `Dil ki raahon mein teri yaadon ka basera hai`,
    hinglish_lyrics_2: `Har kadam par tera hi ehsaas gehra hai`,
    actor_visual_clue: `An unforgettable cinematic sequence from a ${year} release featuring evocative lighting and expressive choreography.`,
    music_director_clue: `Soulful vocals and arrangement brought to life by ${artists} (${era}).`,
    distractors: ['Tum Hi Ho', 'Kal Ho Naa Ho', 'Pehla Nasha'].filter(s => s !== songName).slice(0, 3),
    youtube_video_id: '',
    youtube_search_query: `${songName} ${movieName} ${artists} official video`,
    fun_fact: `Featured as a standout musical highlight in the ${year} soundtrack of "${movieName}", performed by ${artists}.`
  };
}

module.exports = {
  getApiKey,
  setApiKey,
  generateCardWithGemini,
  generateFallbackCard,
  generateSmartHint
};
