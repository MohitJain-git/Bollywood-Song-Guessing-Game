import React, { useState } from 'react';
import { ExternalLink, Play, AlertCircle, Music, Video, ShieldCheck } from 'lucide-react';

export default function YouTubePlayer({
  videoId,
  searchQuery,
  songName,
  movieName,
  artist,
  spotifyTrackId
}) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'spotify'
  const [hasError, setHasError] = useState(false);

  // Generate hyper-accurate YouTube search query including the singer/artist
  const primarySinger = artist ? artist.split(',')[0].split(';')[0].trim() : '';
  const query = searchQuery || `${songName} ${primarySinger} ${movieName} official video song`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  // Construct YouTube embed URL
  let embedUrl = '';
  if (videoId) {
    embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  } else {
    embedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
  }

  // Spotify embed URL
  const spotifyEmbedUrl = spotifyTrackId
    ? `https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`
    : null;

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

          {spotifyEmbedUrl && (
            <button
              onClick={() => setActiveTab('spotify')}
              className={`source-tab-btn spotify-tab ${activeTab === 'spotify' ? 'active' : ''}`}
            >
              <Music size={15} />
              <span>Spotify (Copyright-Safe)</span>
            </button>
          )}
        </div>

        {/* Direct Action Link */}
        <div className="player-actions-right">
          {activeTab === 'youtube' ? (
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
          ) : (
            <a
              href={`https://open.spotify.com/track/${spotifyTrackId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="spotify-external-btn"
              title="Open on Spotify"
            >
              <span>Play on Spotify</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Main Player Display */}
      {activeTab === 'youtube' ? (
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
                  {spotifyEmbedUrl && (
                    <button
                      onClick={() => setActiveTab('spotify')}
                      className="btn btn-success text-xs py-2 px-3"
                    >
                      <ShieldCheck size={16} />
                      <span>Switch to Spotify Player (100% Works)</span>
                    </button>
                  )}
                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-xs py-2 px-3"
                  >
                    <Play size={16} />
                    <span>Watch "{songName}" on YouTube</span>
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="player-caption-bar">
            <span>🎬 Official YouTube Video for <strong>"{songName}"</strong></span>
            {spotifyEmbedUrl && (
              <button
                onClick={() => setActiveTab('spotify')}
                className="copyright-switch-hint"
              >
                Having playback restrictions? Click for Spotify Audio 🟢
              </button>
            )}
          </div>
        </div>
      ) : (
        /* SPOTIFY WEB PLAYER (100% COPYRIGHT COMPLIANT) */
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
            🟢 Officially licensed Spotify audio stream. 100% free of domain copyright blocks.
          </p>
        </div>
      )}
    </div>
  );
}
