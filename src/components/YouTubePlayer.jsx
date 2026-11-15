import React, { useState, useRef } from 'react';
import { ExternalLink, Play, Pause, AlertCircle, Music, Video, ShieldCheck, Headphones, Volume2 } from 'lucide-react';

export default function YouTubePlayer({
  videoId,
  searchQuery,
  songName,
  movieName,
  artist,
  spotifyTrackId,
  cardId
}) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'local-audio' | 'spotify'
  const [hasError, setHasError] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Known video intro bumper offsets (Saregama Music, Tips Official, Universal, Ishtar, Rajshri, etc.)
  const VIDEO_START_OFFSETS = {
    // Tips Official (10-15s channel subscribe promos)
    'JBCx0QyP8VQ': 13, // Pehli Nazar Mein
    'SqZbGOCuai4': 11, // Ishq Bina
    'onfy6y07ujQ': 11, // Ramta Jogi
    'Q1_WRkS5O6s': 10, // Tanha Tanha
    'zGaTGeFmd8U': 11, // Rangeela Re
    '11v9ALkOiio': 15, // Hai Rama

    // Saregama Music (5-13s Saregama / Carvaan intro bumpers)
    'a71xD6RyOok': 5,  // Zara Zara
    'hUVjx_RhMl0': 6,  // Sach Keh Raha Hai
    '0VX7xIvqJRk': 6,  // Tauba Tauba
    'yBYbfMeJvHA': 6,  // What Jhumka?
    'mHdneo9_yLM': 5,  // Tum Kya Mile
    'Pz_FkqA2x6s': 6,  // Ve Kamleya
    'nFmSK6eSINU': 6,  // Kudmayi
    'oHJ0Et1ob2c': 7,  // Dhindhora Baje Re
    '_hKJEqxn_OU': 6,  // Tujhe Dekha Toh
    'Ki41AKu0iHc': 7,  // Pehla Nasha
    'HttdS70G_3o': 5,  // Didi Tera Devar Deewana
    'KXkmrco12hI': 6,  // Pehla Pehla Pyar
    's_fdQXXDSLw': 6,  // Jadu Teri Nazar
    'Oj484P4OXD8': 7,  // Tu Mere Samne
    'wKQVoA9UVEQ': 5,  // Roop Tera Mastana
    'br6C4U3Dyfo': 6,  // Lag Ja Gale
    'g_O5lttb5ww': 13, // Kabhi Kabhie Mere Dil Mein
    'EiUDYzqdz2U': 8,  // Tere Bina Zindagi Se
    'RbSuFhzPgN8': 5,  // Tum Aa Gaye Ho Noor Aa Gaya
    'GUn3P5QyLRY': 5,  // Dum Maro Dum
    '5eyflIV8pzM': 6,  // O Mere Dil Ke Chain
    'qJy5GFoQSPg': 7,  // Dekha Ek Khwaab
    'q3IHX5ASUa4': 8,  // Rang Barse Bheege Chunarwali
    'BF5tVDJCAUM': 8,  // Om Shanti Om (Karz)
    '0iN6O3-8mLY': 5,  // Ek Hasina Thi
    'W6dKaCV-mJQ': 5,  // Kya Hua Tera Wada
    'zgcW44Id114': 10, // Bachna Ae Haseeno (1977)
    'd-0t_MOu-WM': 5,  // Ek Ladki Ko Dekha Toh
    'lfJKW2lmQTQ': 6,  // Rimjhim Gire Sawan
    'jsy5f55MAP0': 6,  // Pyar Deewana Hota Hai
    'AU-hut9lGQ4': 5,  // Ajeeb Dastaan Hai Yeh

    // Universal, Ishtar, Rajshri, YRF, Sony, T-Series, Zee intro bumpers
    '2uUmHTgT65I': 9,  // Dhoom Machale
    'hFhxuGMEMxg': 5,  // Chor Bazaari
    'qtRzUdBwM5E': 7,  // Genda Phool
    'ztPa6vkM-yY': 19, // Guzarish
    'sVRwZEkXepg': 37, // Hamari Adhuri Kahani
    '-sWXx1mbgtU': 6,  // Kar Gayi Chull
    'QcQpqWhTBCE': 8,  // Chikni Chameli
    'oJVVAf5kLEY': 26, // Sauda Khara Khara
    'RLzC55ai0eo': 6,  // Heeriye
    'tABlzTH8G9o': 6,  // Saari Duniya Jalaa Denge
    '9yGukg6SSZ4': 37, // Chaiyya Chaiyya
    '_YB1taxJPgk': 13, // Kehna Hi Kya
    'waTwDgK2tkk': 14, // Tu Hi Re
    'EK00yMk9sKc': 11, // Kaate Nahi Kat Te
    'XINI9JtypMw': 5   // Mere Samne Wali Khidki Mein
  };
  const startOffset = VIDEO_START_OFFSETS[videoId] || 0;

  // Generate hyper-accurate YouTube search query & direct video URL
  const primarySinger = artist ? artist.split(',')[0].split(';')[0].trim() : '';
  const query = searchQuery || `${songName} ${primarySinger} ${movieName} official video song`;
  const youtubeSearchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}${startOffset ? `&t=${startOffset}s` : ''}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  // Construct YouTube embed URL (matches the exact video & timestamp the 5s audio clip was cut from)
  let embedUrl = '';
  if (videoId) {
    embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${startOffset ? `&start=${startOffset}` : ''}`;
  } else {
    embedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
  }

  // Spotify embed URL
  const spotifyEmbedUrl = spotifyTrackId
    ? `https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`
    : null;

  const toggleLocalAudio = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  return (
    <div className="media-player-container">
      {/* Player Header with Tab Switcher */}
      <div className="player-tab-header">
        <div className="player-source-tabs">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`source-tab-btn ${activeTab === 'youtube' ? 'active' : ''}`}
          >
            <Video size={15} />
            <span>YouTube Video</span>
          </button>

          {cardId && (
            <button
              onClick={() => setActiveTab('local-audio')}
              className={`source-tab-btn local-tab ${activeTab === 'local-audio' ? 'active' : ''}`}
            >
              <Headphones size={15} className="text-amber-400" />
              <span>In-App Audio Clip</span>
            </button>
          )}

          {spotifyEmbedUrl && (
            <button
              onClick={() => setActiveTab('spotify')}
              className={`source-tab-btn spotify-tab ${activeTab === 'spotify' ? 'active' : ''}`}
            >
              <Music size={15} />
              <span>Spotify Link</span>
            </button>
          )}
        </div>

        {/* Direct Action Link */}
        <div className="player-actions-right">
          {activeTab === 'youtube' && (
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="youtube-external-btn"
              title="Open exact song on YouTube"
            >
              <span>Watch on YouTube</span>
              <ExternalLink size={13} />
            </a>
          )}
          {activeTab === 'spotify' && (
            <a
              href={`https://open.spotify.com/track/${spotifyTrackId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="spotify-external-btn"
              title="Open on Spotify"
            >
              <span>Open on Spotify</span>
              <ExternalLink size={13} />
            </a>
          )}
          {activeTab === 'local-audio' && (
            <a
              href={`/api/audio/${cardId}`}
              download={`${songName.replace(/[^a-zA-Z0-9]/g, '_')}_intro.mp3`}
              className="youtube-external-btn text-xs"
              title="Download local audio file"
            >
              <span>Download MP3</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Main Player Display */}
      {activeTab === 'youtube' && (
        <div className="youtube-view">
          <div className="youtube-frame-wrapper">
            {!hasError ? (
              <iframe
                src={embedUrl}
                title={`${songName} by ${artist} from ${movieName}`}
                width="560"
                height="315"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setHasError(true)}
                className="youtube-iframe"
              />
            ) : (
              <div className="youtube-fallback">
                <AlertCircle size={32} className="text-amber-400" />
                <p>This music video has third-party domain restrictions from the record label.</p>
                <div className="flex gap-2 mt-2">
                  {cardId && (
                    <button
                      onClick={() => setActiveTab('local-audio')}
                      className="btn btn-warning text-xs py-2 px-3"
                    >
                      <Headphones size={16} />
                      <span>Switch to Local In-App Audio (100% Works)</span>
                    </button>
                  )}
                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-xs py-2 px-3"
                  >
                    <Play size={16} />
                    <span>Watch on YouTube App</span>
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="player-caption-bar">
            <span>🎬 Official YouTube Video for <strong>"{songName}"</strong></span>
            {cardId && (
              <button
                onClick={() => setActiveTab('local-audio')}
                className="copyright-switch-hint"
              >
                Having video restrictions? Click for In-App Audio 🎧
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'local-audio' && cardId && (
        <div className="local-audio-view animate-fade-in p-4 bg-zinc-900/90 rounded-xl border border-amber-500/30 text-center">
          <audio
            ref={audioRef}
            src={`/audio_clips/${cardId}.mp3`}
            onEnded={() => setIsAudioPlaying(false)}
            onPause={() => setIsAudioPlaying(false)}
            onPlay={() => setIsAudioPlaying(true)}
            onError={(e) => {
              if (!e.target.dataset.retried) {
                e.target.dataset.retried = 'true';
                e.target.src = `/api/audio/${cardId}`;
              }
            }}
          />
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={toggleLocalAudio}
              className="btn btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-amber-500/20"
            >
              {isAudioPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <div className="text-left">
              <h4 className="font-bold text-amber-300 text-base">{songName}</h4>
              <p className="text-xs text-zinc-400">{movieName} • {artist}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            ⚡ Stored locally on the server. Zero third-party login or embed restrictions.
          </p>
        </div>
      )}

      {activeTab === 'spotify' && (
        <div className="spotify-view animate-fade-in">
          <div className="spotify-frame-wrapper">
            <iframe
              src={spotifyEmbedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`Spotify player for ${songName}`}
              className="spotify-iframe"
            />
          </div>
          <p className="spotify-caption">
            🟢 Spotify playback link. If your browser restricts embedded preview clips, tap "Open on Spotify" above.
          </p>
        </div>
      )}
    </div>
  );
}
