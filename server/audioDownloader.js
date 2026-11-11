const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIPS_DIR = path.resolve(__dirname, '../public/audio_clips');
if (!fs.existsSync(CLIPS_DIR)) {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
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
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
}

// Download the first 15 seconds of a song and convert to MP3
function downloadAudioClip(card) {
  return new Promise((resolve, reject) => {
    const cardId = card.id;
    const finalMp3 = getClipPath(cardId);

    if (isClipReady(cardId)) {
      return resolve(finalMp3);
    }

    const ytdlp = getYtDlpPath();
    const ffmpegLoc = getFfmpegLocation();

    // Prioritize targeted search query so we always get an active, high-quality video
    const primarySinger = card.artist ? card.artist.split(',')[0].split(';')[0].trim() : '';
    const searchQuery = card.youtube_search_query || `${card.song_name} ${primarySinger} ${card.movie_name} official video song`;
    
    // Candidates to try: 1. ytsearch query, 2. direct video ID if present
    const targets = [`ytsearch1:${searchQuery}`];
    if (card.youtube_video_id && card.youtube_video_id.length >= 8 && !card.youtube_video_id.includes(' ')) {
      targets.push(`https://www.youtube.com/watch?v=${card.youtube_video_id}`);
    }

    const tryDownload = (targetIndex) => {
      if (targetIndex >= targets.length) {
        return reject(new Error(`Failed to download audio clip for Card #${cardId} (${card.song_name})`));
      }

      const target = targets[targetIndex];
      const outputTemplate = path.join(CLIPS_DIR, `${cardId}.%(ext)s`);

      const args = [
        '--download-sections', '*00:00-00:15',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '5',
        '--ffmpeg-location', ffmpegLoc,
        '--no-playlist',
        '--no-warnings',
        '-o', outputTemplate,
        target
      ];

      console.log(`[AudioDownloader] Downloading 15s clip for Card #${cardId} (${card.song_name}) [Attempt ${targetIndex + 1}/${targets.length}]...`);

      execFile(ytdlp, args, { cwd: path.resolve(__dirname, '..'), timeout: 35000 }, (error, stdout, stderr) => {
        if (error) {
          console.warn(`[AudioDownloader] Target ${target} failed for #${cardId}:`, error.message);
          return tryDownload(targetIndex + 1);
        }

        if (isClipReady(cardId)) {
          console.log(`[AudioDownloader] ✅ Ready: Card #${cardId} -> ${finalMp3}`);
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
          return tryDownload(targetIndex + 1);
        }
      });
    };

    tryDownload(0);
  });
}

module.exports = {
  CLIPS_DIR,
  getClipPath,
  isClipReady,
  downloadAudioClip,
  getYtDlpPath,
  getFfmpegLocation
};
