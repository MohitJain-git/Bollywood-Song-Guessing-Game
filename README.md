# 🎬 BollyTrivia — Bollywood Song Guessing & 5-Second Audio Blitz

**Live App:** [bollywood-song-guessing-game.vercel.app](https://bollywood-song-guessing-game.vercel.app/)

An interactive Bollywood music trivia game built with **React**, **Node.js**, **Express**, **SQLite**, and **Google Gemini AI**. Guess iconic and latest Bollywood tracks from English lyric clues, test your ear in the **5-Second Audio Blitz**, or face off in **Team Battle** (*Team Sholay* vs. *Team DDLJ*) — with **10 fresh latest Bollywood songs added automatically every day**.

> 💡 **Classic Streamlit Version:** The original Python Streamlit app is preserved in [`streamlit_app/`](./streamlit_app).

---

## ✨ Game Modes

### 1. 🎧 Solo Lyrical Guess
Decode a Bollywood song across 5 progressive clue stages:
- **Clue 1 (100 PTS) • Hook Riddle:** Poetic English translation of the iconic opening hook (*Mukhda*).
- **Clue 2 (80 PTS) • Direct Word-for-Word Verse Translation:** Literal word-by-word Hindi-to-English translation of the verse (*Antara*) in exact Hindi word order.
- **Clue 3 (60 PTS) • Cinema Frame:** Iconic on-screen setting, choreography, and lead stars.
- **Clue 4 (40 PTS) • Maestro & Era:** Composer, vocalists, instrumentation, and release era.
- **Clue 5 (20 PTS) • Hinglish Lyrics:** Original Romanized Hindi lyrics.

### 2. ⚡ 5-Second Audio Blitz (Solo & Team Battle)
- Listen to a **5-second studio intro clip** (with channel promos and leading silence removed) for **100 PTS**, or extend to **10 seconds** for **50 PTS**.
- Play solo to build your streak or switch to **⚔️ 5-Sec Team Battle** for pass-and-play team competition.

### 3. ⚔️ Team Battle (*Team Sholay* 🔴 vs. *Team DDLJ* 🔵)
- Available for both **📜 Lyrical Riddles** and **⚡ 5-Second Audio Blitz**.
- Features customizable team names, 45-second round timer, **Host Secret Peek**, verbal host controls, and a 25-second **⚡ Rival Team Steal Phase**.

---

## 🎯 Scoring & Gameplay Rules

- **Type for Full Points:** Type the song title (with Hinglish phonetic & fuzzy typo tolerance) to earn **100% of the clue's point value**.
- **Multiple-Choice Lifeline (Half Points):** Reveal 4 song choices anytime to play for **50% points**. Picking a wrong multiple-choice option ends the question with **0 PTS**.
- **Session Persistence:** Your active song, clue level, score, streak, and team state are saved automatically across browser reloads.
- **Automated Daily 10 Latest Songs:** 10 latest Bollywood chartbusters (with studio audio clips and lyrical clues) are synced automatically every day for both games.

---

## 🚀 Quick Start

### Run Locally
```bash
# 1. Install dependencies
npm install

# 2. Build frontend & start production server
npm run build
npm start
```
Open `http://localhost:3000`.

### Development Mode
```bash
npm run server   # Starts Express API on :3000
npm run dev      # Starts Vite dev server on :5173
```

### Run the Classic Streamlit Version
```bash
cd streamlit_app
pip install -r requirements.txt
streamlit run game.py
```

---

## 🗂️ Project Structure

```text
Bollywood-Song-Guessing-Game/
├── api/index.js                   # Vercel Serverless Function entry
├── public/audio_clips/            # Pre-extracted 15s bumper-free studio MP3 clips
├── scripts/
│   ├── syncDaily10Songs.js        # Automated daily 10 latest Bollywood songs sync
│   └── fixBumperClips.js          # Channel promo/bumper offset trimmer
├── server/
│   ├── curated/                   # Verified song catalog + daily_synced_songs.json
│   ├── dailySongsService.js       # Daily latest Bollywood track discovery & sync
│   ├── literalTranslator.js       # 1:1 Hindi-to-English word-by-word verse translator
│   ├── database.js                # SQLite + serverless in-memory fallback
│   ├── geminiService.js           # Gemini AI card & smart-hint generator
│   └── index.js                   # Express API server
├── src/
│   ├── components/
│   │   ├── SoloMode.jsx           # Solo lyrical guessing game
│   │   ├── AudioBlitzMode.jsx     # 5-Sec Audio Blitz (Solo & Team switcher)
│   │   ├── AudioBlitzTeamMode.jsx # 5-Sec Audio Blitz Team Battle
│   │   ├── TeamPartyMode.jsx      # Lyrical & Audio Team Battle
│   │   ├── ClueCard.jsx           # 5-step clue progression & Shayari decoder
│   │   └── YouTubePlayer.jsx      # Timestamp-synced YouTube & local audio player
│   └── utils/gameTech.js          # Hinglish phonetic matcher & session store
└── streamlit_app/                 # Classic Python Streamlit version
```

---

## 📜 License
MIT License.
