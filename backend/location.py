import asyncio
import requests
import time

# -----------------------------
# Reverse geocode using OpenStreetMap
# -----------------------------
def reverse_geocode(lat, lon):
    try:
        url = "https://nominatim.openstreetmap.org/reverse"

        params = {
            "lat": lat,
            "lon": lon,
            "format": "jsonv2",
            "zoom": 18,
            "addressdetails": 1
        }

        headers = {
            "User-Agent": "JARVIS-Assistant"
        }

        r = requests.get(url, params=params, headers=headers, timeout=8)
        data = r.json()

        address = data.get("address", {})

        # Try exact small area first
        place = (
            address.get("village")
            or address.get("hamlet")
            or address.get("suburb")
            or address.get("neighbourhood")
            or address.get("town")
            or address.get("city")
            or address.get("municipality")
            or address.get("county")
            or "Unknown Area"
        )

        district = (
            address.get("state_district")
            or address.get("county")
            or address.get("district")
            or ""
        )

        state = address.get("state", "Unknown State")
        country = address.get("country", "Unknown Country")

        if district and district.lower() != place.lower():
            return f"{place}, {district}, {state}, {country}"

        return f"{place}, {state}, {country}"

    except:
        return None


# -----------------------------
# Windows Real Device Location
# -----------------------------
async def get_windows_location():
    try:
        from winrt.windows.devices.geolocation import Geolocator, GeolocationAccessStatus

        status = await Geolocator.request_access_async()
        if status != GeolocationAccessStatus.ALLOWED:
            return None

        locator = Geolocator()
        pos = await locator.get_geoposition_async()

        lat = pos.coordinate.point.position.latitude
        lon = pos.coordinate.point.position.longitude

        location = reverse_geocode(lat, lon)

        if location:
            return location

        return f"Lat:{lat}, Lon:{lon}"

    except:
        return None


# -----------------------------
# Fallback IP Location
# -----------------------------
def get_ip_location():
    try:
        r = requests.get("http://ip-api.com/json/", timeout=5)
        data = r.json()

        city = data.get("city", "Unknown City")
        district = data.get("regionName", "")
        country = data.get("country", "Unknown Country")

        if district:
            return f"{city}, {district}, {country}"

        return f"{city}, {country}"

    except:
        return "Unknown Location"


# -----------------------------
# Main Function for JARVIS
# -----------------------------
def get_geolocation():
    try:
        result = asyncio.run(get_windows_location())

        if result:
            return result

    except:
        pass

    return get_ip_location()