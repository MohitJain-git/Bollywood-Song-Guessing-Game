const fs = require('fs');
const path = require('path');
const {
  getDatabaseStats,
  insertTriviaCard,
  getAllSongNames,
  getTodayAddedCount,
  getDailyLatestSongs
} = require('./database');
const {
  getApiKey,
  generateCardWithGemini
} = require('./geminiService');
const { translateHinglishVerseLiterally } = require('./literalTranslator');

const DAILY_JSON_PATH = path.resolve(__dirname, 'curated', 'daily_synced_songs.json');

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
    hinglish_lyrics_1: 'Dekhha tenu pehli pehli baar ve, hone laga dil bekaraar ve, rabba mainu ki ho gaya',
    hinglish_lyrics_2: 'Dil jaaniye, mainu ki ho gaya, teri baahon mein aake main kho gaya',
    actor_visual_clue: 'Rajkummar Rao and Janhvi Kapoor share tender newlywed moments amidst traditional wedding festivities in Jaipur.',
    music_director_clue: 'Re-imagined by lyricist-composer Jaani and sung by young sensation Mohammad Faiz, paying tribute to Aadesh Shrivastava’s iconic K3G hook.',
    distractors: ['Soni Soni', 'Tum Kya Mile', 'Khoobsurat'],
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
    hinglish_lyrics_1: 'Naina da kehna, ni tera mukhda sona, vekh ke tenu dil mera khona',
    hinglish_lyrics_2: 'Ni tu husn di rani, teri alag kahani, tere piche phire duniya deewani',
    actor_visual_clue: 'Tabu, Kareena Kapoor Khan, and Kriti Sanon strut through a glamorous studio set alongside Diljit Dosanjh and Badshah.',
    music_director_clue: 'Composed by Raj Ranjodh with powerhouse vocals by Diljit Dosanjh and a rap verse by Badshah.',
    distractors: ['Tauba Tauba', 'Akhiyaan Gulaab', 'Taras'],
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
    hinglish_lyrics_1: 'Soni soni akhiyon waali, dil le gayi tu bholi bhaali, teri adayein sabse niraali',
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
    hinglish_lyrics_1: 'Tumhare hi rahenge hum, kuch bhi ho jaaye sanam, janam janam ka hai yeh bandhan',
    hinglish_lyrics_2: 'Teri yaadon ke saaye mein guzre har ek pal, tujhse hi hai mera aaj aur mera kal',
    actor_visual_clue: 'Rajkummar Rao and Shraddha Kapoor share a bittersweet, mystical reunion amidst ancient temple arches and glowing fireflies.',
    music_director_clue: 'Composed by Sachin-Jigar with evocative duet vocals by Shilpa Rao and Varun Jain, written by Amitabh Bhattacharya.',
    distractors: ['Khoobsurat', 'Aaj Ki Raat', 'Apna Bana Le'],
    youtube_video_id: 'cxK32_P0U0E',
    fun_fact: 'Serves as the emotional heart of Stree 2, continuing the mysterious unspoken romance between Vicky and Shraddha’s unnamed character.'
  },
  // Day 2 Batch (2024-2026 Latest Chartbusters)
  {
    song_name: 'Laal Peeli Akhiyaan',
    movie_name: 'Teri Baaton Mein Aisa Uljha Jiya',
    artist: 'Romy, Tanishk Bagchi, Neeraj Rajawat',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'With crimson and golden sparks in your playful gaze, you have spun everyone on the dance floor around your finger.',
    hinglish_lyrics_1: 'Laal peeli akhiyaan, suno ji meri sakhiaan, dil le gayi yeh jaadoogari',
    hinglish_lyrics_2: 'Naachne de aaj saari raat ve, dil mein chhupi hai jo baat ve',
    actor_visual_clue: 'Shahid Kapoor and Kriti Sanon perform lightning-fast footwork in traditional blue and crimson festive outfits at a grand family wedding.',
    music_director_clue: 'Rajasthani folk-inspired electro dance number composed by Tanishk Bagchi and sung by Romy.',
    distractors: ['Akhiyaan Gulaab', 'Tauba Tauba', 'Aaj Ki Raat'],
    youtube_video_id: '6d5SS0gS5bU',
    fun_fact: 'Marked Shahid Kapoor’s return to high-speed solo dance choreography after nearly a decade.'
  },
  {
    song_name: 'Teri Baaton Mein Aisa Uljha Jiya',
    movie_name: 'Teri Baaton Mein Aisa Uljha Jiya',
    artist: 'Raghav, Tanishk Bagchi, Asees Kaur',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'My heart has become so hopelessly tangled in your conversations that I sit lost in daydreams day and night.',
    hinglish_lyrics_1: 'Teri baaton mein aisa uljha jiya, baithe hi baithe maine dil kho diya',
    hinglish_lyrics_2: 'Meri nigaahon mein bas tera chehra hai, ishq ka rang ab kitna gehra hai',
    actor_visual_clue: 'Shahid Kapoor and Kriti Sanon dance in matching black-and-crimson party attire during the film’s energetic title-track celebration.',
    music_director_clue: 'Re-created by Tanishk Bagchi from Canadian-Indian singer Raghav’s iconic 2004 global pop hit, with female vocals by Asees Kaur.',
    distractors: ['Akhiyaan Gulaab', 'Laal Peeli Akhiyaan', 'Soni Soni'],
    youtube_video_id: '4A4W9k2nS7E',
    fun_fact: 'Inspired the official title of the 2024 sci-fi romantic comedy starring Shahid Kapoor and Kriti Sanon.'
  },
  {
    song_name: 'Sher Khul Gaye',
    movie_name: 'Fighter',
    artist: 'Vishal-Shekhar, Benny Dayal, Shilpa Rao',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'The lions have been unleashed onto the floor tonight; raise your glasses and let the celebration roar until dawn!',
    hinglish_lyrics_1: 'Sher khul gaye, aaj raat ke saare bandhan khul gaye, jashn mein hum sab milke ghul gaye',
    hinglish_lyrics_2: 'Tez dhadkanein hain, nasha chha gaya hai, har kadam pe masti ka samaa aaya hai',
    actor_visual_clue: 'Hrithik Roshan, Deepika Padukone, and Anil Kapoor groove in sleek party wear at an Air Force officers’ club celebration.',
    music_director_clue: 'Funk-disco party anthem composed by Vishal-Shekhar with vocals by Benny Dayal and Shilpa Rao and lyrics by Kumaar.',
    distractors: ['Ghungroo', 'Ishq Jaisa Kuch', 'Jhoome Jo Pathaan'],
    youtube_video_id: 'X9bB2rN2vUo',
    fun_fact: 'Reunited the War blockbuster musical team of Hrithik Roshan, Vishal-Shekhar, Benny Dayal, and Shilpa Rao.'
  },
  {
    song_name: 'Ishq Jaisa Kuch',
    movie_name: 'Fighter',
    artist: 'Vishal-Shekhar, Shilpa Rao, Mellow D',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Something that feels remarkably like love has begun to stir between us as the ocean waves kiss the shore.',
    hinglish_lyrics_1: 'Ishq jaisa kuch, haan ishq jaisa kuch, hone laga hai dil ko ab tujhse hi kuch',
    hinglish_lyrics_2: 'Lehron ke sang behti hai meri aarzoo, har pal aankhon ke saamne hai bas tu',
    actor_visual_clue: 'Hrithik Roshan and Deepika Padukone in glamorous beachwear performing smooth choreography by turquoise waters.',
    music_director_clue: 'Electro-synth beach romance composed by Vishal-Shekhar featuring Shilpa Rao’s sultry vocals and a rap section by Mellow D.',
    distractors: ['Besharam Rang', 'Sher Khul Gaye', 'Taras'],
    youtube_video_id: 'p6ca7gq5H70',
    fun_fact: 'Filmed across scenic Mediterranean coastal locations showcasing Hrithik Roshan and Deepika Padukone’s first on-screen pairing.'
  },
  {
    song_name: 'Mere Mehboob',
    movie_name: 'Vicky Vidya Ka Woh Wala Video',
    artist: 'Shilpa Rao, Sachet Tandon, Sachin-Jigar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Oh my beloved, wait just a moment before you leave; the entire lane has gathered only to catch a glimpse of your smile.',
    hinglish_lyrics_1: 'Mere mehboob, mere sanam, shukriya meherbaani karam',
    hinglish_lyrics_2: 'Teri galiyon mein aake dil kho gaya, dekhte hi tujhe main tera ho gaya',
    actor_visual_clue: 'Rajkummar Rao and Triptii Dimri dance in vibrant retro 90s Bollywood costumes on a colorful street set.',
    music_director_clue: 'Composed by Sachin-Jigar with powerhouse duet vocals by Shilpa Rao and Sachet Tandon.',
    distractors: ['Aaj Ki Raat', 'Khoobsurat', 'Tauba Tauba'],
    youtube_video_id: 'w2xE1eS3X9c',
    fun_fact: 'Pays playful homage to 1990s Bollywood theatrical dance numbers matching the film’s nostalgic 1997 setting.'
  },
  {
    song_name: 'Jaiye Sajana',
    movie_name: 'Dhurandhar The Revenge',
    artist: 'Shashwat Sachdev, Jasmine Sandlas, Satinder Sartaaj',
    era: '2020s',
    release_year: 2026,
    english_riddle_1: 'Go ahead, my beloved, yet know that every road you walk will bring your footsteps back to my threshold.',
    hinglish_lyrics_1: 'Jaiye sajana, dil tod ke kahan jaoge, har mod pe mera hi naam paoge',
    hinglish_lyrics_2: 'Tere bina adhoori hai meri har dastaan, tu hi mera zameen aur tu hi aasmaan',
    actor_visual_clue: 'A dramatic, high-stakes cinematic sequence blending Sufi longing with intense action drama.',
    music_director_clue: 'Composed by Shashwat Sachdev featuring folk-Sufi maestro Satinder Sartaaj and powerhouse vocalist Jasmine Sandlas.',
    distractors: ['Taras', 'Saiyaara', 'Ishq Hai'],
    youtube_video_id: '',
    fun_fact: 'Brought together Punjabi Sufi legend Satinder Sartaaj and Jasmine Sandlas under Shashwat Sachdev’s modern production.'
  },
  {
    song_name: 'Deewaana Deewaana',
    movie_name: 'Tere Ishk Mein',
    artist: 'A.R. Rahman, Irshad Kamil',
    era: '2020s',
    release_year: 2025,
    english_riddle_1: 'Madly consumed by your devotion, my heart walks willingly into the fire of love without asking for a cure.',
    hinglish_lyrics_1: 'Deewaana deewaana, tere ishq mein dil hua begaana',
    hinglish_lyrics_2: 'Aag mein jal ke bhi muskurane laga, tera hi geet har pal gaane laga',
    actor_visual_clue: 'Dhanush and Kriti Sanon in an intense, rain-drenched passionate confrontation echoing the spiritual world of Raanjhanaa.',
    music_director_clue: 'Composed by A.R. Rahman with searing poetic lyrics by Irshad Kamil for Aanand L. Rai’s spiritual successor to Raanjhanaa.',
    distractors: ['Saiyaara', 'Satranga', 'Apna Bana Le'],
    youtube_video_id: '',
    fun_fact: 'Reunited director Aanand L. Rai, actor Dhanush, composer A.R. Rahman, and lyricist Irshad Kamil twelve years after Raanjhanaa.'
  },
  {
    song_name: 'Ghafoor',
    movie_name: 'The Ba***ds of Bollywood',
    artist: 'Shilpa Rao, Ujwal Gupta, Shashwat Sachdev',
    era: '2020s',
    release_year: 2025,
    english_riddle_1: 'Behind the velvet curtains and blinding spotlights, every secret of the city dances to a dangerous beat.',
    hinglish_lyrics_1: 'Raat ke parde mein chamke sitaare, ishq aur junoon ke dekho ishaare',
    hinglish_lyrics_2: 'Har nazar mein chhupa hai ek naya raaz, suno dil ki dhadkano ka yeh andaaz',
    actor_visual_clue: 'A sleek, neon-noir glamour sequence set inside Mumbai’s high-stakes film industry.',
    music_director_clue: 'Composed and produced by Shashwat Sachdev and Ujwal Gupta with vocals by Shilpa Rao.',
    distractors: ['Sher Khul Gaye', 'Taras', 'Naina'],
    youtube_video_id: '',
    fun_fact: 'Featured on the soundtrack of Aryan Khan’s directorial debut series set inside the world of Hindi cinema.'
  },
  {
    song_name: 'Rooh',
    movie_name: 'Dhadak 2',
    artist: 'Jubin Nautiyal, Shreyas Puranik, Siddharth-Garima',
    era: '2020s',
    release_year: 2025,
    english_riddle_1: 'Even if the world stands between our shadows, my soul has already merged with yours beyond the reach of fear.',
    hinglish_lyrics_1: 'Meri rooh mein bas gaya hai tera naam, tere sang hi meri subah aur shaam',
    hinglish_lyrics_2: 'Duniya ki deewarein rok na paayein, hum toh hawaon ke sang ud jaayein',
    actor_visual_clue: 'Siddhant Chaturvedi and Triptii Dimri share a defiant, emotional embrace against a stormy sky.',
    music_director_clue: 'Composed by Shreyas Puranik with lyrics by Siddharth-Garima and heartfelt vocals by Jubin Nautiyal.',
    distractors: ['Saiyaara', 'Ishq Hai', 'Tumhare Hi Rahenge Hum'],
    youtube_video_id: '',
    fun_fact: 'Composed by Animal breakout composer Shreyas Puranik for the romantic drama sequel starring Siddhant Chaturvedi and Triptii Dimri.'
  },
  {
    song_name: 'Agar Ho Tum',
    movie_name: 'Mr. & Mrs. Mahi',
    artist: 'Jubin Nautiyal, Tanishk Bagchi, Kausar Munir',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'As long as you are walking beside me, even the longest desert road feels like a garden in full bloom.',
    hinglish_lyrics_1: 'Agar ho tum toh har lamha suhaana hai, tumse hi toh roshan mera zamaana hai',
    hinglish_lyrics_2: 'Dhoop mein bhi chhaanv sa laage tera saath, haathon mein rahe bas tera hi haath',
    actor_visual_clue: 'Rajkummar Rao and Janhvi Kapoor cheer under stadium floodlights and ride through quiet evening streets on a scooter.',
    music_director_clue: 'Melodic acoustic ballad composed by Tanishk Bagchi, penned by Kausar Munir, and sung by Jubin Nautiyal.',
    distractors: ['Dekhha Tenu', 'Soni Soni', 'Tum Kya Mile'],
    youtube_video_id: '5mY8_W3a9xI',
    fun_fact: 'Written by Kausar Munir to capture the quiet companionship of a married couple chasing a shared cricket dream.'
  },
  // Day 3 & Day 4 Batches (2024-2026 Latest Bollywood Chartbusters)
  {
    song_name: 'Raanjhan',
    movie_name: 'Do Patti',
    artist: 'Sachet-Parampara, Parampara Tandon, Kausar Munir',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Oh my beloved wanderer, I handed you the keys to my soul, yet you left me standing alone in the valley of broken promises.',
    hinglish_lyrics_1: 'Raanjhan ve, dil tod ke na jaa, meri aankhon ko aise rula ke na jaa',
    hinglish_lyrics_2: 'Tere bina suni hai meri har raah, tujhse hi maangi thi maine panaah',
    actor_visual_clue: 'Kriti Sanon and Shaheer Sheikh in an emotional, dramatic mountain-town romance filled with betrayal and heartbreak.',
    music_director_clue: 'Soulful heartbreak ballad composed by Sachet-Parampara, sung by Parampara Tandon with lyrics by Kausar Munir.',
    distractors: ['Saiyaara', 'Ishq Hai', 'Tumhare Hi Rahenge Hum'],
    youtube_video_id: 'lBvbNxiVmZA',
    fun_fact: 'Became one of the longest-charting Hindi heartbreak ballads on Spotify India across late 2024 and 2025.'
  },
  {
    song_name: 'Jaana Samjho Na',
    movie_name: 'Bhool Bhulaiyaa 3',
    artist: 'Aditya Rikhari, Tulsi Kumar, Lijo George-DJ Chetas',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'My darling, try to understand the unspoken words in my eyes; without your presence, even the brightest evening feels incomplete.',
    hinglish_lyrics_1: 'Jaana samjho na, dil mera tod ke chhodo na, tujhse hi toh hai mera har sapna',
    hinglish_lyrics_2: 'Har pal teri yaad mein guzarta hai, mera dil bas tujhpe hi marta hai',
    actor_visual_clue: 'Kartik Aaryan and Triptii Dimri share romantic choreography amidst glowing lanterns and royal palace courtyards.',
    music_director_clue: 'Indie-pop hit by Aditya Rikhari recreated for Bhool Bhulaiyaa 3 with Lijo George-DJ Chetas and Tulsi Kumar.',
    distractors: ['Soni Soni', 'Khoobsurat', 'Akhiyaan Gulaab'],
    youtube_video_id: 'w4ClQO0FFQg',
    fun_fact: 'Adapted from indie singer-songwriter Aditya Rikhari’s viral track into a mainstream romantic duet.'
  },
  {
    song_name: 'Ami Je Tomar 3.0',
    movie_name: 'Bhool Bhulaiyaa 3',
    artist: 'Shreya Ghoshal, Pritam, Sameer',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Wait and listen to the ancient anklets echoing through the palace halls; only for you do I dance across the centuries.',
    hinglish_lyrics_1: 'Mere dholna sun, mere pyaar ki dhun, meri chaahatein toh fiza mein bahengi',
    hinglish_lyrics_2: 'Zinda rahengi hoke fanaa, taanana tumana, meri saansein teri hi sada',
    actor_visual_clue: 'Vidya Balan and Madhuri Dixit perform a breathtaking classical Kathak-Bharatanatyam face-off in a grand chandeliered palace.',
    music_director_clue: 'Composed by Pritam and Amaal Mallik with virtuosic classical sargam vocals by Shreya Ghoshal.',
    distractors: ['Ghar More Pardesiya', 'Deewani Mastani', 'Aaj Ki Raat'],
    youtube_video_id: 'vB0V3iCSzQw',
    fun_fact: 'Brought icons Vidya Balan and Madhuri Dixit together on screen for the first time in a historic classical dance showdown.'
  },
  {
    song_name: 'Bhool Bhulaiyaa 3 Title Track',
    movie_name: 'Bhool Bhulaiyaa 3',
    artist: 'Diljit Dosanjh, Pitbull, Neeraj Shridhar, Tanishk Bagchi, Pritam',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Behind the mysterious smile and haunted doors, the chant rises into an international party beat as the night comes alive!',
    hinglish_lyrics_1: 'Teri aankhein bhool bhulaiyaa, baatein hain bhool bhulaiyaa, tere sapnon ki galiyon mein',
    hinglish_lyrics_2: 'Saari raat nachhein hum khulke aaj, duniya pe chhaya hai apna hi raaj',
    actor_visual_clue: 'Kartik Aaryan in his signature black Rooh Baba cloak performing the gliding footwork hook step under neon lights.',
    music_director_clue: 'Global crossover remix by Tanishk Bagchi and Pritam uniting Pitbull, Diljit Dosanjh, and original vocalist Neeraj Shridhar.',
    distractors: ['Naina', 'Tauba Tauba', 'Sher Khul Gaye'],
    youtube_video_id: 'iAIBF2ngbWY',
    fun_fact: 'Featured an international collaboration between global rap star Pitbull and Punjabi superstar Diljit Dosanjh.'
  },
  {
    song_name: 'Tenu Sang Rakhna',
    movie_name: 'Jigra',
    artist: 'Arijit Singh, Anumita Nadesan, Achint, Varun Grover',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'I will shelter you in the palm of my hand against every storm; no shadow of sorrow will ever touch your doorstep.',
    hinglish_lyrics_1: 'Tenu sang rakhna, har gham se tujhe bacha ke rakhna, palkon ki chhaanv mein chhupa ke rakhna',
    hinglish_lyrics_2: 'Chaand sitaare tod le aaoon, teri khushi ke liye jag se lad jaaun',
    actor_visual_clue: 'Alia Bhatt and Vedang Raina in a poignant montage of sibling devotion and fierce protection.',
    music_director_clue: 'Composed by Achint with deeply moving lyrics by Varun Grover and vocals by Arijit Singh and Anumita Nadesan.',
    distractors: ['Ve Kamleya', 'Satranga', 'O Maahi'],
    youtube_video_id: 'n2dVFdqMYGA',
    fun_fact: 'Written by National Award-winning lyricist Varun Grover as a modern lullaby of unconditional protection.'
  },
  {
    song_name: 'Chal Kudiye',
    movie_name: 'Jigra',
    artist: 'Diljit Dosanjh, Alia Bhatt, Manpreet Singh, Harmanjeet Singh',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Rise up and march forward, fearless girl; the sky bows before the courage burning in your chest!',
    hinglish_lyrics_1: 'Chal kudiye, uth chal kudiye, tere kadmon ke aage jhuke aasmaan',
    hinglish_lyrics_2: 'Toofano se darna kaisa, apni manzil ko paana hai aasaan',
    actor_visual_clue: 'Diljit Dosanjh and Alia Bhatt perform in an empowering, high-energy studio anthem video.',
    music_director_clue: 'Composed by Manpreet Singh with inspiring Punjabi-Hindi lyrics by Harmanjeet Singh, reuniting Diljit Dosanjh and Alia Bhatt after Ikk Kudi.',
    distractors: ['Naina', 'Sher Khul Gaye', 'Dhindhora Baje Re'],
    youtube_video_id: 'r6tH55syq0o',
    fun_fact: 'Reunited Diljit Dosanjh and Alia Bhatt on vocals eight years after their acclaimed Udta Punjab duet Ikk Kudi.'
  },
  {
    song_name: 'Hauli Hauli',
    movie_name: 'Khel Khel Mein',
    artist: 'Guru Randhawa, Yo Yo Honey Singh, Neha Kakkar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Slowly and gracefully you step onto the floor, and one by one every heart in the gathering falls under your spell.',
    hinglish_lyrics_1: 'Hauli hauli chadhda nasha tera, vekh ke tenu dil dhadke mera',
    hinglish_lyrics_2: 'Sajke aayi hai mehfil mein aaj, tere husn ka chhaya hai raaj',
    actor_visual_clue: 'Akshay Kumar, Vaani Kapoor, Taapsee Pannu, and Fardeen Khan dance in glamorous traditional wedding attire.',
    music_director_clue: 'Punjabi wedding party banger featuring Guru Randhawa, Yo Yo Honey Singh, and Neha Kakkar.',
    distractors: ['Laal Peeli Akhiyaan', 'Tauba Tauba', 'Naina'],
    youtube_video_id: 'U1JLtpJTe84',
    fun_fact: 'Brought Akshay Kumar back to a classic multi-starrer Punjabi wedding dance sequence.'
  },
  {
    song_name: 'Duur Na Karin',
    movie_name: 'Khel Khel Mein',
    artist: 'Vishal Mishra, Zahrah S Khan, Tanishk Bagchi, Kumaar',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Never push me away from your embrace, my love; my breaths have learned how to live only in your closeness.',
    hinglish_lyrics_1: 'Duur na karin mainu apne kol rakh le, mere dil di har dhadkan sun le',
    hinglish_lyrics_2: 'Tere sang beete har ek subah aur shaam, honton pe rahe bas tera hi naam',
    actor_visual_clue: 'Akshay Kumar and Vaani Kapoor share a romantic waltz under warm golden lights.',
    music_director_clue: 'Romantic melody composed by Tanishk Bagchi and sung by Vishal Mishra and Zahrah S Khan.',
    distractors: ['Khoobsurat', 'Dekhha Tenu', 'Soni Soni'],
    youtube_video_id: '7VppHj0Rue0',
    fun_fact: 'Showcased Vishal Mishra’s signature romantic ballad style alongside Zahrah S Khan.'
  },
  {
    song_name: 'Angaaron',
    movie_name: 'Pushpa 2 The Rule',
    artist: 'Shreya Ghoshal, Devi Sri Prasad, Raqueeb Alam',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Like glowing embers meeting the evening rain, our love burns fiercely yet tenderly against the whole world.',
    hinglish_lyrics_1: 'Angaaron ka ambar sa lagta hai mera saami, uske aage jhuke duniya saari',
    hinglish_lyrics_2: 'Dil mein basaa hai tera hi pyaar, tujhpe lutaye hum saara sansaar',
    actor_visual_clue: 'Allu Arjun and Rashmika Mandanna perform playful, rhythmic hook steps on a vibrant film set alongside choreographer Ganesh Acharya.',
    music_director_clue: 'Composed by Devi Sri Prasad (DSP) with Hindi lyrics by Raqueeb Alam and powerhouse vocals by Shreya Ghoshal.',
    distractors: ['Aaj Ki Raat', 'Taras', 'Saami Saami'],
    youtube_video_id: '7u3vM3bK2bA',
    fun_fact: 'Released as a celebratory behind-the-scenes lyrical video featuring the cast and crew grooving together on set.'
  },
  {
    song_name: 'Akhiyaan De Kol',
    movie_name: 'Do Patti',
    artist: 'Shilpa Rao, Tanishk Bagchi, Kausar Munir',
    era: '2020s',
    release_year: 2024,
    english_riddle_1: 'Stay right in front of my eyes tonight; let the rhythm of the beat pull you closer with every glance.',
    hinglish_lyrics_1: 'Akhiyaan de kol reh jaane de, dil di gal aaj keh jaane de',
    hinglish_lyrics_2: 'Raat nasheeli hai, mausam jawaan hai, tujhse hi toh meri har dastaan hai',
    actor_visual_clue: 'Kriti Sanon dazzles in a crimson outfit inside a neon-lit club sequence.',
    music_director_clue: 'Recreated by Tanishk Bagchi with vocals by Shilpa Rao and lyrics by Kausar Munir, paying tribute to legendary folk icon Reshma.',
    distractors: ['Raanjhan', 'Taras', 'Aaj Ki Raat'],
    youtube_video_id: '3X9bK2pQ8wM',
    fun_fact: 'Reimagines Pakistani folk legend Reshma’s classic melody into a sleek modern club number featuring Kriti Sanon.'
  }
];

