const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_PATH = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: ENV_PATH });

let activeApiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function getApiKey() {
  return activeApiKey;
}

function setApiKey(key) {
  activeApiKey = (key || '').trim();
  // Persist to .env
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
    console.error('[Gemini] Failed to write .env:', err.message);
  }
}

function cleanJsonResponse(text) {
  if (!text) return null;
  let cleaned = text.trim();
  // Remove markdown code fence if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  
  // Find first { and last }
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
 * Optimized Gemini Prompt to generate Bollywood trivia card
 */
async function generateCardWithGemini(song, options = {}) {
  const apiKey = options.apiKey || activeApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Settings.');
  }

  const prompt = `
You are the world's greatest Bollywood music trivia maestro and Hindi lyricist.
Your mission is to craft a delightful, intellectually engaging trivia puzzle card for a guessing game.

TARGET SONG DETAILS:
- Song Title: "${song.clean_song || song.song_name}"
- Movie / Album: "${song.clean_movie || song.movie_name}"
- Artist / Singer(s): "${song.artists}"
- Era / Release Year: "${song.era || ''}" (${song.release_year || 'Unknown'})

TASK:
Generate a complete JSON trivia challenge strictly adhering to the following structure:

{
  "english_riddle_1": "The most famous Chorus/Hook (Mukhda) lyrics translated into poetic, witty English (2-3 sentences). Create an intriguing brain-teaser riddle that conveys the meaning without giving away the song title literally.",
  "english_riddle_2": "A famous Verse (Antara) or alternate line translated into expressive English.",
  "hinglish_lyrics_1": "Exact original lyrics of Chorus/Mukhda in clean Romanized Hindi (Hinglish, NEVER Devanagari script).",
  "hinglish_lyrics_2": "Exact original lyrics of Verse/Antara in clean Romanized Hindi (Hinglish, NEVER Devanagari script).",
  "actor_visual_clue": "A short, vivid hint describing the lead actors, movie plot moment, iconic dance hook-step, or unforgettable visual from the music video.",
  "music_director_clue": "A hint highlighting the composer, music director, singer style, or cultural impact.",
  "distractors": ["Alternative Song 1", "Alternative Song 2", "Alternative Song 3"],
  "youtube_search_query": "Clean YouTube query to locate the official lyrical or music video (e.g. 'Song Movie official song')",
  "fun_fact": "A 1-sentence captivating Bollywood trivia or awards fact about this song."
}

CRITICAL REQUIREMENTS:
1. "hinglish_lyrics_1" and "hinglish_lyrics_2" MUST be in Roman English alphabet (e.g., 'Kal ho naa ho', NOT 'कल हो ना हो').
2. "distractors" MUST contain exactly 3 popular, plausible alternate Bollywood songs from the same era/vibe. They MUST NOT match the target song name.
3. Return ONLY valid JSON. No conversational commentary.
`;

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
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
          song_name: song.clean_song || song.song_name,
          movie_name: song.clean_movie || song.movie_name,
          artist: song.artists,
          era: song.era || '2000s',
          release_year: song.release_year,
          english_riddle_1: parsed.english_riddle_1,
          english_riddle_2: parsed.english_riddle_2 || '',
          hinglish_lyrics_1: parsed.hinglish_lyrics_1,
          hinglish_lyrics_2: parsed.hinglish_lyrics_2 || '',
          actor_visual_clue: parsed.actor_visual_clue || '',
          music_director_clue: parsed.music_director_clue || '',
          distractors: Array.isArray(parsed.distractors) && parsed.distractors.length >= 3 
            ? parsed.distractors.slice(0, 3) 
            : ['Chaiyya Chaiyya', 'Tum Hi Ho', 'Kal Ho Naa Ho'],
          youtube_video_id: '',
          youtube_search_query: parsed.youtube_search_query || `${song.clean_song} ${song.clean_movie} official video`,
          fun_fact: parsed.fun_fact || `Iconic track from ${song.clean_movie} sung by ${song.artists}.`
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
    english_riddle_1: `A celebrated Bollywood melody from "${movieName}" where the singer yearns passionately for their beloved through captivating harmonies.`,
    english_riddle_2: `A memorable verse describing timeless love and unforgettable melodies recorded by ${artists}.`,
    hinglish_lyrics_1: `[Romanized Hindi lyrics for ${songName}]`,
    hinglish_lyrics_2: `[Verses from the soundtrack of ${movieName}]`,
    actor_visual_clue: `A memorable sequence from the movie "${movieName}" (${year}).`,
    music_director_clue: `Vocals and music brought to life by ${artists}.`,
    distractors: ['Tum Hi Ho', 'Kal Ho Naa Ho', 'Pehla Nasha'].filter(s => s !== songName).slice(0, 3),
    youtube_video_id: '',
    youtube_search_query: `${songName} ${movieName} official video`,
    fun_fact: `This track was featured on the hit album for "${movieName}" released in ${year}.`
  };
}

module.exports = {
  getApiKey,
  setApiKey,
  generateCardWithGemini,
  generateFallbackCard
};
