const g1 = require('./group1_2000s');
const g2 = require('./group2_2010s_romance');
const g3 = require('./group3_party_dance');
const g4 = require('./group4_2020s_trends');
const g5 = require('./group5_90s_nostalgia');
const g6 = require('./group6_evergreen_legends');
const verifiedYoutubeIds = require('./verified_youtube_ids.json');
const { translateHinglishVerseLiterally } = require('../literalTranslator');

const RAW_210_SONGS = [...g1, ...g2, ...g3, ...g4, ...g5, ...g6];

const CURATED_210_SONGS = RAW_210_SONGS.map((song, idx) => {
  const verified = verifiedYoutubeIds[idx];
  return {
    ...song,
    id: idx + 1,
    english_riddle_2: song.hinglish_lyrics_2
      ? translateHinglishVerseLiterally(song.hinglish_lyrics_2)
      : song.english_riddle_2,
    youtube_video_id:
      verified && verified.verified_yt_id
        ? verified.verified_yt_id
        : song.youtube_video_id,
    youtube_search_query:
      verified && verified.verified_title
        ? `${song.song_name} ${song.movie_name} ${song.artist} official`
        : song.youtube_search_query
  };
});

module.exports = {
  CURATED_210_SONGS
};
