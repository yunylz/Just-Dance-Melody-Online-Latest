"""JDMO Presence - Auto-updater."""

import os
import sys
import time
import platform
import tempfile
import threading
import subprocess
import logging
import httpx
from pathlib import Path
from packaging.version import Version

from . import config

logger = logging.getLogger(__name__)


class Updater:
    def __init__(self, on_update_available=None):
        """
        on_update_available: optional callback(version: str, url: str)
        called on the background thread when a newer version is found.
        """
        self._on_update_available = on_update_available
        self._update_url: str | None = None
        self._update_version: str | None = None

    # ------------------------------------------------------------------
    # Version check
    # ------------------------------------------------------------------

    def check(self, api_client) -> bool:
        """
        Compare running version to API latest.
        Returns True if an update is available.
        """
        data = api_client.get_latest_version()
        if not data:
            return False

        latest = data.get("version")
        url = data.get("download_url")

        if not latest or not url:
            return False

        try:
            if Version(latest) > Version(config.APP_VERSION):
                self._update_version = latest
                self._update_url = url
                logger.info(f"Update available: {latest}")
                if self._on_update_available:
                    self._on_update_available(latest, url)
                return True
        except Exception as e:
            logger.warning(f"Version parse error: {e}")

        return False

    # ------------------------------------------------------------------
    # Download + replace
    # ------------------------------------------------------------------

    def apply_update(self) -> None:
        """
        Download the new binary and launch an updater helper script that:
        1. Waits for this process to exit
        2. Replaces the binary
        3. Relaunches the app
        """
        if not self._update_url:
            return

        logger.info(f"Downloading update from {self._update_url}")

        try:
            resp = httpx.get(self._update_url, follow_redirects=True, timeout=60)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return

        # Write new binary to temp file
        suffix = ".exe" if platform.system() == "Windows" else ""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(resp.content)
        tmp.close()

        current_exe = Path(sys.executable if getattr(sys, "frozen", False) else sys.argv[0])
        helper = _write_helper_script(
            pid=os.getpid(),
            old_path=str(current_exe),
            new_path=tmp.name,
        )

        logger.info("Launching updater helper and exiting…")
        if platform.system() == "Windows":
            subprocess.Popen(["cmd", "/c", helper], creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            subprocess.Popen(["bash", helper])

        # The helper will relaunch us; exit now.
        os.kill(os.getpid(), 9)


# ------------------------------------------------------------------
# Helper script writer
# ------------------------------------------------------------------

def _write_helper_script(pid: int, old_path: str, new_path: str) -> str:
    """Write a tiny shell/batch script that swaps the binary after we exit."""
    system = platform.system()

    if system == "Windows":
        script = tempfile.NamedTemporaryFile(
            delete=False, suffix=".bat", mode="w"
        )
        script.write(f"""@echo off
:wait
tasklist /FI "PID eq {pid}" 2>NUL | find /I "{pid}" >NUL
if not errorlevel 1 (
    timeout /t 1 /nobreak >NUL
    goto wait
)
move /Y "{new_path}" "{old_path}"
start "" "{old_path}"
del "%~f0"
""")
    else:
        script = tempfile.NamedTemporaryFile(
            delete=False, suffix=".sh", mode="w"
        )
        script.write(f"""#!/bin/bash
while kill -0 {pid} 2>/dev/null; do
    sleep 1
done
chmod +x "{new_path}"
mv -f "{new_path}" "{old_path}"
"{old_path}" &
rm -- "$0"
""")
        os.chmod(script.name, 0o755)

    script.close()
    return script.name
