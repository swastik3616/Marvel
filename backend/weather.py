import requests
import time
from datetime import datetime

# =========================
# WMO Weather Code → Description + Icon
# =========================
WMO_CODES = {
    0:  ("Clear Sky",          "☀️"),
    1:  ("Mainly Clear",       "🌤️"),
    2:  ("Partly Cloudy",      "⛅"),
    3:  ("Overcast",           "☁️"),
    45: ("Foggy",              "🌫️"),
    48: ("Icy Fog",            "🌫️"),
    51: ("Light Drizzle",      "🌦️"),
    53: ("Drizzle",            "🌦️"),
    55: ("Heavy Drizzle",      "🌧️"),
    61: ("Light Rain",         "🌧️"),
    63: ("Rain",               "🌧️"),
    65: ("Heavy Rain",         "🌧️"),
    71: ("Light Snow",         "🌨️"),
    73: ("Snow",               "❄️"),
    75: ("Heavy Snow",         "❄️"),
    77: ("Snow Grains",        "🌨️"),
    80: ("Showers",            "🌦️"),
    81: ("Rain Showers",       "🌧️"),
    82: ("Violent Showers",    "⛈️"),
    85: ("Snow Showers",       "🌨️"),
    86: ("Heavy Snow Showers", "❄️"),
    95: ("Thunderstorm",       "⛈️"),
    96: ("Hail Storm",         "⛈️"),
    99: ("Severe Hail Storm",  "⛈️"),
}

def wmo_desc(code):
    return WMO_CODES.get(code, ("Unknown", "🌡️"))

# =========================
# IP → lat/lon
# =========================
def get_lat_lon():
    try:
        r = requests.get("http://ip-api.com/json/", timeout=5)
        data = r.json()
        return data.get("lat"), data.get("lon"), data.get("city", "Unknown"), data.get("regionName", ""), data.get("country", "")
    except:
        return None, None, "Unknown", "", ""

