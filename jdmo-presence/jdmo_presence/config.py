"""JDMO Presence - Configuration."""

import os
import json
import platform
from pathlib import Path

APP_NAME = "JDMO Presence"
APP_VERSION = "1.0.0"

# --- Load .env file (optional) ---
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --- API ---
API_BASE_URL = os.getenv("API_BASE_URL", "https://hub-api.c0llydoll.dev")
API_STATUS_ENDPOINT = "/presence/v1/status"
API_VERSION_ENDPOINT = "/presence/v1/version"
POLL_INTERVAL_SECONDS = 5                    # how often to check player status

# --- Discord ---
# Your Discord application client ID from https://discord.com/developers/applications
DISCORD_CLIENT_ID = "1518437010443079830"

# --- Auth token storage ---
def _config_dir() -> Path:
    system = platform.system()
    if system == "Windows":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif system == "Darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    path = base / "JDMO"
    path.mkdir(parents=True, exist_ok=True)
    return path

CONFIG_DIR = _config_dir()
TOKEN_FILE = CONFIG_DIR / "presence-auth.json"


def load_token() -> dict | None:
    """Return stored auth data or None."""
    if TOKEN_FILE.exists():
        try:
            return json.loads(TOKEN_FILE.read_text())
        except Exception:
            return None
    return None


def save_token(data: dict) -> None:
    TOKEN_FILE.write_text(json.dumps(data))


def clear_token() -> None:
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()
