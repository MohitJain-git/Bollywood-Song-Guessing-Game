# Bollywood Song Game

A fun Streamlit-based trivia game where you guess Bollywood songs from AI-generated lyric clues and translations.

## What it does

The app presents a lyric-based challenge and lets you reveal the answer step by step:
- a first hint in English
- an extra hint if available
- the movie and artist details
- the final song answer
- a Spotify link to listen to the song

It uses:
- Streamlit for the web app
- Google Gemini for generating lyric clues
- Pandas for loading song data from CSV files

## File overview

- `game.py` - the main game experience with a two-step hint flow: first hint, second hint, then movie/artist details, and finally the answer
- `simpler_version.py` - the simpler version with a more direct question-and-answer flow
- `config.ini` - shared settings for the Gemini model, CSV files, and page title/icon
- CSV files such as `Best_of_Bollywood_-_2000s.csv` and `New_Hindi_2020-2024.csv` - song data

## Requirements

Make sure you have Python installed, then install the required packages:

```bash
pip install streamlit pandas google-generativeai python-dotenv
```

## Environment setup

Create a `.env` file in the project folder and add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

## Run the game

From the project folder, run one of these commands:

```bash
streamlit run game.py
```

This launches the main game with the layered hint system.

```bash
streamlit run simpler_version.py
```

This launches the simpler question-and-answer version.

Your browser will open the app automatically.

## Configuration

You can adjust the app settings in `config.ini`, including:
- the Gemini model name
- the CSV files used for the game
- the page title and icon

## Notes

- The app depends on the CSV files being present in the project folder.
- If the Gemini API key is missing or invalid, the app will show an error.
