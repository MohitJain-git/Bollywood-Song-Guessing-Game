# 🎬 BollyTrivia - AI Bollywood Song Guessing & Party Game

An AI-powered Bollywood music trivia web application built with **React**, **Node.js**, **Express**, **WebSockets**, **SQLite**, and **Google Gemini AI**. Guess Bollywood tracks from poetic English lyrical riddles, layered visual hints, and Hinglish lyrics, watch official YouTube music videos directly inside the app, and battle with friends locally or in real-time online multiplayer rooms!

---

## 🌟 What's New & Upgraded

1. **Full-Stack Web Application**:
   - Modern, responsive React UI with fluid typography (`clamp()`), Bollywood retro-cinematic glassmorphism styling, and mobile-friendly layouts.
   - Built with high-performance Node.js backend using **native SQLite** (`node:sqlite`) for zero-dependency local database persistence.
   - Zero-external audio dependencies: synthesizes retro Bollywood gameshow buzzer, bells, and ticks using the native **Web Audio API**.
   - Confetti bursts and micro-animations for winning streaks and correct guesses.

2. **In-App YouTube Video Player**:
   - Swapped out Spotify links for **embedded YouTube music videos** right inside the application!
   - Follows modern web performance standards: strict `16:9` aspect ratio to prevent layout shifts (CLS), `loading="lazy"`, and quick one-click "Watch on YouTube" fallback buttons.

