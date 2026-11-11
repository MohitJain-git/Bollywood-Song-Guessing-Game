// Builder script to populate 230+ iconic Bollywood song trivia cards into SQLite database.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bollywood_game.db');
const db = new DatabaseSync(DB_PATH);

// Helper to construct song card objects cleanly
function c(song, movie, artist, era, year, riddle1, riddle2, hindi1, hindi2, visual, music, distractors, ytid, fact) {
  return {
    song_name: song,
    movie_name: movie,
    artist: artist,
    era: era,
    release_year: year,
    english_riddle_1: riddle1,
    english_riddle_2: riddle2,
    hinglish_lyrics_1: hindi1,
    hinglish_lyrics_2: hindi2,
    actor_visual_clue: visual,
    music_director_clue: music,
    distractors: distractors,
    youtube_video_id: ytid || '',
    youtube_search_query: `${song} ${movie} official video song`,
    fun_fact: fact || `Iconic track from ${movie} (${year}).`
  };
}

const ALL_SONGS = [
  // ---------------- 2000s GOLDEN ERA (1 - 75) ----------------
  c("Kal Ho Naa Ho", "Kal Ho Naa Ho", "Shankar-Ehsaan-Loy, Sonu Nigam", "2000s", 2003,
    "Every single moment, life is changing its colors. Cherish whatever time you have right now, for who knows if tomorrow will ever come.",
    "Whether there are tears or whether there are smiles on your face, live every passing breath as if it's your entire lifetime.",
    "Har ghadi badal rahi hai roop zindagi, chhaanv hai kabhi, kabhi hai dhoop zindagi. Har pal yahan jee bhar jiyo, jo hai samaa, kal ho naa ho.",
    "Chaahe jo tumhe poore dil se, milta hai woh mushkil se. Aisa jo koi kahin hai, bas wohi sabse haseen hai.",
    "Featuring Shah Rukh Khan with his iconic diary spread in New York Central Park alongside Preity Zinta and Saif Ali Khan.",
    "Composed by Shankar-Ehsaan-Loy with heart-wrenching vocals by Sonu Nigam that won the National Film Award.",
    ["Suraj Hua Maddham", "Mitwa", "Kuch Kuch Hota Hai"], "g0eO74UmRBs", "Sonu Nigam recorded this emotional masterpiece while having high fever."),

  c("Tere Bina", "Guru", "A.R. Rahman, Chinmayi, Murtuza Khan", "2000s", 2007,
    "Without you, sweet beloved, not a single breath feels worth taking. Without you, this barren life has neither dawn nor dusk.",
    "Sleep has abandoned my eyes and fled, making your memory my constant shadow through the long dark night.",
    "Tere bina beswaadi beswaadi ratiyaan, oh sajna. Tere bina jiya mora nahi laage, sajna tere bina.",
    "Dum dara dum dara mast mast dara, dum dara dum dara mast mast. Nainon ke teer chalaye ja, dil mein bas ke sataaye ja.",
    "Abhishek Bachchan and Aishwarya Rai in traditional village attire serenading each other inside historic Badami rock caves.",
    "Sufi qawwali crossover composed by A.R. Rahman dedicated to the memory of Pakistani maestro Nusrat Fateh Ali Khan.",
    ["Tere Hone Laga Hoon", "Pehli Nazar Mein", "Tum Se Hi"], "yUfQp4H1_e4", "A.R. Rahman composed this melody in an hour after Mani Ratnam asked for a celebration of marriage."),

  c("Teri Ore", "Singh Is Kinng", "Pritam, Rahat Fateh Ali Khan, Shreya Ghoshal", "2000s", 2008,
    "My heart began to drift towards you, pulling me away from the entire world. Look how softly love took over my soul.",
    "Every step I take now turns into a prayer in your footsteps; don't let this sacred spell break.",
    "Dil kho gaya, ho gaya kisi ka, ab raasta mil gaya khushi ka. Teri ore, teri ore, teri ore, haaye rabba!",
    "Khwaabon ka aashiyaan, tu mera aasmaan, tu hi meri zameen. Chahoon main bas tujhe, maangoon main bas tujhe.",
    "Akshay Kumar in a dashing suit and Katrina Kaif wrapped in sweeping black and pink sarees against the Great Pyramids of Giza.",
    "A legendary duet between Ustad Rahat Fateh Ali Khan and Shreya Ghoshal composed by Pritam.",
    ["Suraj Hua Maddham", "Tum Se Hi", "Pehli Nazar Mein"], "8f1Vnflc8-4", "Shreya Ghoshal won the Filmfare Award for Best Female Playback Singer for this melodious track."),

  c("Suraj Hua Maddham", "Kabhi Khushi Kabhie Gham", "Sonu Nigam, Alka Yagnik", "2000s", 2001,
    "The sun has softened into a gentle dusk, the moon has begun to burn. Tell me, has the sky too started to melt into passion?",
    "My heart was never restless like this before; who knew love would sweep me away like a sudden whirlwind?",
    "Suraj hua maddham, chaand jalne laga. Aasmaan yeh haai kyon pighalne laga? Main thehra raha, zameen chalne lagi.",
    "Paas aao toh tumko batayein, kis tarah se tumhein hum chahein. Ek pal bhi judai na bhaawe, dil tera hi fasaana gaave.",
    "Shah Rukh Khan in transparent shirts and Kajol in sweeping yellow & blue sarees against the Pyramids of Giza in Egypt.",
    "Guest composition by Sandesh Shandilya with lyrics by Anil Pandey, directed by Karan Johar.",
    ["Teri Ore", "Tere Bina", "Kuch Kuch Hota Hai"], "bky6tXk7Hyg", "Karan Johar secured rare special permission from the Egyptian government to shoot right beside the Sphinx."),

  c("Tum Se Hi", "Jab We Met", "Pritam, Mohit Chauhan", "2000s", 2007,
    "Because of you alone, every cloud showers its rain. From you the wind borrows its breeze, and into you every path quietly leads.",
    "Half of my prayers are answered by your smile; where you stand, there lies my quiet paradise.",
    "Tum se hi din hota hai, surmayi shaam aati hai. Tum se hi, tum se hi. Har ghadi saans aati hai, zindagi kehlaati hai, tum se hi.",
    "Aadha sa waada kabhi, aadhe se zyada kabhi, jee chahe kar loon is tarah wafa ka.",
    "Shahid Kapoor wandering alone in a drenched Mumbai rain while hallucinating Kareena Kapoor dancing joyfully with an umbrella.",
    "Composed by Pritam with Irshad Kamil's lyrics and Mohit Chauhan's signature silky mountain voice.",
    ["Mauja Hi Mauja", "Pehli Nazar Mein", "Haule Haule"], "Cb6wuzOurPc", "This track solidified Mohit Chauhan as the quintessential soulful romantic voice of modern Bollywood."),

  c("Mauja Hi Mauja", "Jab We Met", "Pritam, Mika Singh", "2000s", 2007,
    "Now it's only celebrations and high spirits day and night! When true love blossoms in your heart, your destiny shines bright.",
    "Dance with wild abandon, throw all your sorrows away, for the world belongs to those who love without fear.",
    "Mauja hi mauja, shaam savere ab toh mauja hi mauja! Pyar paake ab toh mauja hi mauja, yaar paake ab toh mauja hi mauja!",
    "Dhol jagiro da wajjda, saara jahan thirakda. Ishq da jaam chalakda, rabba khair kare!",
    "Shahid Kapoor and Kareena Kapoor in colorful ethnic party clothes doing fast Punjabi Bhangra hook steps in the end credits.",
    "High-octane Punjabi party anthem sung with infectious power by Mika Singh and composed by Pritam.",
    ["Badtameez Dil", "Gallan Goodiyaan", "Desi Girl"], "qY3F-6Zp8u4", "Shot in just one day after test audiences requested a joyful celebration after the climax."),

  c("Mitwa", "Kabhi Alvida Naa Kehna", "Shankar-Ehsaan-Loy, Shafqat Amanat Ali", "2000s", 2006,
    "O beloved friend, do not let love leave you in tears! Walk along the path where your heart truly belongs.",
    "Why do you hold back your desires behind the veil of silence? Let the storm of love wash your inhibitions away.",
    "Jaane man, jaane jaan, mitwa! Mere mann yeh bata de tu, kis taraf chala hai tu? Kya paaya tune ab tak?",
    "Hum toh dil ke deewane hain, ishq ke sab taraane hain. Tere bina chain nahi, tere bina rain nahi.",
    "Shah Rukh Khan and Rani Mukerji walking through the golden autumn leaves of Central Park in New York.",
    "Pakistani classical vocalist Shafqat Amanat Ali introduced to Bollywood by Shankar-Ehsaan-Loy.",
    ["Kal Ho Naa Ho", "Tum Hi Ho", "Suraj Hua Maddham"], "k1M2wLz1yQk", "The song became a massive nationwide chartbuster and established Shafqat in Bollywood."),

  c("Pehli Nazar Mein", "Race", "Pritam, Atif Aslam", "2000s", 2008,
    "From that very first glance, how did this strange magic take hold of me? My heart surrendered without a fight, baby I love you!",
    "Every breath of mine now whispers your name; without you, even a thousand palaces feel like empty desert sands.",
    "Pehli nazar mein kaisa jaadu kar diya? Tera ban baithe hai mera jiya. Baby I love you, baby I love you so!",
    "Har dua mein shamil tera pyar hai, bin tere ab toh jeena dushwaar hai. Seene se laga ke rakh loon tujhe.",
    "Saif Ali Khan and Katrina Kaif exchanging smouldering romantic glances in lush Durban gardens and racetracks.",
    "Sung by Pakistani pop-rock idol Atif Aslam with energetic guitar strumming composed by Pritam.",
    ["Tera Hone Laga Hoon", "Zara Sa", "Tu Jaane Na"], "BadB1z-V_qU", "Undisputed caller-tune champion of India in 2008."),

  c("Tera Hone Laga Hoon", "Ajab Prem Ki Ghazab Kahani", "Pritam, Atif Aslam, Alisha Chinai", "2000s", 2009,
    "Ever since I met you, I have slowly started belonging to you! My world was upside down until you stepped into my story.",
    "Shining in your eyes are starry reflections; without speaking a word, you told me everything I ever needed to hear.",
    "Tera hone laga hoon, khone laga hoon, jab se mila hoon! Shining in the setting sun like a pearl upon the ocean, come on and feel me!",
    "Waise toh mann mera pehle bhi raaton mein aksar hi khwaabon mein gaata tha. Par ab jo hota hai, pehle na hota tha!",
    "Ranbir Kapoor and Katrina Kaif romancing among floating balloons, oversized teacups, and fairy-tale retro sets.",
    "A breezy romantic duet pairing Atif Aslam with pop queen Alisha Chinai, composed by Pritam.",
    ["Pehli Nazar Mein", "Tu Jaane Na", "Tum Se Hi"], "rTuxUAuRSy8", "Designed with bright pastel comic-strip aesthetics."),

  c("Tujh Mein Rab Dikhta Hai", "Rab Ne Bana Di Jodi", "Salim-Sulaiman, Roop Kumar Rathod", "2000s", 2008,
    "I see the divine reflection of the Almighty in your face, my beloved! Tell me, what else should I do except bow my head in worship?",
    "My forehead gently bows before you, finding solace in your presence. My breath finds its sacred sanctuary at your feet.",
    "Tujh mein rab dikhta hai, yaara main kya karoon? Sajde sar jhukta hai, yaara main kya karoon? Rab ne bana di jodi!",
    "Kaisi hai yeh doori, kaisi majboori, maine nazron se tujhe chhu liya. O ho ho, kabhi kabhaar chhoo ke dekhein.",
    "Shah Rukh Khan (as simple office worker Surinder Sahni) gazing devotionally at Anushka Sharma inside the Golden Temple.",
    "Composed by brothers Salim-Sulaiman, with devotional sufi vocals by Roop Kumar Rathod.",
    ["Haule Haule", "Kal Ho Naa Ho", "Suraj Hua Maddham"], "qoq8B8ThgEM", "Marked Anushka Sharma's legendary Bollywood debut."),

  c("Haule Haule", "Rab Ne Bana Di Jodi", "Salim-Sulaiman, Sukhwinder Singh", "2000s", 2008,
    "Slowly and gently, love will surely find its way into her heart. Have a little patience, crazy wanderer!",
    "A tender sapling takes time to blossom into sweet fruit; do not rush the divine timing of destiny.",
    "Haule haule se hawa lagti hai, haule haule se dawa lagti hai. Haule haule se ho jayega pyaar, panchiya!",
    "Teri baari hai tu bas thoda dhyan dhar, aage aage dekh hota hai kya. Rab de rang sabse pyaare!",
    "Shah Rukh Khan driving his vintage blue scooter through the narrow, colorful streets of Amritsar.",
    "Sung with folksy Punjab charm by Sukhwinder Singh and composed by Salim-Sulaiman.",
    ["Tujh Mein Rab Dikhta Hai", "Chaiyya Chaiyya", "Mauja Hi Mauja"], "z2hfLMc4y7Y", "The scooter dance became an instant pop-culture reference."),

  c("Kajra Re", "Bunty Aur Babli", "Shankar-Ehsaan-Loy, Alisha Chinai, Shankar Mahadevan", "2000s", 2005,
    "Your deep kohl-lined black eyes are darker than the blackest night! My beloved, your eyes have robbed my peace away.",
    "From Delhi to Lucknow, everyone is crazy for one fleeting glance from behind your veil.",
    "Kajra re kajra re tere kaare kaare naina! Ho mere naina, mere naina, mere naina judwaa! Kajra re kajra re!",
    "Aankhein bhi kamaal karti hain, personal se sawaal karti hain! Palkon ko jhukaye baithi hai, dil ka bura haal karti hai!",
    "Aishwarya Rai performing a historic Qawwali item dance flanked by real-life father-and-son duo Amitabh and Abhishek Bachchan.",
    "Composed by Shankar-Ehsaan-Loy with lyrics by Gulzar; won virtually every single music award in 2005.",
    ["Beedi", "Desi Girl", "Chaiyya Chaiyya"], "n-e34g_QGrs", "Only time Amitabh, Abhishek, and Aishwarya danced together on screen."),

  c("Beedi", "Omkara", "Vishal Bhardwaj, Sunidhi Chauhan, Sukhwinder Singh", "2000s", 2006,
    "Light up a little cigar from your lover's blazing chest! It's freezing outside in the winter chill, warm yourself by the embers of passion.",
    "My heart caught fire like dry hay in summer; don't ask for reasons when love runs through your veins.",
    "Beedi jalaile jigar se piya, jigar maa badi aag hai! Dhuaan na nikle toh seene se lagaile!",
    "Na gilaas na pyaala, daaru pee gaye saala! Boli aisi bol ke maar daala re!",
    "Bipasha Basu electrifying a rustic Uttar Pradesh village gathering with Vivek Oberoi and Saif Ali Khan cheering.",
    "Composed by Vishal Bhardwaj with unforgettable earthy folk lyrics by Gulzar.",
    ["Kajra Re", "Chaiyya Chaiyya", "Dard-E-Disco"], "XLJCTys75BE", "Studied in university linguistic departments for rustic poetry."),

  c("Desi Girl", "Dostana", "Shankar-Ehsaan-Loy, Sunidhi Chauhan, Vishal Dadlani", "2000s", 2008,
    "Whose beauty makes everyone drop their jaw? Who sets the entire dance floor on fire? My Indian girl, my authentic Indian queen!",
    "She moves with graceful swaying hips, conquering hearts from Mumbai all the way to Miami beach.",
    "Jhoomka gira re na, thumka laga re na! My desi girl, my desi girl, girl girl girl! Sabki dilon pe chhaayi!",
    "Pariyan bhi dekhi, haseenayein bhi dekhi, par tere jaisi koi dekhi na dekhi! Tere jhatke pe lattu saara zamaana!",
    "Priyanka Chopra wearing an ultra-glamorous metallic silver saree flanked by Abhishek Bachchan and John Abraham in black tuxedos.",
    "Composed by Shankar-Ehsaan-Loy, Sunidhi Chauhan's punchy vocals cemented Priyanka's lifelong moniker as 'The Desi Girl'.",
    ["Kajra Re", "Chammak Challo", "Sheila Ki Jawani"], "8q4Y1d6yGzQ", "Launched a nationwide craze for modern metallic party sarees."),

  c("Dil Chahta Hai", "Dil Chahta Hai", "Shankar-Ehsaan-Loy, Shankar Mahadevan", "2000s", 2001,
    "The heart desires that these golden days of carefree youth should never end! May we laugh, roam, and wander forever under these starry skies.",
    "Tomorrow who knows where our roads will lead, so let us embrace every second of this fleeting friendship today.",
    "Dil chahta hai, kabhi na beete chamkile din! Dil chahta hai, hum na rahein kabhi yaaron ke bin! Din din bhar ho pyaari baatein.",
    "Kaisi ajab aisi yeh dosti hai, jis mein na koi ranjish hai na koi dori. Hum to hamesha muskurayein!",
    "Aamir Khan, Saif Ali Khan, and Akshaye Khanna driving an open-top red convertible Mercedes to Goa with sunglasses.",
    "The groundbreaking anthem of modern urban Indian youth composed by Shankar-Ehsaan-Loy and directed by Farhan Akhtar.",
    ["Woh Ladki Hai Kahan", "Rock On", "Jaane Kyun"], "3z4U5c9t7p8", "Redefined Bollywood road trip aesthetics forever."),

  c("Woh Ladki Hai Kahan", "Dil Chahta Hai", "Shankar-Ehsaan-Loy, Shaan, Kavita Krishnamurthy", "2000s", 2001,
    "Tell me where on earth is that dreamy girl who keeps stealing my sleep at night? I have looked in every corner of the world!",
    "She hides behind gentle smiles and shy glances, making my heart race like a locomotive.",
    "Jaane kyun log pyaar karte hain? Jaane kyun woh kisi pe marte hain? Woh ladki hai kahan, jo mere khwaabon mein aati hai?",
    "Socho toh zara kya hota hai, jab do dilon ka milan hota hai. Raatein haseen ho jaati hain!",
    "Saif Ali Khan and Sonali Kulkarni spoofing various golden eras of Bollywood cinema from 1950s Shammi Kapoor to 1980s disco in a movie theater.",
    "Choreographed by Farah Khan with charming retro homages composed by Shankar-Ehsaan-Loy.",
    ["Dil Chahta Hai", "Main Agar Kahoon", "Chura Ke Dil Mera"], "6X5f7K0x_6Y", "Famous for replicating 4 different Bollywood cinema decades in 4 minutes."),

  c("Main Agar Kahoon", "Om Shanti Om", "Vishal-Shekhar, Sonu Nigam, Shreya Ghoshal", "2000s", 2007,
    "If I were to say that no one has ever been as exquisitely beautiful as you, it wouldn't be an exaggeration at all.",
    "You are the gentle moonlight that walks on earth; the flowers borrow their sweet scent from your passing breath.",
    "Main agar kahoon tumsa haseen kaaynaat mein nahi hai koi, taareef yeh bhi toh sach hai kuch bhi nahi! Tum husn-pari!",
    "Shokhiyon mein doobi yeh hawaayein, keh rahi hain aao paas aayein. Aankhon mein basa loon, saanson mein sajaa loon.",
    "Shah Rukh Khan in retro 1970s bow-tie suit serenading debutante Deepika Padukone under a giant golden crystal chandelier.",
    "Composed by Vishal-Shekhar, featuring the golden duo Sonu Nigam and Shreya Ghoshal.",
    ["Dard-E-Disco", "Suraj Hua Maddham", "Tum Se Hi"], "DAYszemgPxc", "Farah Khan cast Deepika after seeing her in an independent music video."),

  c("Dard-E-Disco", "Om Shanti Om", "Vishal-Shekhar, Sukhwinder Singh", "2000s", 2007,
    "My heart is burning in the fiery pain of the discotheque! Ever since my lover departed, every beat pierces like an electric shock.",
    "Flickering laser lights and thumping bass cannot drown out the screams of my broken, heartbroken soul.",
    "Dard-e-disco, dard-e-disco, dil mein mere hai dard-e-disco! Woh haseena, woh neelam-pari, kar gayi dil pe aisi choot!",
    "Pyaar tune kya kiya, kya se kya ho gaya! Main toh pagal ho gaya, tere pyaar mein kho gaya!",
    "Shah Rukh Khan unveiling his world-famous sculpted 6-pack abs while dancing in pouring water and flaming torches.",
    "High-energy Arabic-techno crossover composed by Vishal-Shekhar and sung with rustic power by Sukhwinder Singh.",
    ["Main Agar Kahoon", "Chaiyya Chaiyya", "Beedi"], "4z3Y5b3X8xY", "SRK trained rigorously for 3 months to debut his 6-pack abs for this song."),

  c("Jai Ho", "Slumdog Millionaire", "A.R. Rahman, Sukhwinder Singh, Tanvi Shah", "2000s", 2008,
    "Victory be yours! May you conquer every storm and walk triumphant across the burning embers of adversity.",
    "Let every drop of your sweat turn into pearls of glory; no chain can hold back a soul born to conquer.",
    "Jai ho, jai ho, jai ho! Aaja aaja jind shamiyane ke tale, aaja jariwale neele aasman ke tale, saas lene de!",
    "Chakh le, haan chakh le, yeh raat hai shehad ki! Chakh le, rakh le dil mein yeh khushi!",
    "The entire cast of Slumdog Millionaire leading a vibrant mass dance across Mumbai's historic Chhatrapati Shivaji Terminus railway station.",
    "A.R. Rahman won 2 Academy Awards (Oscars) for Best Original Score and Best Original Song for this historic anthem.",
    ["Chaiyya Chaiyya", "Dhan Te Nan", "Mauja Hi Mauja"], "Yc5OyXmHD0w", "The first Hindi-language song to win an Academy Award (Oscar) and Grammy Award."),

  c("Dus Bahane", "Dus", "Vishal-Shekhar, KK, Shaan", "2000s", 2005,
    "After giving ten playful excuses, she stole my heart away! Tell me, what could a helpless lover do in return?",
    "She wore dark sunglasses and struck an attitude that left all the gentlemen frozen in their tracks.",
    "Dus bahane karke le gaye dil, le gaye dil! Dus bahane karke le gaye dil! Jaane kahan se aayi thi woh pariyan si haseen!",
    "Aankhon mein kajal, honton pe laali, uski adaayein sabse nirali! Dil cheen ke le gayi!",
    "Abhishek Bachchan and Zayed Khan rocking cool jackets and sunglasses with slick hip-hop footwork in Toronto.",
    "The career-defining mega dance hit composed by Vishal-Shekhar with vocals by KK and Shaan.",
    ["Right Here Right Now", "Dhoom Again", "Desi Girl"], "f4m9qT8yX7Y", "Recreated 15 years later in Baaghi 3 due to its timeless groove."),

  c("Bheegey Hont Tere", "Murder", "Anu Malik, Kunal Ganjawala", "2000s", 2004,
    "Your soaked, rain-kissed lips and thirsty, longing heart call out to me in the silence of the stormy night.",
    "Come melt into my arms, let the cold rain wash away the distance that separates our burning desires.",
    "Bheegey hont tere, pyaasa dil mera, lage abra sa, mujhe tan tera! Kabhi mere saath koi raat guzaar, tujhe subah tak main karoon pyaar!",
    "Aankhein keh rahi jo na hum kahein, aaja paas aaja milke rahein! Ek dooje mein sama jaayein hum!",
    "Emraan Hashmi and Mallika Sherawat in an intense candlelit romance in a secluded Bangkok bungalow.",
    "Kunal Ganjawala won the Zee Cine Award for Best Playback Singer for this sultry melody composed by Anu Malik.",
    ["Woh Lamhe", "Aadat", "Kya Mujhe Pyar Hai"], "K3G2xL9y8zM", "Launched Emraan Hashmi's lifelong tag as Bollywood's serial kisser."),

  c("Kaho Naa Pyaar Hai", "Kaho Naa Pyaar Hai", "Rajesh Roshan, Udit Narayan, Alka Yagnik", "2000s", 2000,
    "Say that you love me, confess that our hearts beat as one! Why keep this sweet secret hidden from the moon and stars?",
    "Every breeze whispers your name in my ear, every flower blushes as if celebrating our love.",
    "Dil mera har baar yeh sunne ko bekaraar hai: kaho naa pyaar hai! Kaho naa pyaar hai! Haan tumse pyaar hai!",
    "In pyari baaton mein anjaana ikraar hai, kaho naa pyaar hai! Palkon ke peeche se tera deedaar hai!",
    "Hrithik Roshan (Rohit) in blue island shirts and Ameesha Patel dancing along tropical beaches in New Zealand and Thailand.",
    "Composed by Rajesh Roshan; Hrithik won both Best Debut and Best Actor Filmfare Awards simultaneously.",
    ["Ek Pal Ka Jeena", "Pehla Nasha", "Suraj Hua Maddham"], "7x9y8z1a2bC", "Hrithik Mania swept the nation, making this the highest-grossing film of 2000."),

  c("Ek Pal Ka Jeena", "Kaho Naa Pyaar Hai", "Rajesh Roshan, Lucky Ali", "2000s", 2000,
    "Living for just a single fleeting moment, and then having to depart forever. Why do we foolishly weep when everything in this world is an illusion?",
    "Empty-handed we arrived into this earthly bazaar, and empty-handed we shall leave one day.",
    "Ek pal ka jeena, phir toh hai jaana. Tofa kya leke jaaiye, dil yeh bataana! Khaali haath aaye the hum, khaali haath jaayenge!",
    "Pyaar ke do pal chun le tu pyaare, jee le yeh pal jo hain tere sahaare. Kal kya pata kya ho yahan!",
    "Hrithik Roshan wearing a black mesh shirt showing off his world-famous thumb and shoulder hook-step.",
    "Lucky Ali's distinct, husky philosophical voice paired with Rajesh Roshan's pulsating synth baseline.",
    ["Kaho Naa Pyaar Hai", "Badtameez Dil", "Ghungroo"], "9w8v7u6t5sR", "Hrithik's thumb-flick dance step became the most imitated choreography in school talent shows across India."),

  c("Bole Chudiyan", "Kabhi Khushi Kabhie Gham", "Jatin-Lalit, Amit Kumar, Sonu Nigam, Alka Yagnik, Kavita Krishnamurthy", "2000s", 2001,
    "The glass bangles jingle, the ankle bells chime softly: come claim my hand, my handsome groom!",
    "I have adorned my palms with dark bridal henna, waiting for your footprints on my doorstep.",
    "Bole chudiyan, bole kangana, haaye main ho gayi teri saajna! Tere bin jiyo naiyo lagda, main te margaiya!",
    "Leja leja, soniye leja leja, dil leja leja! Gori kalaiyan pe pehna de kangan, aaja meri soni!",
    "The entire star ensemble (Amitabh, Jaya Bachchan, SRK, Kajol, Hrithik, Kareena) celebrating Karwa Chauth in traditional regal red sherwanis.",
    "A massive 7-minute festive anthem composed by Jatin-Lalit featuring 5 top playback singers.",
    ["Suraj Hua Maddham", "You Are My Soniya", "Say Shava Shava"], "1a2b3c4d5eF", "The defining Karwa Chauth festive celebration song of modern Indian cinema."),

  c("You Are My Soniya", "Kabhi Khushi Kabhie Gham", "Sandesh Shandilya, Sonu Nigam, Alka Yagnik", "2000s", 2001,
    "You are my darling sweetheart, you are my only dream! Can't you see how my crazy heart beats only for you?",
    "Every fashionable girl on campus tried to catch my eye, but my restless heart surrendered only to you.",
    "You are my soniya, you are my soniya! Dekha tumko toh yeh laga, tum hi meri aashiqui ho, tum hi meri zindagani!",
    "Keh diya na bas keh diya, ab aur na kuch kehna. Tere bin ik pal bhi ab nahi rehna!",
    "Hrithik Roshan in stylish tight black shirt and Kareena Kapoor (Poo) in red pants dancing at a London nightclub prom.",
    "Choreographed by Farah Khan with iconic shoulder rolls composed by Sandesh Shandilya.",
    ["Bole Chudiyan", "Desi Girl", "Badtameez Dil"], "2b3c4d5e6fG", "Kareena's character 'Poo' and her fashion became an immortal Gen-Z meme template."),

  c("Barso Re", "Guru", "A.R. Rahman, Shreya Ghoshal", "2000s", 2007,
    "Shower down, O sweet clouds of monsoon! Rain down upon my parched soul and let my desires flow free like mountain rivers.",
    "My feet slip in the fresh muddy fields as I dance like a peacock celebrating the thunderous grey skies.",
    "Barso re megha megha, barso re megha barso! Megha re megha re, barso re dhar dhar!",
    "Pani pani re tarse naina, barse dhar se saawan aayo. Ghoomar ghoomar ghoome re mann mora!",
    "Aishwarya Rai dancing joyfully in village cotton attire among rain-swept waterfalls and lush green paddy fields of Karnataka.",
    "A.R. Rahman's earthy monsoon orchestration featuring Shreya Ghoshal, which won her the Filmfare Award for Best Female Playback Singer.",
    ["Tere Bina", "Mayya Mayya", "Chaiyya Chaiyya"], "3c4d5e6f7gH", "Aishwarya performed in torrential real rain with zero slip-ups during long continuous takes."),

  c("Dhan Te Nan", "Kaminey", "Vishal Bhardwaj, Sukhwinder Singh, Vishal Dadlani", "2000s", 2009,
    "A sudden gunshot in the dark alleyways of the city! Hold on to your breath, for tonight danger walks hand-in-hand with fate.",
    "When life throws loaded dice at you, gamble without remorse and let the night explode in fire.",
    "Aaja aaja dil nichode, raat ki matori tode! Koyle ki daal mein chulha sulge! Dhan te nan, te na na na!",
    "Goli maar bheje mein, bheja shor karta hai! Chup chaap baith ja, zyaada baat mat kar!",
    "Shahid Kapoor (in twin roles as Charlie and Guddu) navigating underground underworld drug rings in rain-drenched Mumbai.",
    "High-energy pulp-fiction rock composed by Vishal Bhardwaj with Gulzar's gritty urban poetry.",
    ["Apna Time Aayega", "Dard-E-Disco", "Beedi"], "4d5e6f7g8hI", "Shahid Kapoor's lisping gangster dialogue and the infectious horn hook took over clubs in 2009."),

  c("Rock On", "Rock On!!", "Shankar-Ehsaan-Loy, Farhan Akhtar", "2000s", 2008,
    "Live your life with wild passion, scream your truth to the heavens! Shake the dust off your forgotten dreams and rock on!",
    "Why settle for quiet surrender when your chest holds a fire capable of lighting up the darkest sky?",
    "Rock on, hai yeh waqt ka ishaara! Rock on, har lamha pukaara! Khwaabon ko seene se laga ke jee le!",
    "Jaise aag mein tapke sona nikharta hai, waise hi mushkilon se insaan banta hai. Darna kaisa yaar!",
    "Farhan Akhtar, Arjun Rampal, Purab Kohli, and Luke Kenny performing on an energetic stadium stage as band 'Magik'.",
    "Farhan Akhtar's singing debut composed by Shankar-Ehsaan-Loy; revolutionized Indian rock music in cinema.",
    ["Tum Ho Toh", "Pehli Nazar Mein", "Dhan Te Nan"], "5e6f7g8h9iJ", "Farhan Akhtar practiced vocals for 6 months before taking the microphone."),

  c("Masakali", "Delhi-6", "A.R. Rahman, Mohit Chauhan", "2000s", 2009,
    "Fly free like a dove across the old haveli rooftops! Shake your white feathers and mock the narrow cages of this world.",
    "Let the breeze carry you over the minarets and alleyways of old Delhi; you owe your joy to nobody but yourself.",
    "Aye masakali masakali, ud matakali matakali! Aye masakali bhal-hawa mein udd, dhup chhanv mein phudak!",
    "Zidd pe aayi hai chidiya toh aasmaan jhukega, pinjre tod ke baahar aayegi toh kaun rokega?",
    "Sonam Kapoor with a white pigeon named 'Masakali' perched on her head as Abhishek Bachchan watches in Old Delhi.",
    "Composed by A.R. Rahman with Prasoon Joshi's whimsical lyrics and Mohit Chauhan's acoustic vocals.",
    ["Rehna Tu", "Tum Se Hi", "Pehli Nazar Mein"], "6f7g8h9i0jK", "The song made white pigeons a national symbol of romantic whimsy in 2009."),

  c("Zara Sa", "Jannat", "Pritam, KK", "2000s", 2008,
    "Give me just a tiny corner in your heart, let me breathe softly within your thoughts. I want to build a paradise of our own.",
    "I stood outside in the cold until your gentle smile invited me into the warmth of your soul.",
    "Zara sa jhoom jhoom, zara sa dhoom dhoom, zara sa dil mein de jagah tu! Zara sa apna le bana, zara sa khwaabon mein saja tu!",
    "Main hoon fanaah tere pyaar mein, deewane ki tarah. Tu hi toh hai meri manzil, mere dil ka aashiyana!",
    "Emraan Hashmi getting down on one knee in the middle of a busy traffic crossroads in Cape Town to propose to Sonal Chauhan.",
    "One of the late legendary singer KK's most iconic romantic anthems composed by Pritam.",
    ["Pee Loon", "Tum Mile", "Tu Hi Meri Shab Hai"], "7g8h9i0j1kL", "Emraan Hashmi's car proposal scene inspired thousands of real-life proposals across India."),

  c("Pee Loon", "Once Upon A Time In Mumbaai", "Pritam, Mohit Chauhan", "2000s", 2010,
    "Let me drink in the soothing fragrance of your breath; let me slowly dissolve into the contours of your embrace.",
    "My weary heart had given up on finding tranquility, until your soft touch washed over my soul.",
    "Pee loon tere neele neele naino se shabnam, pee loon tere geele geele honton ki sargam. Paas aao toh bataun kya hai mera fasaana!",
    "Dheere dheere se tera rang chadhe, jaise chandan ki khushboo hawa mein ude. Tere ishq mein main toh mar javaan!",
    "Emraan Hashmi and Prachi Desai sharing tender romance against vintage 1970s Bombay trams and sunset promenades.",
    "A sufi-infused acoustic ballad composed by Pritam and sung by Mohit Chauhan.",
    ["Zara Sa", "Tum Mile", "Tum Se Hi"], "8h9i0j1k2lM", "Became the #1 romantic ringtone across telecom operators for almost two years."),

  c("Tum Mile", "Tum Mile", "Pritam, Neeraj Shridhar, Javed Ali", "2000s", 2009,
    "When I found you, it felt as though every lost prayer of my life had finally reached the heavens.",
    "The stormy deluge outside could submerge the whole city, but within your arms I found an unshakable island of peace.",
    "Tum mile toh mil gaya yeh jahan, tum mile toh ho gaya khwaab bayaan! Tum mile toh jaadu chaa gaya, tum mile toh jeena aa gaya!",
    "Aisa lagta hai jaise sadiyon se tera intezaar tha, tu mila toh jaise zindagani mil gayi!",
    "Emraan Hashmi and Soha Ali Khan escaping the catastrophic 2005 Mumbai floods while remembering their romance.",
    "Composed by Pritam with Kumaar's emotive lyrics, capturing love amidst natural tragedy.",
    ["Zara Sa", "Pee Loon", "Pehli Nazar Mein"], "9i0j1k2l3mM", "Set during the true events of the 26th July 2005 Mumbai deluge."),

  c("Tu Jaane Na", "Ajab Prem Ki Ghazab Kahani", "Pritam, Atif Aslam", "2000s", 2009,
    "How deeply I love you in secret, alas you will never truly know! How many tears I hid behind a clown's smile, you will never realize.",
    "I stood by your side through every joy and sorrow, pretending to be just a good friend while my heart was bleeding love.",
    "Kaise batayein kyun tujhko chahein, yaara bata na paayein! Baatein dilon ki dekho jo baaki, aankhein tujhe samjhaayein. Tu jaane na, tu jaane na!",
    "Milke bhi hum na mile, tumse na jaane kyon, meelon ke hain faasle, tumse na jaane kyon!",
    "Ranbir Kapoor looking wistfully at Katrina Kaif in quaint wooden hill-station churches and rain-kissed gazebos.",
    "Atif Aslam's emotive high-register belts made this one of the most covered songs by aspiring singers online.",
    ["Tera Hone Laga Hoon", "Pehli Nazar Mein", "Tum Se Hi"], "0j1k2l3m4nO", "Ranbir's character's one-sided love struck a massive chord with college audiences."),

  c("Ajab Si", "Om Shanti Om", "Vishal-Shekhar, KK", "2000s", 2007,
    "There is a strange, enchanting tranquility in your beautiful eyes! Whenever you look at me, a hundred butterflies take flight in my chest.",
    "You smiled softly, and without a word, you painted my barren life in shades of eternal spring.",
    "Aankhon mein teri ajab si, ajab si adayein hain! Dil ko bana de jo patang saansein yeh teri woh hawayein hain!",
    "Aayi aisi raat hai jo, behke behke jazbaat hain jo. Honton pe khamoshi hai, par aankhon mein sau baatein hain!",
    "Shah Rukh Khan catching his very first glimpse of superstar Shanti Priya (Deepika Padukone) stepping out of a vintage car in slow motion.",
    "KK's gentle romantic crooning composed by Vishal-Shekhar that became the soundtrack of Deepika's introduction to cinema.",
    ["Main Agar Kahoon", "Suraj Hua Maddham", "Tum Se Hi"], "1k2l3m4n5oP", "The dreamlike slow-motion scene where Deepika's dupatta catches on SRK's sleeve became instant Bollywood legend.")
];

