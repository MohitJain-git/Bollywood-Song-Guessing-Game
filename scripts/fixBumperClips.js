#!/usr/bin/env node
/**
 * Re-extracts all 52 Bollywood songs that have Saregama Music, Tips Official,
 * Universal Music India, Ishtar Music, Rajshri, or SponsorBlock-verified channel
 * intro bumpers so both the 5-sec MP3 clip and the YouTube player skip the ad/bumper
 * and start on the exact first note of the song.
 */
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const data = require('../server/curated/verified_youtube_ids.json');

// Map of Card ID -> exact second where the channel advert / bumper ends and the song begins
const CARD_START_OFFSETS = {
  // Tips Official (10-15s channel subscribe advert)
  8: 13,   // Pehli Nazar Mein (JBCx0QyP8VQ)
  158: 11, // Ishq Bina (SqZbGOCuai4)
  159: 11, // Ramta Jogi (onfy6y07ujQ)
  160: 10, // Tanha Tanha (Q1_WRkS5O6s)
  161: 11, // Rangeela Re (zGaTGeFmd8U)
  162: 15, // Hai Rama (11v9ALkOiio)

  // Saregama Music (5-13s Saregama / Carvaan intro bumper)
  23: 5,   // Zara Zara (a71xD6RyOok)
  24: 6,   // Sach Keh Raha Hai (hUVjx_RhMl0)
  110: 6,  // Tauba Tauba (0VX7xIvqJRk)
  118: 6,  // What Jhumka? (yBYbfMeJvHA)
  119: 5,  // Tum Kya Mile (mHdneo9_yLM)
  120: 6,  // Ve Kamleya (Pz_FkqA2x6s)
  121: 6,  // Kudmayi (nFmSK6eSINU)
  122: 7,  // Dhindhora Baje Re (oHJ0Et1ob2c)
  141: 6,  // Tujhe Dekha Toh (_hKJEqxn_OU)
  143: 7,  // Pehla Nasha (Ki41AKu0iHc)
  151: 5,  // Didi Tera Devar Deewana (HttdS70G_3o)
  152: 6,  // Pehla Pehla Pyar (KXkmrco12hI)
  168: 6,  // Jadu Teri Nazar (s_fdQXXDSLw)
  169: 7,  // Tu Mere Samne (Oj484P4OXD8)
  177: 5,  // Roop Tera Mastana (wKQVoA9UVEQ)
  180: 6,  // Lag Ja Gale (br6C4U3Dyfo)
  181: 13, // Kabhi Kabhie Mere Dil Mein (g_O5lttb5ww)
  182: 8,  // Tere Bina Zindagi Se (EiUDYzqdz2U)
  183: 5,  // Tum Aa Gaye Ho Noor Aa Gaya (RbSuFhzPgN8)
  185: 5,  // Dum Maro Dum (GUn3P5QyLRY)
  186: 6,  // O Mere Dil Ke Chain (5eyflIV8pzM)
  190: 7,  // Dekha Ek Khwaab (qJy5GFoQSPg)
  192: 8,  // Rang Barse Bheege Chunarwali (q3IHX5ASUa4)
  193: 8,  // Om Shanti Om (BF5tVDJCAUM)
  194: 5,  // Ek Hasina Thi (0iN6O3-8mLY)
  198: 5,  // Kya Hua Tera Wada (W6dKaCV-mJQ)
  199: 10, // Bachna Ae Haseeno (zgcW44Id114)
  206: 5,  // Ek Ladki Ko Dekha Toh (d-0t_MOu-WM)
  207: 6,  // Rimjhim Gire Sawan (lfJKW2lmQTQ)
  208: 6,  // Pyar Deewana Hota Hai (jsy5f55MAP0)
  209: 5,  // Ajeeb Dastaan Hai Yeh (AU-hut9lGQ4)

  // Universal Music India, Ishtar, Rajshri, YRF, Sony, T-Series, Zee verified intro bumpers
  10: 9,   // Dhoom Machale (2uUmHTgT65I)
  27: 5,   // Chor Bazaari (hFhxuGMEMxg)
  30: 7,   // Genda Phool (qtRzUdBwM5E)
  32: 19,  // Guzarish (ztPa6vkM-yY)
  53: 37,  // Hamari Adhuri Kahani (sVRwZEkXepg)
  74: 6,   // Kar Gayi Chull (-sWXx1mbgtU)
  91: 8,   // Chikni Chameli (QcQpqWhTBCE)
  96: 26,  // Sauda Khara Khara (oJVVAf5kLEY)
  109: 6,  // Heeriye (RLzC55ai0eo)
  126: 6,  // Saari Duniya Jalaa Denge (tABlzTH8G9o)
  142: 37, // Chaiyya Chaiyya (9yGukg6SSZ4)
  163: 13, // Kehna Hi Kya (_YB1taxJPgk)
  164: 14, // Tu Hi Re (waTwDgK2tkk)
  174: 37, // Chaiyya Chaiyya Remix/Live (9yGukg6SSZ4)
  201: 11, // Kaate Nahi Kat Te (EK00yMk9sKc)
  205: 5   // Mere Samne Wali Khidki Mein (XINI9JtypMw)
};

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const YTDLP = '/Users/mohitjain/Library/Python/3.15/bin/yt-dlp';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const CLIPS_DIR = path.resolve(__dirname, '../public/audio_clips');

function downloadWithOffset(id, ytId, songName, startSec) {
  return new Promise((resolve) => {
    const endSec = startSec + 18;
    const sectionArg = `*${formatTime(startSec)}-${formatTime(endSec)}`;
    const outTemplate = path.join(CLIPS_DIR, `${id}.%(ext)s`);
    const url = `https://www.youtube.com/watch?v=${ytId}`;

    const args = [
      '--download-sections', sectionArg,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--postprocessor-args', 'ExtractAudio:-af silenceremove=start_periods=1:start_threshold=-38dB,atrim=0:15',
      '--ffmpeg-location', FFMPEG,
      '--no-playlist',
      '--no-warnings',
      '--force-overwrites',
      '-o', outTemplate,
      url
    ];

    execFile(YTDLP, args, { timeout: 45000 }, (err) => {
      if (!err) {
        console.log(`✅ #${id} ${songName} (${ytId}) -> extracted at ${startSec}s..${startSec + 15}s`);
        resolve(true);
      } else {
        console.warn(`⚠️ #${id} ${songName} (${ytId}) failed:`, err.message.split('\n')[0]);
        resolve(false);
      }
    });
  });
}

(async () => {
  const entries = Object.entries(CARD_START_OFFSETS).map(([idStr, startSec]) => {
    const id = parseInt(idStr, 10);
    const meta = data.find((d) => d.id === id);
    return { id, startSec, ytId: meta.verified_yt_id, songName: meta.song_name };
  });

  console.log(`Re-extracting ${entries.length} clips with channel bumper offsets...`);
  const CONCURRENCY = 5;
  let ok = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const res = await Promise.all(
      batch.map((e) => downloadWithOffset(e.id, e.ytId, e.songName, e.startSec))
    );
    ok += res.filter(Boolean).length;
  }
  console.log(`\n🎉 Completed! ${ok}/${entries.length} clips re-extracted cleanly without channel bumpers.`);
})();
