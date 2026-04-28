import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

load_dotenv()

# Required Scopes
SCOPE = "user-read-playback-state,user-modify-playback-state,user-read-currently-playing"

def get_spotify_client():
    try:
        client_id = os.getenv("SPOTIPY_CLIENT_ID")
        client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
        redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI", "http://localhost:8888/callback")
        
        if not client_id or not client_secret:
            return None
            
        sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope=SCOPE,
            open_browser=False # Headless-ish
        ))
        return sp
    except Exception as e:
        print(f"[SPOTIFY] Auth Error: {e}")
        return None

def get_current_track():
    sp = get_spotify_client()
    if not sp: return None
    try:
        track = sp.current_playback()
        if track and track['item']:
            return {
                "name": track['item']['name'],
                "artist": track['item']['artists'][0]['name'],
                "is_playing": track['is_playing'],
                "progress_ms": track['progress_ms'],
                "duration_ms": track['item']['duration_ms'],
                "album_art": track['item']['album']['images'][0]['url'] if track['item']['album']['images'] else None
            }
        return None
    except Exception as e:
        print(f"[SPOTIFY] Error getting track: {e}")
        return None

def spotify_command(command: str):
    sp = get_spotify_client()
    if not sp: return {"success": False, "error": "Auth failed"}
    
    try:
        if command == "play":
            sp.start_playback()
        elif command == "pause":
            sp.pause_playback()
        elif command == "next":
            sp.next_track()
        elif command == "previous":
            sp.previous_track()
        return {"success": True}
    except Exception as e:
        print(f"[SPOTIFY] Command Error: {e}")
        return {"success": False, "error": str(e)}
