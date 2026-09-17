"""Launcher self-update checker — polls CDN latest.json."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

import requests

from src.utils.config import config


log = logging.getLogger("launcher.updater")
USER_AGENT = "UbiServices_SDK_JDMO_Launcher"
CDN_BASE = os.environ.get("JDMO_CDN_URL", "https://jdmo-s3.s3.us-east-005.backblazeb2.com")


def _update_state_file() -> Path:
    """Path to the persistent update-state file (next to the binary)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / ".update-state.json"
    return Path(__file__).resolve().parent.parent.parent / ".update-state.json"


def _load_state() -> dict:
    s = _update_state_file()
    if s.exists():
        try:
            return json.loads(s.read_text())
        except Exception:
            pass
    return {}


def _save_state(state: dict):
    _update_state_file().write_text(json.dumps(state))


def _mark_update_attempt(version: str):
    state = _load_state()
    state["last_attempt_version"] = version
    _save_state(state)


def _already_attempted(version: str) -> bool:
    state = _load_state()
    return state.get("last_attempt_version") == version


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(64 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


class UpdateInfo(NamedTuple):
    available: bool
    version: str
    changelog: str
    download_url: str
    sha256: str


def _cdn_url():
    import time
    return f"{CDN_BASE}/public/builds/jdmo-launcher/latest.json?_t={int(time.time())}"


def _current_version() -> str:
    """Return the version embedded at build time, or 'dev'."""
    if getattr(sys, "frozen", False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).resolve().parent.parent.parent  # src/../.. = project root
    version_file = base / "version.txt"
    if version_file.exists():
        return version_file.read_text().strip()
    return "dev"


def check_for_update() -> UpdateInfo:
    """Check CDN for a newer launcher version.

    Returns an UpdateInfo — if ``available`` is False there's no update.
    """
    system = platform.system().lower()
    arch = platform.machine().lower()
    platform_key = f"{system}-{arch}"

    log.info("Checking for launcher update from CDN")
    try:
        resp = requests.get(_cdn_url(), timeout=10, headers={"User-Agent": USER_AGENT})
        if resp.ok:
            data = resp.json()
            log.debug("CDN responded: version=%s", data.get("version", "?"))
        else:
            log.warning("CDN returned HTTP %d", resp.status_code)
            return UpdateInfo(False, "", "", "", "")
    except Exception as exc:
        log.warning("CDN check failed: %s", exc)
        return UpdateInfo(False, "", "", "", "")

    current = _current_version()
    latest_ver = data.get("version", "")
    log.info("Current=%s  Latest=%s", current, latest_ver)

    # dev builds always see an update available
    if current == "dev":
        platform_info = data.get("platforms", {}).get(platform_key, {})
        return UpdateInfo(
            available=True,
            version=latest_ver,
            changelog=data.get("changelog", ""),
            download_url=platform_info.get("url", data.get("downloadUrl", "")),
            sha256=platform_info.get("sha256", data.get("sha256", "")),
        )

    if latest_ver == current:
        return UpdateInfo(False, "", "", "", "")

    # Don't retry a version we already tried and failed to apply
    if _already_attempted(latest_ver):
        log.info("Skipping v%s — already attempted update", latest_ver)
        return UpdateInfo(False, "", "", "", "")

    platform_info = data.get("platforms", {}).get(platform_key, {})
    return UpdateInfo(
        available=True,
        version=latest_ver,
        changelog=data.get("changelog", ""),
        download_url=platform_info.get("url", data.get("downloadUrl", "")),
        sha256=platform_info.get("sha256", data.get("sha256", "")),
    )


def download_update(info: UpdateInfo, progress_callback=None) -> Path | None:
    """Download the update binary — saved next to the current binary."""
    if not info.available:
        return None

    if getattr(sys, "frozen", False):
        current = Path(sys.executable)
        dest = current.with_suffix(current.suffix + ".new")
    else:
        dest = Path(tempfile.mkdtemp()) / "jdmo-launcher-update"

    try:
        resp = requests.get(info.download_url, stream=True, timeout=300,
                           headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if progress_callback and total:
                    progress_callback(downloaded, total)
        # Verify SHA-256
        if info.sha256:
            actual = _file_sha256(dest)
            if actual != info.sha256:
                log.error("SHA-256 mismatch: expected %s, got %s", info.sha256[:16], actual[:16])
                dest.unlink(missing_ok=True)
                return None
        _mark_update_attempt(info.version)
        log.info("Update downloaded to %s", dest)
        return dest
    except Exception:
        if dest.exists():
            dest.unlink(missing_ok=True)
        return None


def apply_update(update_path: Path):
    """Replace the current executable via a helper script.

    Writes a shell script that:
      1. Waits for the current process to exit
      2. Replaces the old binary with the new one
      3. chmod +x and launches the new binary
      4. Deletes itself

    This avoids all issues with replacing a running executable on macOS.
    """
    if not update_path or not update_path.exists():
        return

    if getattr(sys, "frozen", False):
        current = Path(sys.executable)

        # Stage: move the downloaded file next to the current binary if needed
        new_file = current.with_suffix(current.suffix + ".new")
        if update_path != new_file:
            shutil.copy2(update_path, new_file)
            os.chmod(new_file, 0o755)
            update_path = new_file

        if sys.platform == "win32":
            # Windows: running exe is locked, so rename old → .old, new → original
            old_file = current.with_suffix(current.suffix + ".old")
            script = current.with_suffix(current.suffix + ".updater.bat")
            script.write_text(
                "@echo off\n"
                "timeout /t 2 /nobreak >nul\n"
                f"if exist \"{old_file}\" del /f \"{old_file}\"\n"
                f"move /y \"{current}\" \"{old_file}\"\n"
                f"move /y \"{new_file}\" \"{current}\"\n"
                f"start \"\" \"{current}\"\n"
                f"del /f \"{old_file}\" 2>nul\n"
                f"del \"{script}\"\n"
            )
            subprocess.Popen(
                ["cmd", "/c", str(script)],
                creationflags=0x00000008,  # DETACHED_PROCESS
            )
            sys.exit(0)
        else:
            # macOS/Linux: use a shell script
            script = current.with_suffix(current.suffix + ".updater.sh")
            script.write_text(
                "#!/bin/sh\n"
                "sleep 2\n"
                f"mv \"{new_file}\" \"{current}\"\n"
                f"chmod +x \"{current}\"\n"
                f"\"{current}\" &\n"
                f"rm \"{script}\"\n"
            )
            os.chmod(script, 0o755)
            subprocess.Popen([str(script)], start_new_session=True)
            sys.exit(0)
    else:
        log.warning("Not frozen — update downloaded to %s (replace manually)", update_path)
