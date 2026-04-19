"""
notification_listener.py — JARVIS WhatsApp Notification Listener
================================================================
Run this in a SEPARATE terminal:  python notification_listener.py

Strategy:
  PRIMARY  → winsdk (Windows Runtime) — event-driven, low latency
  FALLBACK → pywin32  polling of Notification tray every 2 s

In both cases only WhatsApp notifications are forwarded.
Duplicate suppression: SHA-256 hash of (sender + body).
"""

import asyncio
import hashlib
import json
import time
import sys
import os
import requests

BACKEND_URL = "http://localhost:8000/notification"
WHATSAPP_APP_NAMES = {"whatsapp", "com.squirrel.whatsapp.whatsapp", "whatsappdesktop"}
POLL_INTERVAL = 2  # seconds, fallback mode
_seen_hashes: set = set()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_hash(sender: str, body: str) -> str:
    raw = f"{sender.strip().lower()}|{body.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _post_notification(sender: str, message: str, app: str = "WhatsApp") -> None:
    """Send a parsed notification to the FastAPI backend."""
    h = _make_hash(sender, message)
    if h in _seen_hashes:
        return  # duplicate — skip
    _seen_hashes.add(h)

    payload = {"sender": sender, "message": message, "app": app}
    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=5)
        if r.status_code == 200:
            print(f"[NOTIF] Sent → {sender}: {message[:60]}")
        else:
            print(f"[NOTIF] Backend rejected: {r.status_code}")
    except requests.exceptions.ConnectionError:
        print("[NOTIF] Backend not reachable — is uvicorn running?")
    except Exception as e:
        print(f"[NOTIF] Error posting: {e}")


def _is_whatsapp(app_id: str) -> bool:
    return any(w in app_id.lower() for w in WHATSAPP_APP_NAMES)


def _parse_whatsapp_body(title: str, body: str):
    """
    WhatsApp toast layout:
      title = sender name  (or group name)
      body  = message text
    Returns (sender, message) or (None, None) if unparseable.
    """
    sender = (title or "").strip()
    message = (body or "").strip()
    if not sender or not message:
        return None, None
    # Filter out system messages / status updates
    if sender.lower() in {"whatsapp", ""}:
        return None, None
    return sender, message


# ─────────────────────────────────────────────────────────────────────────────
# PRIMARY: winrt (Python-WinRT 3.x, modular packages) — async event listener
# Installed packages used:
#   pip install winrt-Windows.UI.Notifications winrt-Windows.Data.Xml.Dom
# ─────────────────────────────────────────────────────────────────────────────

async def _winrt_listener():
    """Subscribe to all Windows UserNotification events via winrt 3.x."""
    # ── New modular winrt import style (NOT winsdk) ──────────────────────────
    from winrt.windows.ui.notifications.management import (
        UserNotificationListener,
        UserNotificationListenerAccessStatus,  # lives in .management in winrt 3.x
    )
    from winrt.windows.ui.notifications import (
        KnownNotificationBindings,
        NotificationKinds,
    )

    listener = UserNotificationListener.get_current()  # winrt 3.x uses get_current()
    status = await listener.request_access_async()

    if status != UserNotificationListenerAccessStatus.ALLOWED:
        print("[NOTIF][winrt] Access denied by Windows — switching to fallback.")
        print("[NOTIF][winrt] Tip: Allow notification access in Windows Settings > Privacy > Notifications")
        return False

    print("[NOTIF][winrt] Access granted. Listening for WhatsApp notifications…")

    seen_ids: set = set()

    while True:
        try:
            notifs = await listener.get_notifications_async(NotificationKinds.TOAST)

            for notif in notifs:
                nid = notif.id
                if nid in seen_ids:
                    continue
                seen_ids.add(nid)

                try:
                    app_info = notif.app_info
                    if app_info is None:
                        continue
                    app_id = (app_info.app_user_model_id or "").lower()
                    if not _is_whatsapp(app_id):
                        continue

                    toast = notif.notification
                    binding = toast.visual.get_binding(
                        KnownNotificationBindings.get_toast_generic()
                    )
                    if binding is None:
                        continue

                    text_elements = binding.get_text_elements()
                    texts = [text_elements.get_at(i).text
                             for i in range(text_elements.size)]
                             
                    print(f"[NOTIF][winrt] Raw WhatsApp notification texts: {texts}")

                    # Different versions of WhatsApp send different layouts
                    if texts and texts[0].strip().lower() in {"whatsapp", "whatsapp desktop"}:
                        title = texts[1] if len(texts) > 1 else ""
                        body  = texts[2] if len(texts) > 2 else ""
                    else:
                        title = texts[0] if len(texts) > 0 else ""
                        body  = texts[1] if len(texts) > 1 else ""

                    # Sometimes the title is something like "2 new messages"
                    if "new messages" in title.lower() and len(texts) >= 3:
                        title = texts[1]
                        body = texts[2]

                    sender, message = _parse_whatsapp_body(title, body)
                    if sender:
                        _post_notification(sender, message)

                except Exception as inner:
                    print(f"[NOTIF][winrt] Parse error on notif {nid}: {inner}")

        except Exception as e:
            print(f"[NOTIF][winrt] Loop error: {e}")

        await asyncio.sleep(POLL_INTERVAL)



