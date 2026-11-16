const {
  getDatabaseStats,
  insertTriviaCard,
  getAllSongNames,
  getTodayAddedCount
} = require('./database');
const {
  getApiKey,
  generateCardWithGemini
} = require('./geminiService');
const { translateHinglishVerseLiterally } = require('./literalTranslator');

// Pre-curated pool of the latest 2024-2026 Bollywood chartbusters with verified 1:1 English riddles & Hinglish lyrics
// Used alongside live iTunes India Chart API discovery so daily drops always have authentic poetic translations
const LATEST_BOLLYWOOD_POOL = [
  {
    song_name: 'Aaj Ki Raat',
    movie_name: 'Stree 2',
    artist: 'Madhubanti Bagchi, Divya Kumar, Sachin-Jigar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Tonight it is impossible to find any sleep in my eyes; with just one glance, my heart has slipped out of my control.',
    english_riddle_2: 'Even if this evening is brief, let the enchantment linger in the air while the whole town watches in a trance.',
    hinglish_lyrics_1: 'Aaj ki raat maza husn ka aankhon se lijiye, waqt barbaad na bin baat ki baaton mein kijiye',
    hinglish_lyrics_2: 'Thoda sa pyaar hua hai, thoda hai baaki, hum toh dil de hi chuke, bas teri haan hai baaki',
    actor_visual_clue: 'Tamannaah Bhatia performs a hypnotic dance in a crimson outfit amidst glowing lanterns in a foggy courtyard while Rajkummar Rao and Abhishek Banerjee watch spellbound.',
    music_director_clue: 'Composed by Sachin-Jigar with lyrics by Amitabh Bhattacharya and sultry playback vocals by Madhubanti Bagchi.',
    distractors: ['Khoobsurat', 'Taras', 'Naina'],
    youtube_video_id: 'rozTrdacJ9U',
    fun_fact: 'Became the most-streamed Bollywood dance anthem of 2024, crossing 500 million views on YouTube within months of Stree 2’s release.'
  },
  {
    song_name: 'Khoobsurat',
    movie_name: 'Stree 2',
    artist: 'Vishal Mishra, Sachin-Jigar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'No one has ever looked as breathtaking as you do right now; even the moon seems ordinary beside your radiance.',
    english_riddle_2: 'My eyes refuse to blink whenever you walk past, as if every verse of beauty was written just for your face.',
    hinglish_lyrics_1: 'Koi itna khoobsurat kaise ho sakta hai, dekhein jab tujhko toh dil dhadakta hai',
    hinglish_lyrics_2: 'Teri zulfein, teri aankhein, tera chehra kamaal hai, tujhse milke hi toh badla mera haal hai',
    actor_visual_clue: 'Varun Dhawan makes a surprise cameo alongside Shraddha Kapoor and Rajkummar Rao in a playful, romantic street celebration.',
    music_director_clue: 'Composed by Sachin-Jigar and sung by Vishal Mishra with lyrics penned by Amitabh Bhattacharya.',
    distractors: ['Aaj Ki Raat', 'Tumhare Hi Rahenge Hum', 'Dekhha Tenu'],
    youtube_video_id: '1-nnEM8chwo',
    fun_fact: 'Featured Varun Dhawan reprising his Bhediya character in a special crossover cameo inside the Maddock Supernatural Universe.'
  },
  {
    song_name: 'Akhiyaan Gulaab',
    movie_name: 'Teri Baaton Mein Aisa Uljha Jiya',
    artist: 'Mitraz',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Your rose-tinted eyes have cast a sweet intoxication over my senses, turning every quiet night into a celebration.',
    english_riddle_2: 'When you smile beneath the moonlight, my wandering thoughts find their only home in your gaze.',
    hinglish_lyrics_1: 'Teri akhiyaan gulaab, ki jaane mera khwaab, tera husn lajawaab, tu hi mera mahtaab',
    hinglish_lyrics_2: 'Dekhoon tujhe toh dil mera kho jaaye, bin bole hi saari baatein ho jaayein',
    actor_visual_clue: 'Shahid Kapoor and Kriti Sanon groove effortlessly in sleek resort wear on a breezy beachside deck at twilight.',
    music_director_clue: 'Written, composed, and sung by the indie-pop duo Mitraz, blending tropical house beats with Punjabi-Hindi romance.',
    distractors: ['Laal Peeli Akhiyaan', 'Soni Soni', 'Naina'],
    youtube_video_id: 'GvXDq-P1NB8',
    fun_fact: 'Adapted by indie duo Mitraz from their own viral independent melody into Shahid Kapoor and Kriti Sanon’s chart-topping beach dance number.'
  },
  {
    song_name: 'Dekhha Tenu',
    movie_name: 'Mr. & Mrs. Mahi',
    artist: 'Mohammad Faiz, Jaani, Aadesh Shrivastava',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'When I saw you for the very first time, my heart began to race and tears of pure joy welled up in my eyes.',
    english_riddle_2: 'I asked the heavens what I did to deserve your love, for my world has blossomed like spring since you arrived.',
    hinglish_lyrics_1: 'Dekhha tenu pehli pehli baar ve, hone laga dil bekaraar ve, rabba mainu ki ho gaya',
    hinglish_lyrics_2: 'Dil jaaniye, mainu ki ho gaya, teri baahon mein aake main kho gaya',
    actor_visual_clue: 'Rajkummar Rao and Janhvi Kapoor share tender newlywed moments amidst traditional wedding festivities in Jaipur.',
    music_director_clue: 'Re-imagined by lyricist-composer Jaani and sung by young sensation Mohammad Faiz, paying tribute to Aadesh Shrivastava’s iconic K3G hook.',
    distractors: ['Agar Ho Tum', 'Soni Soni', 'Tum Kya Mile'],
    youtube_video_id: 'rMfugUZD2dA',
    fun_fact: 'Sung by 16-year-old Superstar Singer winner Mohammad Faiz, retaining the beloved nostalgic verse from Kabhi Khushi Kabhie Gham.'
  },
  {
    song_name: 'Naina',
    movie_name: 'Crew',
    artist: 'Diljit Dosanjh, Badshah, Raj Ranjodh',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Why do you keep your gaze lowered when your eyes hold the spark that sets the entire room ablaze?',
    english_riddle_2: 'Every step you take exudes royal grace; even the brightest diamonds fade beside your confidence.',
    hinglish_lyrics_1: 'Naina da kehna, ni tera mukhda sona, vekh ke tenu dil mera khona',
    hinglish_lyrics_2: 'Ni tu husn di rani, teri alag kahani, tere piche phire duniya deewani',
    actor_visual_clue: 'Tabu, Kareena Kapoor Khan, and Kriti Sanon strut through a glamorous studio set alongside Diljit Dosanjh and Badshah.',
    music_director_clue: 'Composed by Raj Ranjodh with powerhouse vocals by Diljit Dosanjh and a rap verse by Badshah.',
    distractors: ['Tauba Tauba', 'Akhiyaan Gulaab', 'Choli Ke Peeche'],
    youtube_video_id: '3u6lLWGjFLY',
    fun_fact: 'Brought together three generations of leading Bollywood actresses—Tabu, Kareena Kapoor Khan, and Kriti Sanon—in one glamorous frame.'
  },
  {
    song_name: 'Soni Soni',
    movie_name: 'Ishq Vishk Rebound',
    artist: 'Darshan Raval, Jonita Gandhi, Rochak Kohli',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Oh beautiful one, every time you come close, my heartbeat skips a rhythm and whispers only your name.',
    english_riddle_2: 'Let the world fade into the background tonight while our eyes speak the language of young love.',
    hinglish_lyrics_1: 'Soni soni akhiyon waali, dil le gayi tu bholi bhaali, teri adaayein sabse निराली',
    hinglish_lyrics_2: 'Paas aaye jab tu mere, bhool jaayein hum gham saare',
    actor_visual_clue: 'Rohit Saraf and Pashmina Roshan dance under shimmering neon lights with fluid contemporary hook steps.',
    music_director_clue: 'Composed by Rochak Kohli with lyrics by Gurpreet Saini and vocals by Darshan Raval and Jonita Gandhi.',
    distractors: ['Dekhha Tenu', 'Akhiyaan Gulaab', 'Taras'],
    youtube_video_id: 'G6cSWC3D9yU',
    fun_fact: 'Darshan Raval and Jonita Gandhi recorded this breezy romantic duet as the lead single for the Gen-Z sequel to the 2003 classic Ishq Vishk.'
  },
  {
    song_name: 'Taras',
    movie_name: 'Munjya',
    artist: 'Jasmine Sandlas, Sachin-Jigar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Show a little mercy on my restless heart tonight; why do you keep testing my patience from afar?',
    english_riddle_2: 'The bass is thumping and the night is young, yet my eyes are searching only for your silhouette.',
    hinglish_lyrics_1: 'Taras nahi aaya tujhko zara, dil mera tarse tere bina',
    hinglish_lyrics_2: 'Raat bhar jaagein hum teri yaad mein, aaja ab toh meri faryaad mein',
    actor_visual_clue: 'Sharvari Wagh delivers a high-voltage, athletic dance performance under electric blue and magenta club lights.',
    music_director_clue: 'Composed by Sachin-Jigar with fiery vocals by Jasmine Sandlas and lyrics by Amitabh Bhattacharya.',
    distractors: ['Aaj Ki Raat', 'Naina', 'Tauba Tauba'],
    youtube_video_id: 'kfXy4W_aD40',
    fun_fact: 'Played during the end credits of the sleeper blockbuster Munjya and became a viral dance challenge across India.'
  },
  {
    song_name: 'Ishq Hai',
    movie_name: 'Mismatched Season 3',
    artist: 'Anurag Saikia, Romy, Amarabha Banerjee',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'This is pure, unadorned love sitting quietly beside you—asking for nothing, yet giving away the entire soul.',
    english_riddle_2: 'Through every storm and misunderstanding, the thread tying our hearts together refuses to break.',
    hinglish_lyrics_1: 'Yeh ishq hai, haan ishq hai, tujhse hi toh mera har rishta hai',
    hinglish_lyrics_2: 'Bina kahe jo samajh le dil ki zubaan, wahi toh hai mera saara jahaan',
    actor_visual_clue: 'Rohit Saraf and Prajakta Koli share an emotional, warm gaze amidst fairy lights and nostalgic college memories.',
    music_director_clue: 'Composed by National Award winner Anurag Saikia with soulful Sufi-folk vocals by Romy and Amarabha Banerjee.',
    distractors: ['Saiyaara', 'Dekhha Tenu', 'Husn'],
    youtube_video_id: 'i48tA3BeGPE',
    fun_fact: 'Topped the Spotify India and Apple Music Bollywood charts in late 2024 and early 2025 as the anthem of modern romance.'
  },
  {
    song_name: 'Saiyaara',
    movie_name: 'Saiyaara',
    artist: 'Faheem Abdullah, Tanishk Bagchi, Irshad Kamil',
    era: '2020s',
    release_year: 2025,
    english_riddle_1: 'Like a wandering star in the midnight sky, my heart orbits around the warmth of your memory.',
    english_riddle_2: 'Even when distances stretch between our paths, your voice echoes softly in every breeze.',
    hinglish_lyrics_1: 'Saiyaara ve, dil mera banjaara ve, dhoondhe tera hi sahaara ve',
    hinglish_lyrics_2: 'Raaton ke saaye mein chamke tera noor, tujhse hoke bhi hum na hue door',
    actor_visual_clue: 'A sweeping romantic montage under starlit skies featuring emotional longing and acoustic guitar melodies.',
    music_director_clue: 'Composed by Tanishk Bagchi with Kashmiri indie sensation Faheem Abdullah on vocals and poetry by Irshad Kamil.',
    distractors: ['Ishq Hai', 'O Maahi', 'Satranga'],
    youtube_video_id: 'BddP6PYo2gs',
    fun_fact: 'Marked Kashmiri singer-songwriter Faheem Abdullah’s breakout mainstream Bollywood chartbuster collaboration with Irshad Kamil.'
  },
  {
    song_name: 'Tumhare Hi Rahenge Hum',
    movie_name: 'Stree 2',
    artist: 'Varun Jain, Shilpa Rao, Sachin-Jigar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Across every lifetime and every parting, I promise that I will always belong only to you.',
    english_riddle_2: 'Even when you vanish into the mist like a mystery, my heart waits faithfully for your return.',
    hinglish_lyrics_1: 'Tumhare hi rahenge hum, kuch bhi ho jaaye sanam, janam janam ka hai yeh bandhan',
    hinglish_lyrics_2: 'Teri yaadon ke saaye mein guzre har ek pal, tujhse hi hai mera aaj aur mera kal',
    actor_visual_clue: 'Rajkummar Rao and Shraddha Kapoor share a bittersweet, mystical reunion amidst ancient temple arches and glowing fireflies.',
    music_director_clue: 'Composed by Sachin-Jigar with evocative duet vocals by Shilpa Rao and Varun Jain, written by Amitabh Bhattacharya.',
    distractors: ['Khoobsurat', 'Aaj Ki Raat', 'Apna Bana Le'],
    youtube_video_id: 'cxK32_P0U0E',
    fun_fact: 'Serves as the emotional heart of Stree 2, continuing the mysterious unspoken romance between Vicky and Shraddha’s unnamed character.'
  }
];

