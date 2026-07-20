import streamlit as st
import pandas as pd
import google.generativeai as genai
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
PAGE_TITLE = get_config_value("game", "page_title", fallback="Bollywood Guess")
PAGE_ICON = get_config_value("game", "page_icon", fallback="🎵")

# 1. SETUP
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    st.error("⚠️ GEMINI_API_KEY not found in .env file!")
    st.stop()

genai.configure(api_key=api_key)

# 2. DATA FUNCTIONS
def clean_text(text):
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r'\s*\(.*?\)', '', text)
    return text.strip()

@st.cache_data
def load_data():
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
            if {'Song', 'Artist', 'Movie', 'Spotify_URI'}.issubset(temp_df.columns):
                dfs.append(temp_df[['Song', 'Artist', 'Movie', 'Spotify_URI']])
        except Exception as e:
            print(f"[DEBUG] ❌ Error reading {file_name}: {e}")

    if not dfs:
        return None

    df = pd.concat(dfs, ignore_index=True)
    df['Clean_Song'] = df['Song'].apply(clean_text)
    df['Clean_Movie'] = df['Movie'].apply(clean_text)
    df['Artist'] = df['Artist'].str.replace(';', ', ')
    return df.drop_duplicates(subset=['Clean_Song', 'Artist'])

def get_spotify_url(uri):
    if isinstance(uri, str) and "spotify:track:" in uri:
        track_id = uri.split(":")[-1]
        return f"https://open.spotify.com/track/{track_id}"
    return None

# 3. AI & SEARCH
def get_song_clues(song_name, artist):
    """Now asks for TWO different snippets."""
    # prompt = f"""
    # The song is "{song_name}" by "{artist}".
    
    # Task: Select TWO DIFFERENT, famous 2-line snippets from the lyrics of the song.
    # 1. Snippet A: The most famous hook (Chorus).
    # 2. Snippet B: A different verse or line.
    
    # Translate both to English.
    
    # Output strictly a JSON object:
    # {{
    #     "snippet_1": {{ "hindi": "Hindi lyrics A...", "english": "English translation A..." }},
    #     "snippet_2": {{ "hindi": "Hindi lyrics B...", "english": "English translation B..." }}
    # }}
    # """

    prompt = f"""
    You are a backend API for a Bollywood music trivia game.
    Target Song: "{song_name}"
    Artist: "{artist}"

    Your task is to generate valid JSON data for this song with two distinct lyric snippets.

    GUIDELINES:
    1. **Snippet 1**: Must be the most famous Chorus/Hook.
    2. **Snippet 2**: Must be a random Verse (Antara) or a different line.
    3. **Language**: The "hindi" field MUST be in **Roman Script (Hinglish)**, not Devanagari.
    4. **Format**: Return ONLY raw JSON. Do not use Markdown (```json).

    ---
    EXAMPLE INPUT:
    Song: "Tum Hi Ho", Artist: "Arijit Singh"

    EXAMPLE OUTPUT:
    {{
        "snippet_1": {{
            "hindi": "Hum tere bin ab reh nahi sakte, tere bina kya wajood mera",
            "english": "I cannot live without you now, what is my existence without you"
        }},
        "snippet_2": {{
            "hindi": "Tera mera rishta hai kaisa, ek pal door gawara nahi",
            "english": "What kind of bond is this between us, I cannot bear a moment apart"
        }}
    }}
    ---

    Now, generate the JSON for the Target Song above.
    """

    model = genai.GenerativeModel(MODEL_NAME)

    try:
        # 2. Make the API Call
        response = model.generate_content(prompt)
        text = response.text
        
        # 3. Robust JSON Extraction (Finds the first '{' and last '}')
        start_idx = text.find('{')
        end_idx = text.rfind('}') + 1
        
        if start_idx != -1 and end_idx != -1:
            clean_json = text[start_idx:end_idx]
            return json.loads(clean_json)
        else:
            # Output debugging info if JSON is missing
            print(f"[ERROR] JSON not found. Raw AI Output:\n{text}")
            return None
            
    except Exception as e:
        # 4. Print the specific error (e.g., 404 Model Not Found, 429 Quota Exceeded)
        print(f"[CRITICAL ERROR] {e}")
        return None

