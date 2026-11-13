# 🎬 Bollywood Song Guessing Game (Classic Streamlit Version)

This folder contains the original standalone Python / Streamlit version of the Bollywood Song Guessing Game.

---

## 🚀 Quickstart

### 1. Navigate to this directory
```bash
cd streamlit_app
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Gemini API Key
Create a `.env` file in this directory or in the project root:
```bash
cp .env.example .env
```
Add your free Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Streamlit Application
```bash
streamlit run game.py
```
Or for the lightweight offline version:
```bash
streamlit run simple_version.py
```

The app will open automatically in your browser at `http://localhost:8501`.

---

## 📂 Included Files
- `game.py`: The complete Streamlit app with AI-powered Hindi-to-English translation riddles.
- `simple_version.py`: Lightweight/simplified game version.
- `config.ini`: Configuration for model name (`gemini-2.5-flash`), song datasets, and titles.
- `Best_of_Bollywood_-_2000s.csv`: 2000s Bollywood song dataset.
- `New_Hindi_2020-2024.csv`: 2020-2024 recent hits dataset.
- `H.csv`: Extended Hindi catalog dataset.
- `requirements.txt`: Python package requirements.
