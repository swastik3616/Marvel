"""
gmail_listener.py — JARVIS Gmail Notification Listener
=======================================================
Run this in a SEPARATE terminal:  python gmail_listener.py

Polls Gmail INBOX via IMAP SSL every 30 seconds for UNSEEN emails.
On each new email:
  1. Extracts sender name, sender address, subject, and a short body snippet
  2. Deduplicates via SHA-256 of (sender + subject + snippet)
  3. POSTs to http://localhost:8000/gmail-notification

Requirements (all stdlib — NO pip install needed):
  imaplib, email, hashlib, time, os, requests (already in requirements.txt)

Setup:
  Add to backend/.env:
    GMAIL_ADDRESS=your.email@gmail.com
    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (Google App Password, NOT your login password)

  Get an App Password: myaccount.google.com → Security → App Passwords
"""

import imaplib
import email
import email.header
import hashlib
import time
import os
import sys
import requests
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

GMAIL_ADDRESS    = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
BACKEND_URL      = "http://localhost:8000/gmail-notification"
IMAP_HOST        = "imap.gmail.com"
IMAP_PORT        = 993
POLL_INTERVAL    = 30  # seconds between inbox checks

_seen_hashes: set = set()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_hash(sender: str, subject: str, snippet: str) -> str:
    raw = f"{sender.strip().lower()}|{subject.strip().lower()}|{snippet.strip().lower()[:80]}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _decode_header_value(value: str) -> str:
    """Decode RFC 2047 encoded header (e.g. =?UTF-8?B?...?=)."""
    parts = email.header.decode_header(value)
    decoded = []
    for chunk, charset in parts:
        if isinstance(chunk, bytes):
            try:
                decoded.append(chunk.decode(charset or "utf-8", errors="replace"))
            except Exception:
                decoded.append(chunk.decode("utf-8", errors="replace"))
        else:
            decoded.append(chunk)
    return "".join(decoded).strip()


def _extract_sender_name(from_header: str) -> tuple[str, str]:
    """
    Parse 'From' header like:
      "John Doe <john@example.com>"  → ("John Doe", "john@example.com")
      "john@example.com"             → ("john@example.com", "john@example.com")
    """
    decoded = _decode_header_value(from_header)
    if "<" in decoded and ">" in decoded:
        name_part = decoded[:decoded.index("<")].strip().strip('"')
        addr_part = decoded[decoded.index("<") + 1:decoded.index(">")].strip()
        name = name_part if name_part else addr_part
    else:
        name = decoded.strip()
        addr_part = decoded.strip()
    return name, addr_part


def _get_body_snippet(msg: email.message.Message, max_chars: int = 200) -> str:
    """Extract a short plain-text snippet from the email body."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp  = str(part.get("Content-Disposition", ""))
            if ctype == "text/plain" and "attachment" not in disp:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    body = part.get_payload(decode=True).decode(charset, errors="replace")
                    break
                except Exception:
                    pass
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            body = msg.get_payload(decode=True).decode(charset, errors="replace")
        except Exception:
            body = ""

    # Collapse whitespace and trim
    snippet = " ".join(body.split())
    return snippet[:max_chars]


def _post_notification(sender_name: str, sender_email: str, subject: str, snippet: str) -> None:
    """Send parsed email info to the FastAPI backend."""
    h = _make_hash(sender_email, subject, snippet)
    if h in _seen_hashes:
        return  # duplicate — skip
    _seen_hashes.add(h)

    payload = {
        "sender":  sender_name,
        "email":   sender_email,
        "subject": subject,
        "snippet": snippet,
    }
    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=5)
        if r.status_code == 200:
            print(f"[GMAIL] Sent → {sender_name} <{sender_email}>: {subject}")
        else:
            print(f"[GMAIL] Backend rejected: {r.status_code} — {r.text}")
    except requests.exceptions.ConnectionError:
        print("[GMAIL] Backend not reachable — is uvicorn running?")
    except Exception as e:
        print(f"[GMAIL] Error posting: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Core polling loop
# ─────────────────────────────────────────────────────────────────────────────

def _connect_imap() -> imaplib.IMAP4_SSL:
    """Create a fresh authenticated IMAP connection."""
    mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    mail.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
    return mail


def poll_inbox(mail: imaplib.IMAP4_SSL) -> None:
    """Check INBOX for UNSEEN emails and forward new ones to backend."""
    mail.select("INBOX")
    status, data = mail.search(None, "UNSEEN")
    if status != "OK":
        return

    email_ids = data[0].split()
    if not email_ids:
        return

    # Process only the most recent 5 unseen emails to avoid spam bursts
    for eid in email_ids[-5:]:
        try:
            status, msg_data = mail.fetch(eid, "(RFC822)")
            if status != "OK":
                continue

            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)

            from_header = msg.get("From", "Unknown Sender")
            subject_header = msg.get("Subject", "(No Subject)")
            subject = _decode_header_value(subject_header)

            sender_name, sender_email = _extract_sender_name(from_header)
            snippet = _get_body_snippet(msg, max_chars=200)

            _post_notification(sender_name, sender_email, subject, snippet)

        except Exception as e:
            print(f"[GMAIL] Error processing email id {eid}: {e}")


def run_listener() -> None:
    """Main polling loop — reconnects on IMAP errors."""
    mail = None
    while True:
        try:
            if mail is None:
                print("[GMAIL] Connecting to Gmail IMAP…")
                mail = _connect_imap()
                print(f"[GMAIL] Connected as {GMAIL_ADDRESS}")

            poll_inbox(mail)

        except imaplib.IMAP4.error as e:
            print(f"[GMAIL] IMAP auth/protocol error: {e}")
            mail = None
            time.sleep(15)
        except OSError as e:
            print(f"[GMAIL] Network error: {e} — retrying in 15 s")
            mail = None
            time.sleep(15)
        except Exception as e:
            print(f"[GMAIL] Unexpected error: {e} — retrying in 15 s")
            mail = None
            time.sleep(15)

        time.sleep(POLL_INTERVAL)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("  JARVIS — Gmail Notification Listener")
    print(f"  Account : {GMAIL_ADDRESS or '(not set)'}")
    print(f"  Backend : {BACKEND_URL}")
    print(f"  Interval: {POLL_INTERVAL} s")
    print("=" * 60)

    # Validate config
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        print("\n[GMAIL] ⚠ ERROR: GMAIL_ADDRESS or GMAIL_APP_PASSWORD not set in .env")
        print("[GMAIL]   1. Go to myaccount.google.com → Security → App Passwords")
        print("[GMAIL]   2. Create an App Password named 'JARVIS'")
        print("[GMAIL]   3. Add to backend/.env:")
        print("[GMAIL]        GMAIL_ADDRESS=your@gmail.com")
        print("[GMAIL]        GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx")
        sys.exit(1)

    # Wait for backend to be ready
    print("\n[GMAIL] Waiting for backend to start…")
    for attempt in range(15):
        try:
            r = requests.get("http://localhost:8000/health", timeout=3)
            if r.status_code == 200:
                print("[GMAIL] Backend is ready!")
                break
        except Exception:
            pass
        print(f"[GMAIL] Backend not ready (attempt {attempt + 1}/15) — waiting 3 s…")
        time.sleep(3)
    else:
        print("[GMAIL] WARNING: Backend not reachable. Will keep retrying on each poll cycle.")

    print("\n[GMAIL] Starting polling loop…\n")
    run_listener()


if __name__ == "__main__":
    main()
