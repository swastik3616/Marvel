import os
import requests

def get_geolocation():
    """
    Fetches the current geolocation based on the user's IP.
    Uses ipgeolocation.io API.
    """
    api_key = os.getenv("IPGEOLOCATION_API_KEY")
    
    if not api_key or api_key == "your_ipgeolocation_api_key_here":
        return "Unknown (Geolocation API key not configured)"

    try:
        url = f"https://api.ipgeolocation.io/ipgeo?apiKey={api_key}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        city = data.get("city", "Unknown City")
        state = data.get("state_prov", "Unknown State")
        country = data.get("country_name", "Unknown Country")
        
        return f"{city}, {state}, {country}"
        
    except requests.exceptions.RequestException as e:
        print(f"[LOCATION ERROR] Failed to fetch geolocation: {e}")
        return "Unknown (Failed to fetch location)"
