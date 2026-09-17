"""Central configuration for the JDMO Launcher."""

import os
import sys
import json
import webbrowser
from pathlib import Path


# Directories
APP_DIR = Path.home() / ".jdmo-launcher"
GAMES_DIR = APP_DIR / "games"
CACHE_DIR = APP_DIR / "cache"
CONFIG_FILE = APP_DIR / "config.json"

# Ensure directories exist
APP_DIR.mkdir(parents=True, exist_ok=True)
GAMES_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# API URLs
API_URLS = {
    "PROD": "https://hub-api.c0llydoll.dev",
    "LOCAL": "http://127.0.0.1:8455",
}
HUB_URLS = {
    "PROD": "https://hub.c0llydoll.dev",
    "LOCAL": "http://127.0.0.1:5173"
}

# Auto-detect: built app (PyInstaller) → PROD, source/CLI → LOCAL
_is_built = getattr(sys, "frozen", False)
DEFAULT_API_BASE_URL = API_URLS["PROD"] if _is_built else API_URLS["LOCAL"]
DEFAULT_HUB_URL = HUB_URLS["PROD"] if _is_built else HUB_URLS["LOCAL"]

# Available games
AVAILABLE_GAMES = {
    "jd2017": {
        "name": "Just Dance Melody Online",
        "version": 2017,
        "platforms": ["pc"],
        "description": "Experience the JDMO experience right on your PC!",
        "size_mb": 2048,
        "executable": "JD2017.exe"
    }
}


class Config:
    """Manages persistent launcher configuration."""

    def __init__(self):
        self._data = self._load()
        self._ensure_games_dir()

    def _ensure_games_dir(self):
        self.games_path.mkdir(parents=True, exist_ok=True)

    @property
    def games_path(self) -> Path:
        return Path(self._data.get("download_path", str(GAMES_DIR)))

    def _load(self) -> dict:
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        return {
            "api_base_url": DEFAULT_API_BASE_URL,
            "remember_me": False,
            "last_email": "",
            "games_installed": {},
            "game_platform": "ps4",
        }

    def _save(self):
        with open(CONFIG_FILE, "w") as f:
            json.dump(self._data, f, indent=2)

    @property
    def api_base_url(self) -> str:
        # Built releases always use PROD — ignore any saved dev config
        if _is_built:
            return API_URLS["PROD"]
        return self._data.get("api_base_url", DEFAULT_API_BASE_URL)

    @property
    def hub_url(self) -> str:
        if _is_built:
            return HUB_URLS["PROD"]
        return self._data.get("hub_url", DEFAULT_HUB_URL)

    @hub_url.setter
    def hub_url(self, value: str):
        self._data["hub_url"] = value.rstrip("/")
        self._save()

    def open_hub_login(self):
        """Open the Hub login/register page in the default browser."""
        webbrowser.open(f"{self.hub_url}/login?r=true")

    @api_base_url.setter
    def api_base_url(self, value: str):
        self._data["api_base_url"] = value.rstrip("/")
        self._save()

    @property
    def remember_me(self) -> bool:
        return self._data.get("remember_me", False)

    @remember_me.setter
    def remember_me(self, value: bool):
        self._data["remember_me"] = value
        self._save()

    @property
    def last_email(self) -> str:
        return self._data.get("last_email", "")

    @last_email.setter
    def last_email(self, value: str):
        self._data["last_email"] = value
        self._save()

    @property
    def game_platform(self) -> str:
        return self._data.get("game_platform", "pc")

    @game_platform.setter
    def game_platform(self, value: str):
        self._data["game_platform"] = value
        self._save()

    @property
    def download_path(self) -> str:
        return str(self.games_path)

    @download_path.setter
    def download_path(self, value: str):
        self._data["download_path"] = value
        self._save()
        self._ensure_games_dir()

    # ── Game install tracking ─────────────────────────────────────────
    def is_game_installed(self, game_id: str) -> bool:
        val = self._data.get("games_installed", {}).get(game_id)
        if isinstance(val, bool):
            return val
        if isinstance(val, dict):
            return True
        return False

    def get_game_meta(self, game_id: str) -> dict:
        """Return {version, last_played} for an installed game."""
        val = self._data.get("games_installed", {}).get(game_id)
        if isinstance(val, dict):
            return val
        return {"version": "", "last_played": ""}

    def set_game_installed(self, game_id: str, installed: bool = True):
        if "games_installed" not in self._data:
            self._data["games_installed"] = {}
        if installed:
            meta = self.get_game_meta(game_id)
            meta["version"] = meta.get("version") or ""
            self._data["games_installed"][game_id] = meta
        else:
            self._data["games_installed"][game_id] = False
        self._save()

    def set_game_version(self, game_id: str, version: str):
        if "games_installed" not in self._data:
            self._data["games_installed"] = {}
        meta = self.get_game_meta(game_id)
        meta["version"] = version
        self._data["games_installed"][game_id] = meta
        self._save()

    def set_game_last_played(self, game_id: str):
        from datetime import datetime, timezone
        if "games_installed" not in self._data:
            self._data["games_installed"] = {}
        meta = self.get_game_meta(game_id)
        meta["last_played"] = datetime.now(timezone.utc).isoformat()
        self._data["games_installed"][game_id] = meta
        self._save()

    def get_installed_version(self, game_id: str) -> str | None:
        meta = self.get_game_meta(game_id)
        return meta.get("version") or None


config = Config()