3. **Optimized Gemini API Prompt**:
   - Upgraded from simple literal translations to an **optimized Bollywood lyricist prompt**:
     - **Clue 1 (Hook)**: Translates famous chorus/mukhda into poetic, intriguing English brain-teasers without giving away the title.
     - **Clue 2 (Verse)**: Poetic translation of a secondary antara/verse.
     - **Clue 3 (Stars & Visuals)**: Iconic star cast, famous hook-step choreography, and music video settings (e.g., SRK in mustard fields, Hrithik's footwork, Alia & Ranbir in Varanasi).
     - **Clue 4 (Music & Era)**: Composers, playback singers, and release year.
     - **Clue 5 (Romanized Lyrics)**: Authentic Romanized Hindi (Hinglish) lyrics.
     - **Smart Distractors**: Generates 3 plausible alternative Bollywood songs from the same era/vibe for rapid multiple-choice showdowns.
     - **Bollywood Trivia Fact**: Fascinating background story or awards fact for every song.

4. **Self-Replenishing SQLite Database**:
   - Pre-loaded with **1,240+ Bollywood songs** imported from the included CSV datasets across eras (90s, 2000s, 2010s, 2020s).
   - Pre-loaded with **220+ ready-to-play Bollywood trivia cards** across eras in SQLite.
   - **Auto-Replenishment**: Whenever unplayed cards in the database run low (or are empty), the backend automatically triggers Gemini to batch-generate and persist fresh trivia cards into the database!
   - Manual generation button in the UI settings to create new cards on demand anytime.

5. **Exciting Game Modes & Variants**:
   - **⚡ 5-Second Audio Blitz ("Heardle Bollywood")**:
     - Listen to the first 5 seconds of the song intro for **100 Points**!
     - Need more time? Click to hear 5 more seconds (0:00 - 0:10) for **50 Points (Half Points)**!
     - Optional Movie & Era Clue for **25 Points**.
     - Guess using Multiple Choice or Type-to-Guess.
   - **🌟 Solo Mode ("BollyMaster")**:
     - Era filter (All-Time, 2000s Hits, 2010s Blockbusters, 2020s Trends, 90s Classics).
     - Toggle between **Multiple Choice** (4 options) or **Type Your Guess** (with smart fuzzy matching).
     - Point scoring (100 -> 80 -> 60 -> 40 -> 20) with live streak counter.
     - **📜 Lyrical Riddles Decoded**: Shows exact line-by-line Clue 1 & Clue 2 mapping to original Hindi lyrics at the end!
   - **👥 Team Battle ("Antakshari Party" - Pass & Play)**:
     - 2 Teams (e.g. "Team Sholay" 🔴 vs "Team DDLJ" 🔵, customizable!).
     - **Interactive Answer Checking**: Type & Verify with fuzzy match, Multiple Choice, or Host Secret Peek!
     - **⚡ Steal Phase**: If the active team gets it wrong, rival team gets 25s to steal!
     - Countdown timer (45s) with warning ticks and audio cues.
   - **🌐 Live Online Multiplayer Party Rooms ("BollyParty Online")**:
     - Real-time WebSockets synchronization across phones, tablets, and laptops!
     - Create room with a 4-letter room code (e.g. `QXES`).
     - Choose your Bollywood character avatar (Raj, Simran, Geet, Kabir, Bunny, Circuit, Pooh, Gabbar).
     - **Live Buzzer Battle**: Big interactive glowing buzzer on everyone's screen. First player to buzz locks out others for 10 seconds to answer!
     - **Floating Reactions**: Tap 💃, 🕺, 🔥, 👏, 🍿 to broadcast floating emojis across all connected screens in real-time!
     - Synchronized YouTube video reveal plays for all players together!

6. **Dual Media Player (YouTube & Spotify Copyright-Free)**:
   - **YouTube Video**: Hyper-accurate query with singer, title track, and movie to pull up the exact official video on the first search (e.g. `Rock On Farhan Akhtar Shankar Ehsaan Loy title track official video`).
   - **Spotify Web Player**: 100% legal, officially licensed embed (`open.spotify.com/embed/track/...`) with zero copyright blocks or domain restrictions. Switch between YouTube and Spotify seamlessly with one click!

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Frontend & Start Server
```bash
npm run build
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Development Mode (Hot Reload)

To run the Vite client dev server with hot module replacement:

```bash
# Terminal 1: Start Backend API + WebSocket Server
npm run server

# Terminal 2: Start Vite Dev Server
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 🔑 Gemini API Key (Free)

The game includes a pre-seeded curated deck of iconic Bollywood songs and a smart fallback generator, so **you can play immediately without any API key**.

To unlock unlimited AI lyric translation and generation for new songs:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click the **"AI & DB"** settings button in the top right corner of the web app and paste your key.
3. Or create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 📁 Project Architecture

```
Bollywood-Song-Guessing-Game/
├── server/
│   ├── database.js          # SQLite DB (node:sqlite), CSV loader, query & replenishment methods
│   ├── seedData.js          # Curated starter deck with YouTube IDs and Hinglish clues
│   ├── geminiService.js     # Optimized Gemini prompt & auto-replenishment generator
│   ├── roomManager.js       # WebSocket live multiplayer party room coordinator
│   └── index.js             # Express API server, static server & WebSocket server
├── src/
│   ├── components/
│   │   ├── Navbar.jsx       # Header with mode switcher, sound toggle, AI modal trigger
│   │   ├── SoloMode.jsx     # Solo guessing, era filters, multiple choice & text guess
│   │   ├── TeamPartyMode.jsx# Local pass-and-play team showdown with timer & steal mechanics
│   │   ├── MultiplayerMode.jsx # Live online rooms with room codes, avatars, live buzzer, reactions
│   │   ├── ClueCard.jsx     # Layered clue reveals (English riddle, actors, music, Hinglish)
│   │   ├── YouTubePlayer.jsx# Responsive 16:9 in-app YouTube player & direct link buttons
│   │   ├── SettingsModal.jsx# Gemini API Key configuration & database stats
│   │   └── SoundEffects.js  # Web Audio API zero-dependency sound effects synthesizer
│   ├── App.jsx              # Main app orchestration
│   ├── main.jsx             # React entry point
│   └── index.css            # Bollywood retro-modern styling, responsive layouts & animations
├── vite.config.mjs
├── index.html
└── package.json
```
