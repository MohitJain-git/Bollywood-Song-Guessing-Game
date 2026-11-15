const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIPS_DIR = path.resolve(__dirname, '../public/audio_clips');
try {
  if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments (e.g. Vercel)
}

// Locate yt-dlp and ffmpeg
function getYtDlpPath() {
  const possiblePaths = [
    '/Users/mohitjain/Library/Python/3.15/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    'yt-dlp'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return '/Users/mohitjain/Library/Python/3.15/bin/yt-dlp';
}

function getFfmpegLocation() {
  const possiblePaths = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'ffmpeg'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return '/opt/homebrew/bin/ffmpeg';
}

function getClipPath(cardId) {
  return path.join(CLIPS_DIR, `${cardId}.mp3`);
}

function isClipReady(cardId) {
  const filePath = getClipPath(cardId);
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      return true;
    }
    const distPath = path.resolve(__dirname, '../dist/audio_clips', `${cardId}.mp3`);
    if (fs.existsSync(distPath) && fs.statSync(distPath).size > 1000) {
      return true;
    }
  } catch (e) {
    // Filesystem check issue
  }
  // Cards 1-220 are all bundled in public/audio_clips and dist/audio_clips
  const numId = parseInt(cardId, 10);
  return numId >= 1 && numId <= 220;
}

const BAD_KEYWORDS = [
  'remix', 'mashup', 'reprise', 'cover', 'slowed', 'reverb', '8d',
  'trailer', 'teaser', 'reaction', 'dance performance', 'karaoke',
  'instrumental', 'acoustic version', 'unplugged', 'dialogue', 'scene',
  'short', 'ringtone', 'status'
];

/**
 * Searches YouTube for the pristine official audio / Topic track (no video bumpers, no promos).
 */
function findCleanAudioTarget(card) {
  return new Promise((resolve) => {
    const ytdlp = getYtDlpPath();
    const primarySinger = card.artist ? card.artist.split(',')[0].split(';')[0].trim() : '';

    const queries = [
      `"${card.song_name}" "${primarySinger}" Topic`,
      `"${card.song_name}" "${primarySinger}" "audio song"`,
      `"${card.song_name}" "${card.movie_name}" audio`,
      `"${card.song_name}" "${primarySinger}" official audio`,
      `"${card.song_name}" "${primarySinger}" lyrical`
    ];

    let queryIdx = 0;

    const tryNextQuery = () => {
      if (queryIdx >= queries.length) {
        // Fallback to direct query or card video ID
        if (card.youtube_video_id && card.youtube_video_id.length >= 8) {
          return resolve(card.youtube_video_id);
        }
        return resolve(`ytsearch1:${card.song_name} ${primarySinger} audio`);
      }

      const q = queries[queryIdx++];
      const args = [
        `ytsearch5:${q}`,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings'
      ];

      execFile(ytdlp, args, { timeout: 15000 }, (err, stdout) => {
        if (!err && stdout) {
          try {
            const data = JSON.parse(stdout);
            const entries = data.entries || [];

            // Priority 1: Official Topic track or explicitly marked audio/lyrical
            for (const entry of entries) {
              const title = (entry.title || '').toLowerCase();
              const channel = (entry.channel || '').toLowerCase();
              if (BAD_KEYWORDS.some((bad) => title.includes(bad))) continue;
              if (channel.includes('topic') || title.includes('audio') || title.includes('lyrical')) {
                return resolve(entry.id);
              }
            }

            // Priority 2: Any clean candidate without 'full video'
            for (const entry of entries) {
              const title = (entry.title || '').toLowerCase();
              if (BAD_KEYWORDS.some((bad) => title.includes(bad))) continue;
              if (!title.includes('full video') && !title.includes('official video') && !title.includes('video song')) {
                return resolve(entry.id);
              }
            }
          } catch (parseErr) {}
        }
        tryNextQuery();
      });
    };

    tryNextQuery();
  });
}

/**
 * Downloads a 15-second MP3 clip starting exactly at the musical beginning,
 * trimming leading dead air / silence so the first 5 seconds are pure music.
 */
function downloadAudioClip(card, force = false) {
  return new Promise(async (resolve, reject) => {
    const cardId = card.id;
    const finalMp3 = getClipPath(cardId);

    if (!force && isClipReady(cardId)) {
      return resolve(finalMp3);
    }

    const ytdlp = getYtDlpPath();
    const ffmpegLoc = getFfmpegLocation();

    console.log(`[AudioDownloader] Finding clean promo-free audio for #${cardId} "${card.song_name}"...`);
    const targetVideo = await findCleanAudioTarget(card);

    const targetUrl = targetVideo.startsWith('ytsearch')
      ? targetVideo
      : `https://www.youtube.com/watch?v=${targetVideo}`;

    const outputTemplate = path.join(CLIPS_DIR, `${cardId}.%(ext)s`);

    const args = [
      '--download-sections', '*00:00-00:20',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--postprocessor-args', 'ExtractAudio:-af silenceremove=start_periods=1:start_threshold=-38dB,atrim=0:15',
      '--ffmpeg-location', ffmpegLoc,
      '--no-playlist',
      '--no-warnings',
      '--force-overwrites',
      '-o', outputTemplate,
      targetUrl
    ];

    console.log(`[AudioDownloader] Downloading clean music intro for #${cardId} (${card.song_name}) -> ${targetUrl}...`);

    execFile(ytdlp, args, { cwd: path.resolve(__dirname, '..'), timeout: 40000 }, (error) => {
      if (error) {
        console.warn(`[AudioDownloader] Error downloading #${cardId}:`, error.message);
        // Fallback attempt without section filtering if section failed
        const fallbackArgs = [
          '--extract-audio',
          '--audio-format', 'mp3',
          '--postprocessor-args', 'ExtractAudio:-af silenceremove=start_periods=1:start_threshold=-38dB,atrim=0:15',
          '--ffmpeg-location', ffmpegLoc,
          '--no-playlist',
          '--force-overwrites',
          '-o', outputTemplate,
          targetUrl
        ];
        execFile(ytdlp, fallbackArgs, { cwd: path.resolve(__dirname, '..'), timeout: 45000 }, (fallbackErr) => {
          if (fallbackErr) return reject(fallbackErr);
          if (isClipReady(cardId)) return resolve(finalMp3);
          reject(new Error(`Could not generate clip for Card #${cardId}`));
        });
        return;
      }

      if (isClipReady(cardId)) {
        console.log(`[AudioDownloader] ✅ Ready clean clip: Card #${cardId} -> ${finalMp3}`);
        return resolve(finalMp3);
      } else {
        // Check if an mp3 file was generated with a slightly different pattern
        try {
          const files = fs.readdirSync(CLIPS_DIR);
          const match = files.find(f => f.startsWith(`${cardId}.`) && f.endsWith('.mp3'));
          if (match) {
            const matchedPath = path.join(CLIPS_DIR, match);
            if (matchedPath !== finalMp3) {
              fs.renameSync(matchedPath, finalMp3);
            }
            return resolve(finalMp3);
          }
        } catch (e) {}
        reject(new Error(`Clip generation failed for Card #${cardId}`));
      }
    });
  });
}

module.exports = {
  CLIPS_DIR,
  getClipPath,
  isClipReady,
  downloadAudioClip,
  findCleanAudioTarget,
  getYtDlpPath,
  getFfmpegLocation
};
