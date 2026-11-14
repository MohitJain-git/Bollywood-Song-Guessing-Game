# 🚀 Deploying BollyTrivia to Vercel

BollyTrivia is fully architected and optimized to deploy seamlessly to **Vercel** with **zero database configuration** and **instant global CDN audio streaming**.

---

## ⚡ Quick 1-Click Deploy via Vercel Dashboard

1. **Push your code to GitHub** (already synchronized with `origin/main`).
2. Log in to [vercel.com](https://vercel.com).
3. Click **"Add New..."** > **"Project"**.
4. Select your GitHub repository: `MohitJain-git/Bollywood-Song-Guessing-Game`.
5. Vercel will automatically detect the settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Node Version**: `>=20.x` (or `>=22.x`)
6. *(Optional)* Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key, if you want dynamic AI song generation)*
7. Click **Deploy**! 🚀

Within ~60 seconds, your application will be live at `https://your-project.vercel.app`.

---

## 💻 Alternative: Deploying via Vercel CLI

If you have the Vercel CLI installed:

```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Deploy to preview
vercel

# 3. Deploy to production
vercel --prod
```

---

## 🏗️ Architecture on Vercel: How It Works

### 1. 🎵 210 Clean MP3 Audio Clips (Vercel Global CDN)
- All 210 trimmed, silence-free 15-second audio clips live in `public/audio_clips/*.mp3`.
- During `npm run build`, Vite copies them directly into `dist/audio_clips/*.mp3`.
- Vercel's global Edge CDN serves these clips directly to players worldwide with **0ms latency** and native **HTTP 206 byte-range streaming**, incurring zero serverless function execution costs!

### 2. 🗄️ Database Management (Zero External Services Needed)
- **Turnkey SQLite & Memory Catalog**: You do **not** need to set up or pay for any external database (such as AWS RDS, Supabase, Neon, or MongoDB).
- When a Vercel Serverless Function starts, it uses the embedded SQLite database in `/tmp` (the writable serverless scratch space) and automatically falls back to the in-memory 210-song curated catalog.
- Cards, clues, distractors, and facts are available instantly.

### 3. 🧠 Google Gemini AI Auto-Replenishment (Optional)
- You can add your `GEMINI_API_KEY` in Vercel's **Project Settings > Environment Variables** (or enter it right in the app's settings modal).
- When unplayed cards run low, the serverless function dynamically crafts new lyrical riddles using Google Gemini AI.

### 4. 🎮 Supported Game Modes on Vercel
- **🎯 Solo Mode**: 100% supported (Type to guess for full points + hint button for half points).
- **⚡ 5-Second Audio Blitz**: 100% supported (Stream clean audio from CDN, type for 100 PTS or listen to 10s for 50 PTS).
- **👥 Team Battle (Pass & Play)**: 100% supported (Local party mode with timer, turn rotation, and steals).
- **🌐 Live WebSockets Online Rooms**: Vercel Serverless Functions are ephemeral request/response functions and do not sustain continuous stateful WebSockets connections. For live cross-device party rooms with buzzer synchronization across remote networks, you can run the backend with `npm start` on Node.js or deploy to container hosts like Railway or Render.

---

## 🐍 Classic Streamlit Version Note

If you ever want to run or deploy the original Python Streamlit version, it is completely preserved in the [`streamlit_app/`](./streamlit_app) directory and can be deployed directly to [Streamlit Community Cloud](https://share.streamlit.io).
