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

  // Known video intro bumper offsets (e.g., Hai Rama channel advert ends at 13s)
  const VIDEO_START_OFFSETS = {
    '11v9ALkOiio': 13
  };
  const startOffset = VIDEO_START_OFFSETS[videoId] || (songName === 'Hai Rama' ? 13 : 0);

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