# 4. UI SETUP
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON, layout="centered")

# CSS for better button styling
st.markdown("""
<style>
    .stButton>button { width: 100%; border-radius: 8px; height: 50px; }
    .big-font { font-size: 20px !important; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

st.title("🎵 Guess the Bollywood Song")

df = load_data()

if df is not None:
    # --- SESSION STATE INITIALIZATION ---
    if 'current_song' not in st.session_state:
        st.session_state.current_song = None
    if 'clues' not in st.session_state:
        st.session_state.clues = None
    
    # Track which hints are shown
    if 'show_hint_2' not in st.session_state:
        st.session_state.show_hint_2 = False
    if 'show_details' not in st.session_state:
        st.session_state.show_details = False
    if 'show_answer' not in st.session_state:
        st.session_state.show_answer = False

    # --- MAIN CONTROLS ---
    # "New Round" is always at the top or sidebar
    if st.button("🔄 Start New Round", type="primary"):
        # Reset everything
        st.session_state.show_hint_2 = False
        st.session_state.show_details = False
        st.session_state.show_answer = False
        st.session_state.current_song = df.sample(1).iloc[0]
        
        with st.spinner("🎧 AI is translating lyrics..."):
            song = st.session_state.current_song
            st.session_state.clues = get_song_clues(song['Song'], song['Artist'])

    st.markdown("---")

    # --- GAME DISPLAY ---
    if st.session_state.current_song is not None and st.session_state.clues:
        song = st.session_state.current_song
        clues = st.session_state.clues
        
        # 1. DISPLAY ENGLISH LYRICS (The Puzzle)
        st.markdown("### 📜 English Translation")
        
        # Snippet 1
        st.info(f"1️⃣ \"{clues['snippet_1']['english']}\"")
        
        # Snippet 2 (Hidden by default)
        if st.session_state.show_hint_2:
            st.info(f"2️⃣ \"{clues['snippet_2']['english']}\"")
        
        # 2. CONTROL BUTTONS (3 Columns)
        c1, c2, c3 = st.columns(3)
        
        with c1:
            # Button: Another Line
            if not st.session_state.show_hint_2:
                if st.button("➕ Another Line"):
                    st.session_state.show_hint_2 = True
                    st.rerun()
            else:
                st.button("➕ Another Line", disabled=True)

        with c2:
            # Button: Show Movie/Artist/Hindi
            if not st.session_state.show_details:
                if st.button("🎬 Show Details"):
                    st.session_state.show_details = True
                    st.rerun()
            else:
                st.button("🎬 Details Shown", disabled=True)

        with c3:
            # Button: Reveal Answer
            if not st.session_state.show_answer:
                if st.button("👁️ Reveal Answer"):
                    st.session_state.show_answer = True
                    st.rerun()

        st.markdown("---")

        # 3. REVEAL SECTIONS
        
        # SECTION A: DETAILS (Movie, Artist, Hindi)
        if st.session_state.show_details or st.session_state.show_answer:
            st.warning("📝 **Song Details & Hindi Lyrics**")
            col_a, col_b = st.columns(2)
            with col_a:
                st.write(f"**🎬 Movie:** {song['Clean_Movie']}")
                st.write(f"**🎤 Artist:** {song['Artist']}")
            with col_b:
                st.write("**🇮🇳 Hindi (Snippet 1):**")
                st.caption(clues['snippet_1']['hindi'])
                if st.session_state.show_hint_2:
                    st.write("**🇮🇳 Hindi (Snippet 2):**")
                    st.caption(clues['snippet_2']['hindi'])
            st.markdown("---")

        # SECTION B: ANSWER (Song Name + Video)
        if st.session_state.show_answer:
            st.success(f"🎉 The song is: **{song['Song']}**")
            
            # Spotify Link
            spotify_url = get_spotify_url(song['Spotify_URI'])
            if spotify_url:
                st.link_button("🟢 Play on Spotify", spotify_url)

            st.info("🎧 Use the Spotify link above to listen to the song.")

else:
    st.error("Data not found. Please check CSV files.")