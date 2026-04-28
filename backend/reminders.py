import asyncio
import uuid
from datetime import datetime, timedelta

# ── In-memory reminder store ──────────────────────────────────────────────────
reminders: list[dict] = []

# Injected from main.py so we can broadcast over WebSocket
_broadcast_fn = None


def set_broadcast(fn):
    global _broadcast_fn
    _broadcast_fn = fn


# ── Add a reminder ─────────────────────────────────────────────────────────────
def add_reminder(label: str, seconds: int) -> dict:
    fire_at = datetime.now() + timedelta(seconds=seconds)
    reminder = {
        "id":        str(uuid.uuid4())[:8],
        "label":     label,
        "fire_at":   fire_at,
        "seconds":   seconds,
        "triggered": False,
    }
    reminders.append(reminder)
    print(f"[REMINDER] Set: '{label}' fires in {seconds}s at {fire_at.strftime('%H:%M:%S')}")
    return reminder


# ── Get active reminders (not yet triggered) ───────────────────────────────────
def get_active_reminders() -> list[dict]:
    now = datetime.now()
    return [
        {
            "id":          r["id"],
            "label":       r["label"],
            "seconds_left": max(0, int((r["fire_at"] - now).total_seconds())),
            "triggered":   r["triggered"],
        }
        for r in reminders
        if not r["triggered"]
    ]


# ── Background loop — checks every second ─────────────────────────────────────
async def reminder_loop():
    while True:
        now = datetime.now()
        for r in reminders:
            if not r["triggered"] and now >= r["fire_at"]:
                r["triggered"] = True
                print(f"[REMINDER] Firing: '{r['label']}'")
                if _broadcast_fn:
                    await _broadcast_fn({
                        "type":  "reminder",
                        "label": r["label"],
                        "id":    r["id"],
                    })

        # Purge triggered reminders older than 60 s
        reminders[:] = [
            r for r in reminders
            if not r["triggered"] or (now - r["fire_at"]).total_seconds() < 60
        ]

        await asyncio.sleep(1)