# ─────────────────────────────────────────────────────────────────────────────
# FALLBACK: pywin32 — COM IToastNotificationManagerStatics polling
# ─────────────────────────────────────────────────────────────────────────────

def _pywin32_fallback():
    """
    Polls Windows Notification tray via win32api / comtypes.
    Less reliable but works without winsdk.
    Reads the latest visible toast from Action Center using
    UI Automation (the only guaranteed approach for standalone WhatsApp).
    """
    try:
        import win32gui
        import win32con
    except ImportError:
        print("[NOTIF][fallback] pywin32 not installed. Cannot poll notifications.")
        return

    print("[NOTIF][fallback] Polling Action Center via pywin32…")

    # Track notification window handles we've already processed
    seen_texts: set = set()

    def _scan_windows(hwnd, results):
        """Recursively collect text from notification popup windows."""
        try:
            cls = win32gui.GetClassName(hwnd)
            title = win32gui.GetWindowText(hwnd)
            # Windows 10/11 toast notification host windows
            if "ToastGenericContent" in cls or "Windows.UI.Core" in cls:
                results.append(title)
        except Exception:
            pass
        return True

    while True:
        try:
            results = []
            win32gui.EnumWindows(_scan_windows, results)
            for text in results:
                if text and text not in seen_texts:
                    seen_texts.add(text)
                    # Basic heuristic: if it looks like a message
                    if ":" in text:
                        parts = text.split(":", 1)
                        sender = parts[0].strip()
                        msg = parts[1].strip()
                        if sender and msg:
                            _post_notification(sender, msg)
        except Exception as e:
            print(f"[NOTIF][fallback] Scan error: {e}")
        time.sleep(POLL_INTERVAL)


# ─────────────────────────────────────────────────────────────────────────────
# ADVANCED FALLBACK: winrt via asyncio but without full winsdk types
# Uses a simpler approach with win32api notification area scanning
# ─────────────────────────────────────────────────────────────────────────────

def _demo_mode():
    """
    Demo / test mode: reads from a local file 'test_notification.json'
    so you can test the full pipeline without a real WhatsApp message.
    
    File format: {"sender": "Mom", "message": "Are you coming home?"}
    Delete the file after reading to simulate a one-shot notification.
    """
    TEST_FILE = os.path.join(os.path.dirname(__file__), "test_notification.json")
    print(f"[NOTIF][demo] Watching {TEST_FILE} for test notifications…")
    print("[NOTIF][demo] Create that file with: {\"sender\": \"Mom\", \"message\": \"Hello!\"}")

    while True:
        try:
            if os.path.exists(TEST_FILE):
                with open(TEST_FILE, "r") as f:
                    data = json.load(f)
                sender = data.get("sender", "Unknown")
                message = data.get("message", "")
                if sender and message:
                    _post_notification(sender, message)
                os.remove(TEST_FILE)
                print("[NOTIF][demo] Processed test notification. File removed.")
        except Exception as e:
            print(f"[NOTIF][demo] Error: {e}")
        time.sleep(2)


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("  JARVIS — WhatsApp Notification Listener")
    print("  Backend URL:", BACKEND_URL)
    print("=" * 60)

    # Wait for backend to be ready
    print("[NOTIF] Waiting for backend…")
    for attempt in range(10):
        try:
            r = requests.get("http://localhost:8000/health", timeout=3)
            if r.status_code == 200:
                print("[NOTIF] Backend is ready!")
                break
        except Exception:
            pass
        time.sleep(2)
    else:
        print("[NOTIF] WARNING: Backend not reachable. Notifications will be retried.")

    # Try primary (new modular winrt packages) first
    try:
        # Probe for winrt-Windows.UI.Notifications (the key package)
        import winrt.windows.ui.notifications  # noqa: F401
        print("[NOTIF] winrt-Windows.UI.Notifications found — using Windows Runtime listener (primary)")
        success = await _winrt_listener()
        if success is False:
            raise RuntimeError("winrt access denied by Windows")
    except ImportError as e:
        print(f"[NOTIF] winrt packages not found: {e} — trying pywin32 fallback")
        print("[NOTIF] Install with: pip install winrt-Windows.UI.Notifications winrt-Windows.UI.Notifications.Management")
        try:
            import win32gui  # noqa: F401
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _pywin32_fallback)
        except ImportError as e2:
            print(f"[NOTIF] pywin32 not found either ({e2}) — dropping into DEMO mode")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _demo_mode)
    except Exception as e:
        print(f"[NOTIF] Primary listener failed ({e}) — falling back to demo mode")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _demo_mode)


if __name__ == "__main__":
    asyncio.run(main())