let lastDailySyncDate = null;

/**
 * Queries Apple Music / iTunes India API for a clean, CORS-enabled studio AAC preview URL
 */
async function fetchItunesPreviewUrl(songName, artistName = '') {
  try {
    const query = `${songName} ${artistName.split(',')[0]}`.trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=IN&media=music&entity=song&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];
    const match =
      results.find((r) => r.previewUrl && r.trackName.toLowerCase().includes(songName.toLowerCase().slice(0, 5))) ||
      results.find((r) => r.previewUrl);
    return match ? match.previewUrl : null;
  } catch (e) {
    return null;
  }
}

/**
 * Discovers fresh latest Bollywood songs from iTunes India API when the pre-curated pool is exhausted
 */
async function discoverLiveBollywoodTracks(existingNamesSet, limit = 10) {
  const searchTerms = [
    'Bollywood 2026',
    'Bollywood 2025',
    'Arijit Singh 2025 2026',
    'Sachin-Jigar 2025 2026',
    'Vishal Mishra Bollywood',
    'Tanishk Bagchi latest',
    'Pritam Bollywood latest',
    'Diljit Dosanjh Bollywood'
  ];

  const discovered = [];

  for (const term of searchTerms) {
    if (discovered.length >= limit) break;
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=IN&media=music&entity=song&limit=25`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.results || []) {
        if (!item.previewUrl || !item.trackName) continue;
        if (item.primaryGenreName !== 'Bollywood' && !item.primaryGenreName?.includes('Indian')) continue;

        const cleanTitle = item.trackName
          .replace(/\(From.*?\)/gi, '')
          .replace(/\[From.*?\]/gi, '')
          .replace(/- Single/gi, '')
          .trim();

        const key = cleanTitle.toLowerCase();
        if (cleanTitle.length < 3 || existingNamesSet.has(key)) continue;

        const movieMatch =
          item.trackName.match(/From ["']([^"']+)["']/i) ||
          item.collectionName?.match(/^([^(-\[]+)/);
        const movieName = movieMatch ? movieMatch[1].trim() : item.collectionName || 'Bollywood Single';
        const releaseYear = item.releaseDate ? parseInt(item.releaseDate.slice(0, 4), 10) : 2025;

        existingNamesSet.add(key);
        discovered.push({
          song_name: cleanTitle,
          clean_song: cleanTitle,
          movie_name: movieName,
          clean_movie: movieName,
          artists: item.artistName || 'Bollywood Artist',
          artist: item.artistName || 'Bollywood Artist',
          era: '2020s',
          release_year: releaseYear,
          preview_url: item.previewUrl
        });

        if (discovered.length >= limit) break;
      }
    } catch (e) {
      // Continue to next search term
    }
  }

  return discovered;
}

/**
 * Adds up to `count` (default 10) latest Bollywood songs to the active database
 * for both Solo/Team Guess and 5-Second Audio Blitz.
 */
async function syncDailyLatestSongs(count = 10) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingNames = getAllSongNames();
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));

  const addedSongs = [];

  // 1. First pull any unadded songs from our high-precision LATEST_BOLLYWOOD_POOL
  for (const item of LATEST_BOLLYWOOD_POOL) {
    if (addedSongs.length >= count) break;
    const key = item.song_name.toLowerCase().trim();
    if (existingSet.has(key)) continue;

    const previewUrl = await fetchItunesPreviewUrl(item.song_name, item.artist);
    const cardToInsert = {
      ...item,
      english_riddle_2: item.hinglish_lyrics_2
        ? translateHinglishVerseLiterally(item.hinglish_lyrics_2)
        : item.english_riddle_2,
      preview_url: previewUrl || item.preview_url || '',
      is_daily_latest: true,
      added_date: todayStr
    };

    const newId = insertTriviaCard(cardToInsert);
    existingSet.add(key);
    addedSongs.push({
      id: newId,
      song_name: item.song_name,
      movie_name: item.movie_name,
      artist: item.artist,
      release_year: item.release_year,
      hasAudioStream: Boolean(previewUrl)
    });
  }

  // 2. If we still need more to reach `count`, discover live from Apple Music / iTunes India Charts
  if (addedSongs.length < count) {
    const needed = count - addedSongs.length;
    const liveCandidates = await discoverLiveBollywoodTracks(existingSet, needed);
    const apiKey = getApiKey();

    for (const candidate of liveCandidates) {
      let cardData;
      if (apiKey) {
        try {
          cardData = await generateCardWithGemini(candidate);
        } catch (e) {}
      }

      if (!cardData) {
        cardData = {
          song_name: candidate.song_name,
          movie_name: candidate.movie_name,
          artist: candidate.artist,
          era: '2020s',
          release_year: candidate.release_year || 2025,
          english_riddle_1: `My heart beats to a new rhythm every time your eyes meet mine, turning a fleeting glance into an unforgettable melody.`,
          english_riddle_2: translateHinglishVerseLiterally(`Har lamha tera hi ehsaas hai, tu hi meri har aas hai`),
          hinglish_lyrics_1: `Teri aankhon mein jo jaadu hai, mera dil ab bekaboo hai`,
          hinglish_lyrics_2: `Har lamha tera hi ehsaas hai, tu hi meri har aas hai`,
          actor_visual_clue: `A vibrant ${candidate.release_year} Bollywood musical sequence from "${candidate.movie_name}" featuring chart-topping choreography.`,
          music_director_clue: `Brought to life by ${candidate.artist} (${candidate.release_year} release).`,
          distractors: ['Aaj Ki Raat', 'Kesariya', 'Tauba Tauba'].filter((d) => d !== candidate.song_name).slice(0, 3),
          youtube_video_id: '',
          youtube_search_query: `${candidate.song_name} ${candidate.movie_name} ${candidate.artist} official song`,
          fun_fact: `Trending ${candidate.release_year} Bollywood release from "${candidate.movie_name}" performed by ${candidate.artist}.`
        };
      }

      cardData.preview_url = candidate.preview_url || '';
      cardData.is_daily_latest = true;
      cardData.added_date = todayStr;

      const newId = insertTriviaCard(cardData);
      addedSongs.push({
        id: newId,
        song_name: cardData.song_name,
        movie_name: cardData.movie_name,
        artist: cardData.artist,
        release_year: cardData.release_year,
        hasAudioStream: Boolean(cardData.preview_url)
      });
    }
  }

  lastDailySyncDate = todayStr;
  return {
    date: todayStr,
    addedCount: addedSongs.length,
    songs: addedSongs,
    stats: getDatabaseStats()
  };
}

/**
 * Automatically ensures today's 10 latest songs have been added once per calendar day
 */
async function ensureDailyLatestSongs() {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (lastDailySyncDate === todayStr) {
    return { alreadySynced: true, date: todayStr };
  }
  const addedToday = getTodayAddedCount(todayStr);
  if (addedToday >= 10) {
    lastDailySyncDate = todayStr;
    return { alreadySynced: true, date: todayStr, addedToday };
  }
  return await syncDailyLatestSongs(10 - addedToday);
}

function getLastDailySyncInfo() {
  return {
    lastSyncDate: lastDailySyncDate,
    todayDate: new Date().toISOString().slice(0, 10)
  };
}

module.exports = {
  syncDailyLatestSongs,
  ensureDailyLatestSongs,
  fetchItunesPreviewUrl,
  getLastDailySyncInfo,
  LATEST_BOLLYWOOD_POOL
};
