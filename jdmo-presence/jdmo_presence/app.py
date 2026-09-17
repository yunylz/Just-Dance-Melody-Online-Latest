"""JDMO Presence - Main application."""

import logging
import threading
import time
from pathlib import Path
from tkinter import messagebox

import pystray
from PIL import Image, ImageDraw

from . import config
from .api import (
    APIClient,
    AuthError,
    EmailNotVerifiedError,
    AccountStatusError,
    TwoFactorRequiredError,
    RateLimitedError,
)
from .discord_handler import DiscordHandler
from .login_dialog import prompt_login, prompt_2fa_code
from .updater import Updater

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


class JDMOPresence:
    def __init__(self):
        self._api = APIClient()
        self._discord = DiscordHandler()
        self._updater = Updater(on_update_available=self._on_update_available)

        self._tray: pystray.Icon | None = None
        self._stop_event = threading.Event()
        self._restart_for_login = False

        self._status_text = "Not connected"
        self._update_available: str | None = None   # version string if update found
        self._update_url: str | None = None

    # ------------------------------------------------------------------
    # Run
    # ------------------------------------------------------------------

    def run(self):
        while True:
            # If not logged in, show login dialog (on main thread)
            if not self._api.is_logged_in:
                if not self._do_login():
                    return  # user cancelled

            self._restart_for_login = False
            self._stop_event = threading.Event()

            # Start background worker
            worker = threading.Thread(target=self._background_loop, daemon=True)
            worker.start()

            # Build and run tray icon (blocks until quit or re-login requested)
            icon = self._build_tray_icon()
            self._tray = icon
            icon.run()

            # When we get here, icon.stop() was called — clean up
            self._stop_event.set()
            worker.join(timeout=2)
            self._discord.clear()
            self._status_text = "Not connected"

            if not self._restart_for_login:
                break

    # ------------------------------------------------------------------
    # Login flow
    # ------------------------------------------------------------------

    def _do_login(self) -> bool:
        """Show login dialog, attempt auth. Returns True on success."""
        while True:
            creds = prompt_login()
            if creds is None:
                return False  # user cancelled

            email, password = creds
            try:
                self._api.login(email, password)
                logger.info(f"Logged in as {email}")
                return True
            except EmailNotVerifiedError as e:
                messagebox.showinfo(
                    "Email Not Verified",
                    f"{e}\n\nPlease check your inbox (and spam folder) "
                    "for a verification link, then try again.",
                )
            except TwoFactorRequiredError as e:
                if e.setup_required:
                    messagebox.showinfo(
                        "2FA Setup Required",
                        "Your account requires two-factor authentication, but it hasn't been set up yet.\n\n"
                        "Please enable 2FA via the Hub website, then try again.",
                    )
                    continue

                # Prompt for the 2FA code
                code = prompt_2fa_code()
                if code is None:
                    return False  # user cancelled

                try:
                    self._api.verify_2fa(code, e.two_factor_token)
                    logger.info(f"2FA verified — logged in as {email}")
                    return True
                except AuthError as e2:
                    messagebox.showerror("2FA Failed", str(e2))
                    continue  # let them try again
            except AccountStatusError as e:
                messagebox.showerror("Account Issue", str(e))
            except RateLimitedError as e:
                messagebox.showerror("Rate Limited", str(e))
            except AuthError as e:
                messagebox.showerror("Login failed", str(e))
            except Exception as e:
                messagebox.showerror("Error", f"Could not connect to server:\n{e}")

    # ------------------------------------------------------------------
    # Background polling loop
    # ------------------------------------------------------------------

    def _background_loop(self):
        # Small delay so tray icon is ready first
        time.sleep(2)

        # Version check on startup
        self._updater.check(self._api)

        while not self._stop_event.is_set():
            try:
                status = self._api.get_status()

                if status is None:
                    self._status_text = "No data"
                    self._discord.clear()
                else:
                    state_line = status.get("state", "") or "Idle"
                    self._status_text = state_line
                    self._discord.update(status)

            except AuthError:
                self._status_text = "Session expired"
                self._discord.clear()
                self._api.logout()
                # Prompt re-login from main thread via tray menu
                self._schedule_relogin()
            except Exception as e:
                logger.warning(f"Poll error: {e}")
                self._status_text = "Error"

            self._refresh_tray_menu()
            self._stop_event.wait(config.POLL_INTERVAL_SECONDS)

    def _schedule_relogin(self):
        """Ask the user to log in again (called from background thread)."""
        if self._tray:
            self._tray.notify(
                "JDMO Presence",
                "Your session expired. Click the tray icon to log in again.",
            )

    # ------------------------------------------------------------------
    # Update callback
    # ------------------------------------------------------------------

    def _on_update_available(self, version: str, url: str):
        self._update_available = version
        self._update_url = url
        self._refresh_tray_menu()
        if self._tray:
            self._tray.notify(
                "JDMO Presence",
                f"Update {version} is available. Check the tray menu.",
            )

    # ------------------------------------------------------------------
    # Tray icon
    # ------------------------------------------------------------------

    def _build_tray_icon(self) -> pystray.Icon:
        image = self._make_icon_image()
        icon = pystray.Icon(
            config.APP_NAME,
            image,
            config.APP_NAME,
            menu=self._build_menu(),
        )
        return icon

    def _build_menu(self) -> pystray.Menu:
        items = []

        # Status line (greyed out, not clickable)
        items.append(
            pystray.MenuItem(
                lambda _: f"Status: {self._status_text}",
                None,
                enabled=False,
            )
        )

        # Account line
        if self._api.is_logged_in:
            display_name = self._api.username or self._api.email or "—"
            items.append(
                pystray.MenuItem(
                    lambda _: f"Account: {display_name}",
                    None,
                    enabled=False,
                )
            )

        items.append(pystray.Menu.SEPARATOR)

        # Update item (only shown when available)
        if self._update_available:
            items.append(
                pystray.MenuItem(
                    f"⬆ Update to {self._update_available}",
                    self._on_apply_update,
                )
            )
            items.append(pystray.Menu.SEPARATOR)

        # Auth actions
        if self._api.is_logged_in:
            items.append(pystray.MenuItem("Logout", self._on_logout))
        else:
            items.append(pystray.MenuItem("Login", self._on_login))

        items.append(pystray.MenuItem("Quit", self._on_quit))

        return pystray.Menu(*items)

    def _refresh_tray_menu(self):
        """Rebuild the menu so dynamic labels update."""
        if self._tray:
            self._tray.menu = self._build_menu()
            self._tray.update_menu()

    def _make_icon_image(self) -> Image.Image:
        """Load the tray icon from the project's icon.png."""
        icon_path = Path(__file__).parent.parent / "icon.png"
        fallback_path = Path(__file__).parent.parent / "assets" / "icon.png"

        for path in (icon_path, fallback_path):
            if path.exists():
                try:
                    img = Image.open(path).convert("RGBA")
                    # pystray on macOS works best with 64x64 or smaller
                    if max(img.size) > 64:
                        img = img.resize((64, 64), Image.LANCZOS)
                    return img
                except Exception:
                    pass

        # Fallback: simple placeholder
        size = 64
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse((4, 4, size - 4, size - 4), fill=(88, 101, 242))
        draw.text((18, 18), "J", fill="white")
        return img

    # ------------------------------------------------------------------
    # Menu callbacks
    # ------------------------------------------------------------------

    def _on_login(self, icon, item):
        self._restart_for_login = True
        icon.stop()

    def _on_logout(self, icon, item):
        self._restart_for_login = True
        self._api.logout()
        self._discord.clear()
        self._status_text = "Not connected"
        self._refresh_tray_menu()
        # Don't stop icon here — user can click Login to re-authenticate

    def _on_quit(self, icon, item):
        self._restart_for_login = False
        icon.stop()

    def _on_apply_update(self, icon, item):
        self._updater._update_url = self._update_url
        threading.Thread(target=self._updater.apply_update, daemon=True).start()