# =========================
# Open-Meteo fetch
# =========================
def fetch_weather(lat=None, lon=None):
    try:
        if lat is None or lon is None:
            lat, lon, city, region, country = get_lat_lon()
            if lat is None:
                return None
        else:
            city, region, country = "Your Location", "", ""
            # Try to resolve city name from ip-api as fallback label
            try:
                r = requests.get("http://ip-api.com/json/", timeout=4)
                d = r.json()
                city = d.get("city", "Your Location")
                region = d.get("regionName", "")
                country = d.get("country", "")
            except:
                pass

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": [
                "temperature_2m",
                "apparent_temperature",
                "relative_humidity_2m",
                "weather_code",
                "wind_speed_10m",
                "wind_direction_10m",
                "uv_index",
                "precipitation",
                "cloud_cover",
                "surface_pressure",
            ],
            "hourly": [
                "temperature_2m",
                "weather_code",
                "precipitation_probability",
            ],
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "weather_code",
                "precipitation_probability_max",
                "sunrise",
                "sunset",
            ],
            "timezone": "auto",
            "forecast_days": 3,
            "wind_speed_unit": "kmh",
        }

        r = requests.get(url, params=params, timeout=8)
        data = r.json()

        current = data.get("current", {})
        hourly  = data.get("hourly", {})
        daily   = data.get("daily", {})

        wmo = current.get("weather_code", 0)
        desc, icon = wmo_desc(wmo)

        temp     = round(current.get("temperature_2m", 0))
        feels    = round(current.get("apparent_temperature", temp))
        humidity = current.get("relative_humidity_2m", 0)
        wind     = round(current.get("wind_speed_10m", 0))
        wind_dir = current.get("wind_direction_10m", 0)
        uv       = current.get("uv_index", 0)
        precip   = current.get("precipitation", 0)
        pressure = round(current.get("surface_pressure", 0))
        clouds   = current.get("cloud_cover", 0)

        # Wind direction label
        dirs = ["N","NE","E","SE","S","SW","W","NW"]
        wind_dir_label = dirs[round(wind_dir / 45) % 8]

        # UV risk label
        if uv < 3:   uv_label = "LOW"
        elif uv < 6: uv_label = "MODERATE"
        elif uv < 8: uv_label = "HIGH"
        elif uv < 11:uv_label = "VERY HIGH"
        else:         uv_label = "EXTREME"

        # Next 6 hours hourly forecast
        now_hour = datetime.now().hour
        hourly_times  = hourly.get("time", [])
        hourly_temps  = hourly.get("temperature_2m", [])
        hourly_codes  = hourly.get("weather_code", [])
        hourly_probs  = hourly.get("precipitation_probability", [])

        forecast_6h = []
        count = 0
        for i, t in enumerate(hourly_times):
            try:
                dt = datetime.fromisoformat(t)
                if dt > datetime.now() and count < 6:
                    h_desc, h_icon = wmo_desc(hourly_codes[i] if i < len(hourly_codes) else 0)
                    forecast_6h.append({
                        "hour":  dt.strftime("%I%p").lstrip("0"),
                        "temp":  round(hourly_temps[i]) if i < len(hourly_temps) else temp,
                        "icon":  h_icon,
                        "desc":  h_desc,
                        "rain":  hourly_probs[i] if i < len(hourly_probs) else 0,
                    })
                    count += 1
            except:
                pass

        # 3-day daily forecast
        daily_dates  = daily.get("time", [])
        daily_maxes  = daily.get("temperature_2m_max", [])
        daily_mins   = daily.get("temperature_2m_min", [])
        daily_codes  = daily.get("weather_code", [])
        daily_probs  = daily.get("precipitation_probability_max", [])
        daily_rises  = daily.get("sunrise", [])
        daily_sets   = daily.get("sunset", [])

        forecast_3d = []
        for i in range(min(3, len(daily_dates))):
            try:
                dt = datetime.fromisoformat(daily_dates[i])
                d_desc, d_icon = wmo_desc(daily_codes[i] if i < len(daily_codes) else 0)
                sunrise_str = daily_rises[i].split("T")[1][:5] if i < len(daily_rises) and "T" in daily_rises[i] else "--"
                sunset_str  = daily_sets[i].split("T")[1][:5]  if i < len(daily_sets)  and "T" in daily_sets[i]  else "--"
                forecast_3d.append({
                    "day":     dt.strftime("%a").upper(),
                    "max":     round(daily_maxes[i]) if i < len(daily_maxes) else temp,
                    "min":     round(daily_mins[i])  if i < len(daily_mins)  else temp,
                    "icon":    d_icon,
                    "desc":    d_desc,
                    "rain":    daily_probs[i] if i < len(daily_probs) else 0,
                    "sunrise": sunrise_str,
                    "sunset":  sunset_str,
                })
            except:
                pass

        location_str = city
        if region and region.lower() != city.lower():
            location_str += f", {region}"
        if country:
            location_str += f", {country}"

        return {
            "location":    location_str,
            "temp":        temp,
            "feels_like":  feels,
            "humidity":    humidity,
            "wind":        wind,
            "wind_dir":    wind_dir_label,
            "uv":          round(uv, 1),
            "uv_label":    uv_label,
            "precip":      precip,
            "pressure":    pressure,
            "clouds":      clouds,
            "condition":   desc,
            "icon":        icon,
            "wmo_code":    wmo,
            "forecast_6h": forecast_6h,
            "forecast_3d": forecast_3d,
            "fetched_at":  datetime.now().isoformat(),
        }

    except Exception as e:
        print(f"[WEATHER] Error: {e}")
        return None


# =========================
# Summarise for JARVIS system prompt / voice
# =========================
def weather_summary(w: dict) -> str:
    if not w:
        return "Weather data unavailable."
    lines = [
        f"Current weather in {w['location']}: {w['condition']} {w['icon']}, {w['temp']}°C (feels like {w['feels_like']}°C).",
        f"Humidity {w['humidity']}%, wind {w['wind']} km/h {w['wind_dir']}, UV index {w['uv']} ({w['uv_label']}).",
    ]
    if w.get("forecast_3d"):
        day_parts = []
        for d in w["forecast_3d"]:
            day_parts.append(f"{d['day']}: {d['icon']} {d['min']}–{d['max']}°C, {d['rain']}% rain chance")
        lines.append("3-day outlook — " + " | ".join(day_parts) + ".")
    return " ".join(lines)