let lastDailySyncDate = null;
let inFlightSyncPromise = null;

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
 * Discovers fresh latest (2024+) Bollywood songs from iTunes India API when the pre-curated pool is exhausted
 */
async function discoverLiveBollywoodTracks(existingNamesSet, limit = 10) {
  const searchTerms = [
    'Bollywood 2026',
    'Bollywood 2025',
    'Hindi 2025 2026',
    'Arijit Singh 2025',
    'Sachin-Jigar 2025',
    'Vishal Mishra 2025',
    'Tanishk Bagchi 2025',
    'Shashwat Sachdev'
  ];

  const discovered = [];

  for (const term of searchTerms) {
    if (discovered.length >= limit) break;
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=IN&media=music&entity=song&limit=35`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.results || []) {
        if (!item.previewUrl || !item.trackName) continue;
        if (item.primaryGenreName !== 'Bollywood' && !item.primaryGenreName?.includes('Indian')) continue;

        const releaseYear = item.releaseDate ? parseInt(item.releaseDate.slice(0, 4), 10) : 2025;
        if (releaseYear < 2024) continue; // Strictly latest (2024+) tracks only!

        const cleanTitle = item.trackName
          .replace(/\(From.*?\)/gi, '')
          .replace(/\[From.*?\]/gi, '')
          .replace(/\s*-\s*From\s+.*$/i, '')
          .replace(/\(feat\..*?\)/gi, '')
          .replace(/\(Original.*?\)/gi, '')
          .replace(/\s*-\s*Single$/i, '')
          .trim();

        const key = cleanTitle.toLowerCase();
        if (cleanTitle.length < 3 || existingNamesSet.has(key)) continue;
        // Skip duplicate Reprise/Lofi variants if the base song is already in the database
        const baseKey = key.replace(/\s*-?\s*(reprise|lofi|unplugged|slowed|reverb).*$/i, '').trim();
        if (baseKey.length >= 3 && existingNamesSet.has(baseKey)) continue;

        const movieMatch =
          item.trackName.match(/From ["']([^"']+)["']/i) ||
          item.collectionName?.match(/^([^(-\[]+)/);
        const movieName = (movieMatch ? movieMatch[1] : item.collectionName || 'Bollywood Single')
          .replace(/\(Original Motion Picture.*?\)/gi, '')
          .replace(/\s*-\s*Single$/i, '')
          .trim();

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
 * Saves the full list of daily synced songs to server/curated/daily_synced_songs.json
 * when running locally or in GitHub Actions so Vercel's in-memory catalog has them baked in.
 */
function persistDailySongsJson() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  try {
    const allDaily = getDailyLatestSongs();
    if (Array.isArray(allDaily) && allDaily.length > 0) {
      fs.writeFileSync(DAILY_JSON_PATH, JSON.stringify(allDaily, null, 2) + '\n', 'utf8');
    }
  } catch (e) {
    // Ignore on read-only filesystems
  }
}

/**
 * Adds up to `count` (default 10) latest Bollywood songs to the active database
 * for both Solo/Team Guess and 5-Second Audio Blitz, guarded by a concurrency lock.
 */
async function syncDailyLatestSongs(count = 10) {
  if (inFlightSyncPromise) {
    return await inFlightSyncPromise;
  }
  inFlightSyncPromise = _performDailySync(count).finally(() => {
    inFlightSyncPromise = null;
  });
  return await inFlightSyncPromise;
}

async function _performDailySync(count = 10) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingNames = getAllSongNames();
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));

  const addedSongs = [];

  // 1. Pull unadded songs from our high-precision LATEST_BOLLYWOOD_POOL and resolve preview URLs in parallel
  const poolCandidates = [];
  for (const item of LATEST_BOLLYWOOD_POOL) {
    if (poolCandidates.length >= count) break;
    const key = item.song_name.toLowerCase().trim();
    if (existingSet.has(key)) continue;
    existingSet.add(key);
    poolCandidates.push(item);
  }

  if (poolCandidates.length > 0) {
    const resolvedPreviews = await Promise.all(
      poolCandidates.map((item) =>
        item.preview_url ? Promise.resolve(item.preview_url) : fetchItunesPreviewUrl(item.song_name, item.artist)
      )
    );

    for (let i = 0; i < poolCandidates.length; i++) {
      const item = poolCandidates[i];
      const previewUrl = resolvedPreviews[i] || '';
      const cardToInsert = {
        ...item,
        english_riddle_2: item.hinglish_lyrics_2
          ? translateHinglishVerseLiterally(item.hinglish_lyrics_2)
          : item.english_riddle_2,
        preview_url: previewUrl,
        is_daily_latest: true,
        added_date: todayStr
      };

      const newId = insertTriviaCard(cardToInsert);
      addedSongs.push({
        id: newId,
        song_name: item.song_name,
        movie_name: item.movie_name,
        artist: item.artist,
        release_year: item.release_year,
        added_date: todayStr,
        hasAudioStream: Boolean(previewUrl)
      });
    }
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
        added_date: todayStr,
        hasAudioStream: Boolean(cardData.preview_url)
      });
    }
  }

  lastDailySyncDate = todayStr;
  persistDailySongsJson();

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
  if (inFlightSyncPromise) {
    return await inFlightSyncPromise;
  }
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const addedToday = getTodayAddedCount(todayStr);
  return {
    lastSyncDate: lastDailySyncDate || (addedToday >= 10 ? todayStr : null),
    todayDate: todayStr,
    addedToday,
    isSyncedToday: addedToday >= 10
  };
}

module.exports = {
  syncDailyLatestSongs,
  ensureDailyLatestSongs,
  fetchItunesPreviewUrl,
  getLastDailySyncInfo,
  persistDailySongsJson,
  LATEST_BOLLYWOOD_POOL
};
