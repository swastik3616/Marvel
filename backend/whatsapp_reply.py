"""
whatsapp_reply.py — JARVIS WhatsApp Reply Automator
====================================================
Uses pyautogui + pywin32 to focus WhatsApp Desktop and send a reply.
Called by the FastAPI /reply endpoint.
"""

import time
import pyautogui
import pyperclip

try:
    import win32gui
    import win32con
    import win32process
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False


pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.15


# ─────────────────────────────────────────────────────────────────────────────
# Window helpers
# ─────────────────────────────────────────────────────────────────────────────

def _find_whatsapp_hwnd() -> int | None:
    """Return the HWND of the WhatsApp Desktop main window, or None."""
    if not WIN32_AVAILABLE:
        return None

    candidates = []

    def _cb(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd).lower()
            cls   = win32gui.GetClassName(hwnd).lower()
            if "whatsapp" in title or "whatsapp" in cls:
                candidates.append(hwnd)
        return True

    win32gui.EnumWindows(_cb, None)
    return candidates[0] if candidates else None


def _get_foreground_hwnd() -> int | None:
    if not WIN32_AVAILABLE:
        return None
    return win32gui.GetForegroundWindow()


def _bring_to_front(hwnd: int):
    """Force a window to the foreground (works around Windows focus restrictions)."""
    if not WIN32_AVAILABLE:
        return
    try:
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.SetForegroundWindow(hwnd)
        time.sleep(0.4)
    except Exception as e:
        print(f"[REPLY] SetForegroundWindow failed: {e}")
        # Fallback: use pyautogui to click on taskbar icon
        pyautogui.hotkey("alt", "tab")
        time.sleep(0.5)


def _restore_window(hwnd: int | None):
    if hwnd and WIN32_AVAILABLE:
        try:
            win32gui.SetForegroundWindow(hwnd)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Main reply function
# ─────────────────────────────────────────────────────────────────────────────

def send_whatsapp_reply(text: str) -> dict:
    """
    Send a reply message via WhatsApp Desktop automation.

    Returns:
        {"success": True}  or  {"success": False, "error": "..."}
    """
    if not text or not text.strip():
        return {"success": False, "error": "Empty message text"}

    text = text.strip()
    print(f"[REPLY] Sending: {text!r}")

    # 1. Save current foreground window to restore later
    prev_hwnd = _get_foreground_hwnd()

    # 2. Find WhatsApp window
    wa_hwnd = _find_whatsapp_hwnd()

    if wa_hwnd:
        # 3a. Bring WhatsApp to foreground
        _bring_to_front(wa_hwnd)
        print("[REPLY] WhatsApp found and focused via win32gui")
    else:
        # 3b. Try clicking taskbar / using Alt+Tab as fallback
        print("[REPLY] WhatsApp window not found — trying Alt+Tab fallback")
        pyautogui.hotkey("ctrl", "alt", "w")          # WhatsApp global hotkey (sometimes registered)
        time.sleep(0.8)
        wa_hwnd = _find_whatsapp_hwnd()
        if not wa_hwnd:
            return {
                "success": False,
                "error": "WhatsApp Desktop window not found. Please open it first."
            }
        _bring_to_front(wa_hwnd)

    # 4. Click on the message input box (bottom center of window)
    #    We use a relative position so it works across window sizes
    try:
        rect = win32gui.GetWindowRect(wa_hwnd) if WIN32_AVAILABLE else None
    except Exception:
        rect = None

    if rect:
        left, top, right, bottom = rect
        w = right - left
        h = bottom - top
        # Input box is roughly at 50% horizontally, 95% vertically
        click_x = left + int(w * 0.5)
        click_y = top  + int(h * 0.95)
        pyautogui.click(click_x, click_y)
    else:
        # Fallback: click center of screen bottom area
        sw, sh = pyautogui.size()
        pyautogui.click(sw // 2, int(sh * 0.93))

    time.sleep(0.3)

    # 5. Paste text using clipboard (safer than typewrite for Unicode)
    pyperclip.copy(text)
    pyautogui.hotkey("ctrl", "v")
    time.sleep(0.3)

    # 6. Send with Enter
    pyautogui.press("enter")
    time.sleep(0.3)

    print(f"[REPLY] Message sent!")

    # 7. Restore previous window
    _restore_window(prev_hwnd)

    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# CLI test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    msg = " ".join(sys.argv[1:]) or "Test reply from JARVIS"
    result = send_whatsapp_reply(msg)
    print("Result:", result)
