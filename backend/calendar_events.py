import json
import os
from datetime import datetime

DB_FILE = "meetings.json"

def load_meetings():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_meetings(meetings):
    with open(DB_FILE, "w") as f:
        json.dump(meetings, f, indent=4)

def add_event(title, date, time):
    meetings = load_meetings()
    new_event = {
        "id": len(meetings) + 1,
        "title": title,
        "date": date,
        "time": time,
        "created_at": datetime.now().isoformat()
    }
    meetings.append(new_event)
    save_meetings(meetings)
    return new_event

def get_upcoming_events():
    meetings = load_meetings()
    # Sort by date and time (simple string sort for now, assuming YYYY-MM-DD)
    # In a real app we'd parse them, but let's keep it simple.
    return sorted(meetings, key=lambda x: (x['date'], x['time']))
