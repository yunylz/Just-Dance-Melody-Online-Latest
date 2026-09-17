"""Game download and management service — fetches from CDN via latest.json manifest."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Callable

import requests

from src.utils.config import config, AVAILABLE_GAMES
from src.utils.storage import session_store


log = logging.getLogger("launcher.games")
USER_AGENT = "UbiServices_SDK_JDMO_Launcher"
CDN_BASE = "https://jdmo-s3.s3.us-east-005.backblazeb2.com"
B2_MANIFEST_BASE = CDN_BASE


class GameService:
    """Handles game listing, downloading from CDN, and launching."""

    def __init__(self):
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    # ── Info ──────────────────────────────────────────────────────────
    def get_available_games(self) -> dict:
        return dict(AVAILABLE_GAMES)

    def get_game_info(self, game_id: str) -> dict | None:
        return AVAILABLE_GAMES.get(game_id)

    def get_installed_games(self) -> list[str]:
        installed = []
        for game_id in AVAILABLE_GAMES:
            if config.is_game_installed(game_id):
                game_dir = config.games_path / game_id
                if game_dir.exists() and any(game_dir.iterdir()):
                    installed.append(game_id)
                else:
                    config.set_game_installed(game_id, False)
        return installed

    def is_installed(self, game_id: str) -> bool:
        return config.is_game_installed(game_id)

    # ── Download ──────────────────────────────────────────────────────
    def _fetch_manifest(self, game_id: str) -> dict:
        """Download latest.json from Backblaze B2 direct (no CDN cache issues)."""
        url = f"{B2_MANIFEST_BASE}/public/builds/{game_id}/latest.json"
        resp = self._session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def _verify_file(self, file_path: Path, expected_md5: str) -> bool:
        """Check if the file exists and matches the expected MD5."""
        if not file_path.exists():
            return False
        h = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(64 * 1024), b""):
                h.update(chunk)
        return h.hexdigest() == expected_md5

    def download_game(
        self,
        game_id: str,
        progress_callback: Callable[[int, int], None] | None = None,
        status_callback: Callable[[str], None] | None = None,
        byte_callback: Callable[[int, int, float], None] | None = None,
        cancel_event: threading.Event | None = None,
    ) -> Path:
        """Download a game from the CDN using its latest.json manifest.

        - Fetches the remote manifest
        - Compares with local files (skips files that match MD5)
        - Streams missing/changed files with progress reporting
        """
        game_info = self.get_game_info(game_id)
        if not game_info:
            raise ValueError(f"Unknown game: {game_id}")

        game_dir = config.games_path / game_id
        game_dir.mkdir(parents=True, exist_ok=True)

        # 1. Fetch remote manifest
        if status_callback:
            status_callback("Checking for updates…")
        log.info("Fetching CDN manifest for %s", game_id)
        manifest = self._fetch_manifest(game_id)
        files = manifest.get("files", [])
        total_files = len(files)
        version = manifest.get("version", "unknown")
        log.info("CDN manifest: %d files, version=%s", total_files, version)

        if status_callback:
            status_callback(f"Found {total_files} files (v{version})")

        # 2. Determine what needs downloading
        to_download = []
        for entry in files:
            rel = Path(entry["path"])
            local = game_dir / rel
            expected_md5 = entry.get("md5", "")

            if not self._verify_file(local, expected_md5):
                to_download.append(entry)

        skipped = total_files - len(to_download)
        log.info("Files to download: %d (skipped %d already cached)", len(to_download), skipped)

        if skipped == total_files:
            log.info("Game %s is already up to date", game_id)
            if status_callback:
                status_callback(f"{game_info['name']} is already up to date!")
            if progress_callback:
                progress_callback(total_files, total_files)
            config.set_game_installed(game_id, True)
            return game_dir

        # 3. Download files
        total_bytes_all = sum(
            e["size"] for e in to_download if "size" in e
        )
        downloaded_bytes = 0
        downloaded = 0
        start_time = time.time()

        for entry in to_download:
            # Check cancel
            if cancel_event and cancel_event.is_set():
                raise RuntimeError("Download cancelled by user")

            rel = Path(entry["path"])
            local = game_dir / rel
            local.parent.mkdir(parents=True, exist_ok=True)

            url = f"{B2_MANIFEST_BASE}/public/builds/{game_id}/{entry['path']}"
            log.debug("Downloading %s", entry['path'])

            if status_callback:
                status_callback(f'"{entry["path"]}"')

            resp = self._session.get(url, stream=True, timeout=60)
            resp.raise_for_status()
            file_size = int(resp.headers.get("content-length", 0))
            file_downloaded = 0
            file_start = time.time()

            with open(local, "wb") as f:
                for chunk in resp.iter_content(chunk_size=256 * 1024):
                    if cancel_event and cancel_event.is_set():
                        local.unlink(missing_ok=True)
                        raise RuntimeError("Download cancelled by user")
                    if chunk:
                        f.write(chunk)
                        file_downloaded += len(chunk)
                        downloaded_bytes += len(chunk)
                        elapsed = time.time() - start_time
                        speed = downloaded_bytes / elapsed / (1024 * 1024) if elapsed > 0 else 0
                        if byte_callback:
                            byte_callback(downloaded_bytes, total_bytes_all, speed)
                        if progress_callback:
                            progress_callback(downloaded, len(to_download))

            # Verify MD5 after download
            if entry.get("md5"):
                if not self._verify_file(local, entry["md5"]):
                    log.warning("MD5 mismatch for %s (downloaded again)", entry['path'])
                    # Try one more time
                    resp2 = self._session.get(url, stream=True, timeout=60)
                    resp2.raise_for_status()
                    with open(local, "wb") as f:
                        for chunk in resp2.iter_content(chunk_size=256 * 1024):
                            if cancel_event and cancel_event.is_set():
                                local.unlink(missing_ok=True)
                                raise RuntimeError("Download cancelled by user")
                            if chunk:
                                f.write(chunk)
                    if not self._verify_file(local, entry["md5"]):
                        log.error("MD5 mismatch for %s after retry", entry['path'])
                        local.unlink(missing_ok=True)
                        raise RuntimeError(f"MD5 mismatch for {entry['path']}")

            downloaded += 1
            log.info("Downloaded %d/%d: %s", downloaded, len(to_download), entry['path'])
            if progress_callback:
                progress_callback(downloaded, total_files)

        # 4. Save local manifest
        local_manifest = {
            "game_id": game_id,
            "name": game_info["name"],
            "version": version,
            "downloaded_at": __import__("datetime").datetime.now().isoformat(),
            "files": files,
        }
        with open(game_dir / "game.json", "w") as f:
            json.dump(local_manifest, f, indent=2)

        config.set_game_installed(game_id, True)
        config.set_game_version(game_id, version)

        if status_callback:
            status_callback(f"{game_info['name']} v{version} downloaded successfully!")
        if progress_callback:
            progress_callback(total_files, total_files)

        return game_dir

    # ── Delete ────────────────────────────────────────────────────────
    def delete_game(self, game_id: str) -> bool:
        game_dir = config.games_path / game_id
        if game_dir.exists():
            shutil.rmtree(game_dir)
        config.set_game_installed(game_id, False)
        return True

    # ── Launch ────────────────────────────────────────────────────────
    _processes: dict[str, subprocess.Popen] = {}

    def launch_game(self, game_id: str) -> subprocess.Popen | None:
        game_info = self.get_game_info(game_id)
        if not game_info:
            return None

        game_dir = config.games_path / game_id
        if not game_dir.exists():
            return None

        # ── Fetch auth file ──
        try:
            token = session_store.token
            if token:
                url = f"{config.api_base_url}/auth/v1/get-auth-file"
                resp = requests.get(url, headers={
                    "User-Agent": USER_AGENT,
                    "Authorization": f"Bearer {token}",
                }, timeout=15)
                if resp.ok:
                    data = resp.json().get("data", "")
                    if data:
                        account_path = game_dir / "account.ini"
                        account_path.write_text(data, encoding="utf-8")
                        log.info("Auth file saved to %s", account_path)
        except Exception as e:
            log.warning("Failed to fetch auth file: %s", e)

        # ── Launch executable ──
        executable = game_info.get("executable")
        if executable:
            exe_path = game_dir / executable
            if exe_path.exists():
                # macOS → run via Wine
                if sys.platform == "darwin":
                    cmd = ["wine", str(exe_path)]
                else:
                    cmd = [str(exe_path)]
                proc = subprocess.Popen(cmd, cwd=str(game_dir))
                self._processes[game_id] = proc
                return proc

        # Fallback: open folder
        try:
            subprocess.Popen(["open", str(game_dir)])
        except FileNotFoundError:
            pass
        return None

    def is_game_running(self, game_id: str) -> bool:
        proc = self._processes.get(game_id)
        if proc is None:
            return False
        if proc.poll() is not None:
            # Process has exited
            del self._processes[game_id]
            return False
        return True


    def get_game_directory(self, game_id: str) -> Path | None:
        """Return the game's install directory, or None if not installed."""
        d = config.games_path / game_id
        return d if d.exists() else None

    def show_in_file_manager(self, game_id: str):
        """Open the game directory in the system file manager."""
        d = self.get_game_directory(game_id)
        if not d:
            return
        if sys.platform == "win32":
            os.startfile(str(d))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(d)])
        else:
            subprocess.Popen(["xdg-open", str(d)])


# Singleton
game_service = GameService()
