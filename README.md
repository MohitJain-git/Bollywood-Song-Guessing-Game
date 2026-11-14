# 🎬 BollyTrivia - AI Bollywood Song Guessing & Party Game

An AI-powered Bollywood music trivia web application built with **React**, **Node.js**, **Express**, **WebSockets**, **SQLite**, and **Google Gemini AI**. Guess Bollywood tracks from poetic English lyrical riddles, layered visual hints, and Hinglish lyrics, test your music ear in the **5-Second Audio Blitz**, and battle with friends locally or in real-time online multiplayer rooms!

> 💡 **Looking for the original Streamlit version?** It is preserved in the [`streamlit_app/`](./streamlit_app) directory. See [Running the Streamlit Version](#-option-2-running-the-classic-streamlit-version) below!

---

## 🌟 Features & Highlights

1. **Type-to-Guess for Full Points (with Multiple Choice Hint for Half Points)**:
   - **Solo Mode**: Type your guess to score maximum points (100, 80, 60, 40, or 20 PTS depending on clue level).
   - **5-Second Audio Blitz**: Listen to 5s of music and type the song title for **100 PTS** (or extend to 10s for **50 PTS**).
   - **Team Battle**: Teams type to score full points!
   - **Lifeline Hint**: Need choices? Click `💡 Reveal 4 Choices` anytime to reveal multiple-choice options for **half points** across all modes!

2. **⚡ 5-Second Audio Blitz ("Heardle Bollywood")**:
   - Sourced from 210 curated official streaming tracks (Topic channels, album master cuts, and lyrical releases).
   - Zero promo fanfares or studio bumpers (no Dharma Productions or record label intros).
   - Leading silence trimmed via FFmpeg so the audio clip begins at millisecond `0.00` with the actual acoustic music/chords!
   - Live waveform visualizer, progress tracking, and instant replay controls.

3. **In-App YouTube Video Player**:
   - High-accuracy search queries matching song name, movie, and primary singer so the official music video opens immediately.
   - Clean embedded 16:9 player with instant play/pause and direct fallback links.

4. **Curated 210-Song Lyrical Catalog + Self-Replenishing SQLite Database**:
   - 6 pristine groups totaling 210 verified songs spanning the 60s, 70s, 80s, 90s, 2000s, 2010s, and 2020s.
   - Deep Bollywood trivia facts and accurate 1:1 English lyrical translations with original Hinglish lyrics.
   - Database auto-replenishment via Google Gemini when unplayed cards run low.

5. **Multiplayer & Party Modes**:
   - **👥 Team Battle (Pass & Play)**: Team Sholay 🔴 vs. Team DDLJ 🔵 with live timer, active turns, and steal mechanics!
   - **🌐 Live Online Rooms**: Real-time WebSockets synchronization across phones and laptops with room codes, Bollywood character avatars, live buzzers, and floating emoji reactions!

---

## 🚀 Getting Started

### 📦 Option 1: Modern Full-Stack Web Application (Recommended)

#### 🌐 Deploying to Vercel (1-Click)
This project is configured out of the box for **Vercel** with zero database setup required:
1. Import your GitHub repository to [Vercel](https://vercel.com).
2. Vercel automatically detects `vercel.json` (`npm run build`, `dist` output, and Serverless Functions in `api/`).
3. *(Optional)* Add `GEMINI_API_KEY` in Environment Variables.
4. Click **Deploy**! See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete details.

#### 💻 Local Setup
1. **Install Dependencies**
```bash
npm install
```

2. **Build Frontend & Start Server**
```bash
npm run build
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

#### 3. Development Mode (Hot Reload)
```bash
# Terminal 1: Backend API + WebSocket Server
npm run server

# Terminal 2: Vite Dev Server
npm run dev
```
Navigate to `http://localhost:5173`.

---

### 🐍 Option 2: Running the Classic Streamlit Version

The original standalone Streamlit version is preserved in the `streamlit_app/` folder:

```bash
# 1. Navigate to the streamlit directory
cd streamlit_app

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Add your Gemini API key
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here

# 4. Launch Streamlit
streamlit run game.py
```
Or run the lightweight offline version:
```bash
streamlit run simple_version.py
```
The Streamlit app will open at `http://localhost:8501`.

---

## 🔑 Gemini API Key (Free)

The game includes a pre-seeded curated deck of 210 iconic Bollywood songs and a smart fallback generator, so **you can play immediately without any API key**.

To unlock unlimited AI lyric translation and generation for new songs:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click the **"AI & DB"** settings button in the top right corner of the web app and paste your key.
3. Or create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 📁 Repository Structure

```
Bollywood-Song-Guessing-Game/
├── public/
│   └── audio_clips/         # 210 pre-downloaded 15-second promo-free MP3 clips
├── server/
│   ├── curated/             # 6 pristine era decks (210 songs)
│   ├── audioDownloader.js   # Silence-trimmed audio engine targeting Topic & Lyrical tracks
│   ├── database.js          # SQLite persistence & CSV importer
│   ├── geminiService.js     # Optimized Gemini prompt & auto-replenishment generator
│   ├── roomManager.js       # WebSocket party room coordinator
│   └── index.js             # Express API server & static file host
├── src/
│   ├── components/
│   │   ├── AudioBlitzMode.jsx   # 5-sec Blitz audio challenge
│   │   ├── SoloMode.jsx         # Solo lyrical riddle guessing
│   │   ├── TeamPartyMode.jsx    # Pass-and-play team showdown with steal phase
│   │   ├── MultiplayerMode.jsx  # Live online buzzer battle with emoji reactions
│   │   ├── ClueCard.jsx         # Layered clue reveals
│   │   └── YouTubePlayer.jsx    # Embedded YouTube player
│   └── index.css                # Retro-modern styling & animations
├── streamlit_app/           # 🐍 Classic Streamlit Python version
│   ├── game.py              # Main Streamlit game
│   ├── simple_version.py    # Simplified Streamlit version
│   ├── config.ini           # Configuration file
│   ├── requirements.txt     # Python dependencies
│   ├── README.md            # Streamlit guide
│   └── *.csv                # Song datasets
├── package.json
└── vite.config.mjs
```

---

## 📜 License
MIT License. Created with ❤️ for Bollywood music lovers!