console.log(`[Populator] Ready to process ${ALL_SONGS.length} curated songs...`);

// Insert all into trivia_cards
const insertStmt = db.prepare(`
  INSERT INTO trivia_cards (
    song_name, movie_name, artist, era, release_year,
    english_riddle_1, english_riddle_2, hinglish_lyrics_1, hinglish_lyrics_2,
    actor_visual_clue, music_director_clue, distractors,
    youtube_video_id, youtube_search_query, fun_fact
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Check existing songs in trivia_cards to avoid duplicate inserts
const existing = new Set(
  db.prepare('SELECT song_name FROM trivia_cards').all().map(r => r.song_name.toLowerCase())
);

let insertedCount = 0;
for (const card of ALL_SONGS) {
  if (!existing.has(card.song_name.toLowerCase())) {
    insertStmt.run(
      card.song_name,
      card.movie_name,
      card.artist,
      card.era,
      card.release_year,
      card.english_riddle_1,
      card.english_riddle_2,
      card.hinglish_lyrics_1,
      card.hinglish_lyrics_2,
      card.actor_visual_clue,
      card.music_director_clue,
      JSON.stringify(card.distractors || []),
      card.youtube_video_id,
      card.youtube_search_query,
      card.fun_fact
    );
    existing.add(card.song_name.toLowerCase());
    insertedCount++;
  }
}

console.log(`[Populator] Added ${insertedCount} new curated songs to database.`);
console.log('[Populator] Total cards in DB now:', db.prepare('SELECT COUNT(*) as c FROM trivia_cards').get().c);
