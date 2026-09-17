"""Secure local storage for session tokens and credentials."""

import json
import os
from pathlib import Path

from src.utils.config import APP_DIR

SESSION_FILE = APP_DIR / "session.json"


class SessionStore:
    """Stores and retrieves the current session token and user info."""

    def __init__(self):
        self._data = self._load()

    def _load(self) -> dict:
        if SESSION_FILE.exists():
            try:
                with open(SESSION_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        return {}

    def _save(self):
        with open(SESSION_FILE, "w") as f:
            json.dump(self._data, f, indent=2)
        # Restrict permissions on Unix-like systems
        try:
            os.chmod(SESSION_FILE, 0o600)
        except OSError:
            pass

    def save_session(
        self,
        token: str,
        username: str,
        user_id: str,
        expires_at: int,
        is_admin: bool = False,
    ):
        self._data["token"] = token
        self._data["username"] = username
        self._data["user_id"] = user_id
        self._data["expires_at"] = expires_at
        self._data["is_admin"] = is_admin
        self._save()

    @property
    def token(self) -> str | None:
        return self._data.get("token")

    @property
    def username(self) -> str | None:
        return self._data.get("username")

    @property
    def user_id(self) -> str | None:
        return self._data.get("user_id")

    @property
    def is_admin(self) -> bool:
        return self._data.get("is_admin", False)

    @is_admin.setter
    def is_admin(self, value: bool):
        self._data["is_admin"] = value
        self._save()

    @property
    def expires_at(self) -> int | None:
        return self._data.get("expires_at")

    @property
    def is_expired(self) -> bool:
        import time
        exp = self.expires_at
        if exp is None:
            return True
        return time.time() * 1000 > exp

    @property
    def is_logged_in(self) -> bool:
        return bool(self.token) and not self.is_expired

    def clear(self):
        self._data = {}
        self._save()
        if SESSION_FILE.exists():
            os.remove(SESSION_FILE)

    def __bool__(self):
        return self.is_logged_in


session_store = SessionStore()
