"""JDMO Presence - Discord Rich Presence handler."""

import time
import logging
from pypresence import Presence, InvalidPipe, DiscordNotFound

from . import config

logger = logging.getLogger(__name__)


class DiscordHandler:
    def __init__(self):
        self._rpc: Presence | None = None
        self._connected = False
        self._last_state: dict | None = None

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    def connect(self) -> bool:
        """Try to connect to Discord. Returns True on success."""
        if self._connected:
            return True
        try:
            self._rpc = Presence(config.DISCORD_CLIENT_ID)
            self._rpc.connect()
            self._connected = True
            logger.info("Connected to Discord RPC.")
            return True
        except (InvalidPipe, DiscordNotFound):
            self._rpc = None
            self._connected = False
            logger.info("Discord not detected — Rich Presence will update once Discord is running.")
            return False
        except Exception as e:
            logger.warning(f"Discord connect error: {e}")
            self._rpc = None
            self._connected = False
            return False

    def disconnect(self) -> None:
        if self._rpc and self._connected:
            try:
                self._rpc.close()
            except Exception:
                pass
        self._rpc = None
        self._connected = False
        self._last_state = None
        logger.info("Disconnected from Discord RPC.")

    @property
    def is_connected(self) -> bool:
        return self._connected

    # ------------------------------------------------------------------
    # Presence update
    # ------------------------------------------------------------------

    def update(self, status: dict) -> bool:
        """
        Update Discord Rich Presence from Hub API status response.

        Expected status keys (Hub API format):
            playing     (bool)   — is the user in-game?
            state       (str)    — main presence line (e.g. "Dancing to 'Sokusu'")
            details     (str)    — secondary line (e.g. "Playing with 2 players")
            large_image (str)    — Discord asset key for the large image
            large_text  (str)    — hover text for the large image
            small_image (str)    — Discord asset key for the small image (optional)
            small_text  (str)    — hover text for the small image (optional)
            end         (int)    — Unix timestamp for song end time (optional, shows countdown)
            buttons     (list)   — button objects with label + url (max 2)

        Returns True if Discord was updated, False otherwise.
        """
        state_line = status.get("state", "")
        detail_line = status.get("details", "")

        # If there's nothing meaningful to show, clear presence
        if not state_line and not detail_line:
            self.clear()
            return False

        if not self._connected:
            if not self.connect():
                logger.warning("Discord not available — skipping presence update.")
                return False

        new_state = {"state": state_line, "details": detail_line}
        if new_state == self._last_state:
            return False  # nothing changed, no need to call Discord

        # Assemble optional fields — only include what the API provides
        payload = {
            "state": state_line,
            "details": detail_line or None,
            "large_image": status.get("large_image", "jdmo_logo"),
            "large_text": status.get("large_text", "JDMO"),
        }
        
        logger.info(f"large_image received: {status.get('large_image')}")

        # Add timestamps — start when actively playing, end for countdown
        if status.get("playing"):
            payload["start"] = int(time.time())
        end = status.get("end")
        if end:
            payload["end"] = int(end)

        small_image = status.get("small_image")
        small_text = status.get("small_text")
        if small_image:
            payload["small_image"] = small_image
        if small_text:
            payload["small_text"] = small_text

        buttons = status.get("buttons")
        if buttons and isinstance(buttons, list):
            payload["buttons"] = buttons[:2]  # Discord allows max 2 buttons

        try:
            self._rpc.update(**payload)
            self._last_state = new_state
            logger.info(f"Discord presence updated: {detail_line} / {state_line}")
            return True
        except Exception as e:
            logger.warning(f"Discord update failed: {e}")
            self._connected = False  # will reconnect on next poll
            return False

    def clear(self) -> None:
        """Clear the Discord presence (user stopped playing)."""
        if self._connected and self._rpc:
            try:
                self._rpc.clear()
                self._last_state = None
            except Exception:
                pass
