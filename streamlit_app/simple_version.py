import streamlit as st
import pandas as pd
from google import genai
import os
import re
import json
import configparser
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.ini"


def load_config():
    config = configparser.ConfigParser()
    config.read(CONFIG_PATH)
    return config


config = load_config()


def get_config_value(section, key, fallback=None):
    if config.has_section(section) and config.has_option(section, key):
        return config.get(section, key, fallback=fallback)
    return fallback


MODEL_NAME = get_config_value("game", "model_name", fallback="gemini-2.5-flash")
DATA_FILES = [item.strip() for item in get_config_value("game", "data_files", fallback="Best_of_Bollywood_-_2000s.csv,New_Hindi_2020-2024.csv").split(",") if item.strip()]
PAGE_TITLE = get_config_value("game", "page_title", fallback="Bollywood Lyric Flashcards")
PAGE_ICON = get_config_value("game", "page_icon", fallback="🎵")

# 1. SETUP & DEBUG
print("[DEBUG] Starting App...")
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    st.error("⚠️ GEMINI_API_KEY not found in .env file!")
    st.stop()

client = genai.Client(api_key=api_key)

# 2. DATA FUNCTIONS
def clean_text(text):
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r'\s*\(.*?\)', '', text)
    return text.strip()

@st.cache_data
def load_data():
    print("[DEBUG] 📂 Loading Data...")
    dfs = []

    for file_name in DATA_FILES:
        data_path = None
        for candidate in [BASE_DIR / file_name, Path(file_name)]:
            if candidate.exists():
                data_path = candidate
                break

        if data_path is None:
            print(f"[DEBUG] ⚠️ File not found: {file_name}")
            continue

        try:
            temp_df = pd.read_csv(data_path)

            temp_df = temp_df.rename(columns={
                'Track Name': 'Song',
                'Artist Name(s)': 'Artist',
                'Album Name': 'Movie',
                'Track URI': 'Spotify_URI'
            })

            required_cols = {'Song', 'Artist', 'Movie', 'Spotify_URI'}
            if required_cols.issubset(temp_df.columns):
                dfs.append(temp_df[['Song', 'Artist', 'Movie', 'Spotify_URI']])
            else:
                print(f"[DEBUG] ⚠️ Skipped {file_name} (Missing columns)")
        except Exception as e:
            print(f"[DEBUG] ❌ Error reading {file_name}: {e}")

    if not dfs:
        return None

    df = pd.concat(dfs, ignore_index=True)
    df['Clean_Song'] = df['Song'].apply(clean_text)
    df['Clean_Movie'] = df['Movie'].apply(clean_text)
    df['Artist'] = df['Artist'].str.replace(';', ', ')

    df = df.drop_duplicates(subset=['Clean_Song', 'Artist'])
    print(f"[DEBUG] ✅ Loaded {len(df)} songs.")
    return df

def get_spotify_url(uri):
    """Converts 'spotify:track:12345' to a clickable web link."""
    if isinstance(uri, str) and "spotify:track:" in uri:
        track_id = uri.split(":")[-1]
        return f"https://open.spotify.com/track/{track_id}"
    return None

# 3. AI & SEARCH FUNCTIONS
def get_song_clues(song_name, artist):
    prompt = f"""
    The song is "{song_name}" by "{artist}".
    Select a famous 2-line snippet of the lyrics in Hindi and translate it to English.
    
    Output strictly a JSON object:
    {{
        "hindi_lyrics": "Hindi lyrics here...",
        "english_translation": "English translation here..."
    }}
    """
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_json)
    except:
        return None

# 4. APP UI
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON, layout="centered")

st.title("🎵 Bollywood Lyric Flashcards")
st.markdown("Read the translation. Guess the song. **Reveal** to listen.")

df = load_data()

if df is not None:
    # Session State
    if 'current_song' not in st.session_state:
        st.session_state.current_song = None
    if 'clues' not in st.session_state:
        st.session_state.clues = None
    if 'revealed' not in st.session_state:
        st.session_state.revealed = False

    # --- BUTTON: NEW CARD ---
    if st.button("🔄 Pick a Random Song", type="primary"):
        st.session_state.revealed = False
        st.session_state.current_song = df.sample(1).iloc[0]
        
        with st.spinner("🤖 Generating flashcard..."):
            song = st.session_state.current_song
            st.session_state.clues = get_song_clues(song['Song'], song['Artist'])

    # --- DISPLAY CARD ---
    if st.session_state.current_song is not None and st.session_state.clues:
        song = st.session_state.current_song
        clues = st.session_state.clues
        
        # CARD: The Challenge
        st.info(f"🎶 \"{clues['english_translation']}\"")
        
        st.markdown("---")

        # BUTTON: Reveal Answer
        if not st.session_state.revealed:
            if st.button("👁️ Show Answer & Listen"):
                st.session_state.revealed = True
                st.rerun()

        # REVEALED CONTENT
        if st.session_state.revealed:
            st.success(f"**Song:** {song['Song']}")
            
            # Details
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**🎬 Movie:** {song['Clean_Movie']}")
                st.write(f"**🎤 Artist:** {song['Artist']}")
            with col2:
                st.write("**🇮🇳 Hindi Lyrics:**")
                st.caption(clues['hindi_lyrics'])

            st.markdown("---")
            st.markdown("### 🎧 Listen Now")

            # 1. SPOTIFY BUTTON (100% Reliable)
            spotify_url = get_spotify_url(song['Spotify_URI'])
            if spotify_url:
                st.link_button("🟢 Play on Spotify", spotify_url)
            
            st.info("🎧 Use the Spotify link above to listen to the song.")

else:
    st.error("Data not found. Please check CSV files.")