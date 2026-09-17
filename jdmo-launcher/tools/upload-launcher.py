#!/usr/bin/env python3
"""
Launcher Uploader — upload launcher builds to CDN and publish latest.json.

The launcher itself checks ``latest.json`` on startup and offers to
self-update when a newer version is available.

Usage:
    python tools/upload-launcher.py
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from shared import (
    PROJECT_ROOT,
    load_env,
    s3_client,
    download_json,
    upload_json,
    file_sha256,
)


LAUNCHER_NAME = "JDMO Launcher"
S3_LAUNCHER_PREFIX = "public/builds/jdmo-launcher"

# ── Version helpers ───────────────────────────────────────────────────
def get_current_version() -> str:
    """Return version — from version.txt first, then git tag, then timestamp."""
    version_txt = PROJECT_ROOT / "version.txt"
    if version_txt.exists():
        ver = version_txt.read_text().strip()
        if ver and ver != "dev":
            return ver
    try:
        tag = subprocess.run(
            ["git", "describe", "--tags", "--always", "--dirty"],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        ).stdout.strip()
        if tag:
            return tag
    except Exception:
        pass
    return datetime.now(timezone.utc).strftime("%Y%m%d.%H%M%S")


def get_changelog_since(prev_version: str | None) -> str:
    """Return git log since the previous version tag."""
    if not prev_version:
        return "Initial release."
    try:
        log = subprocess.run(
            ["git", "log", f"{prev_version}..HEAD", "--oneline", "--no-decorate"],
            capture_output=True, text=True, cwd=PROJECT_ROOT,
        ).stdout.strip()
        return log if log else "Minor changes and bug fixes."
    except Exception:
        return "See repository for details."


# ── Build ─────────────────────────────────────────────────────────────
def build_launcher() -> Path:
    """Build the launcher with PyInstaller and return the dist dir."""
    dist_dir = PROJECT_ROOT / "dist" / "jdmo-launcher"
    if dist_dir.is_dir():
        shutil.rmtree(dist_dir)
    elif dist_dir.exists():
        dist_dir.unlink()

    print("\n  🔨 Building with PyInstaller …")
    # Match the flags used in .github/workflows/build.yml
    cmd = [
        sys.executable, "-m", "PyInstaller", "--clean", "--noconfirm",
        "--name", "jdmo-launcher",
        "--onefile",
        "--windowed",
        "--add-data", f"src/assets{os.pathsep}src/assets",
        "--add-data", f"version.txt{os.pathsep}.",
        "--distpath", str(dist_dir.parent),
        str(PROJECT_ROOT / "launcher.py"),
    ]
    # Add --version-file if on Windows and the file exists
    version_info = PROJECT_ROOT / "version_info.txt"
    if sys.platform == "win32" and version_info.exists():
        cmd.insert(cmd.index("--distpath"), "--version-file")
        cmd.insert(cmd.index("--distpath"), str(version_info))
    icon_ico = PROJECT_ROOT / "icon.ico"
    icon_png = PROJECT_ROOT / "icon.png"
    if icon_ico.exists():
        cmd.insert(cmd.index("--distpath"), "--icon")
        cmd.insert(cmd.index("--distpath"), str(icon_ico))
    elif icon_png.exists():
        cmd.insert(cmd.index("--distpath"), "--icon")
        cmd.insert(cmd.index("--distpath"), str(icon_png))
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_ROOT)
    if result.returncode != 0:
        print(f"  ✗ Build failed:\n{result.stderr}")
        sys.exit(1)

    # For --onefile builds, dist_dir *is* the binary
    if dist_dir.is_file():
        return dist_dir
    # Fallback: list directory contents
    built = list(dist_dir.iterdir())
    if not built:
        print("  ✗ No build output found")
        sys.exit(1)
    return built[0]


def main():
    print("═" * 50)
    print(f"  🚀  {LAUNCHER_NAME} — CDN Uploader")
    print("═" * 50)

    # 1. Load .env
    env = load_env()
    if "S3_ACCESS_KEY_ID" not in env:
        print("  ✗  Missing S3 credentials in .env")
        sys.exit(1)

    bucket = env["S3_BUCKET"]
    fqdn = env.get("S3_FQDN", "").rstrip("/")
    s3_prefix = env.get("S3_LAUNCHER_PATH", S3_LAUNCHER_PREFIX).rstrip("/").lstrip("/")

    # 2. Get version
    version = get_current_version()
    print(f"\n  📌  Version: {version}")

    # 3. Build
    binary_path = build_launcher()
    system = platform.system().lower()  # "darwin", "windows", "linux"
    arch = platform.machine().lower()   # "arm64", "x86_64"
    platform_key = f"{system}-{arch}"
    filename = f"jdmo-launcher-{system}-{arch}"
    if system == "windows":
        filename += ".exe"
    else:
        filename += ""  # no extension on macOS / Linux

    # 4. Compute SHA-256
    sha256 = file_sha256(binary_path)
    file_size = binary_path.stat().st_size
    print(f"     SHA-256: {sha256[:20]}…")
    print(f"     Size:    {file_size / (1024*1024):.1f} MB")

    # 5. Upload binary to S3
    print("\n  ☁️   Uploading to S3 …")
    client = s3_client(env)
    s3_key = f"{s3_prefix}/{version}/{filename}"
    binary_url = upload_file(client, bucket, binary_path, s3_key)
    print(f"     → {binary_url}")

    # 6. Get existing latest.json, build changelog
    latest_key = f"{s3_prefix}/latest.json"
    existing = download_json(client, bucket, latest_key)
    prev_version = (existing or {}).get("version")
    changelog = get_changelog_since(prev_version)

    # 7. Write / update latest.json
    platforms = existing.get("platforms", {}) if existing else {}
    platforms[platform_key] = {
        "url": binary_url,
        "sha256": sha256,
        "size": file_size,
        "filename": filename,
    }

    now = datetime.now(timezone.utc)
    latest = {
        "appName": LAUNCHER_NAME,
        "version": version,
        "updatedAt": now.isoformat(),
        "changelog": changelog,
        "downloadUrl": binary_url,
        "sha256": sha256,
        "platforms": platforms,
    }
    # Preserve history
    history = existing.get("history", []) if existing else []
    history.append({
        "version": version,
        "updatedAt": now.isoformat(),
        "changelog": changelog,
    })
    latest["history"] = history[-30:]

    upload_json(client, bucket, latest_key, latest)
    manifest_url = f"{fqdn}{latest_key}"
    print(f"\n  ✅  Done!  latest.json → {manifest_url}")
    print(f"      Version: {version}")
    print(f"      Platform: {platform_key}")
    print("═" * 50)


def upload_file(client, bucket: str, local_path: Path, s3_key: str) -> str:
    """Upload a single binary to S3."""
    extra = {
        "ContentType": "application/octet-stream",
        "CacheControl": "public, max-age=31536000, immutable",
    }
    client.upload_file(str(local_path), bucket, s3_key, ExtraArgs=extra)
    fqdn = os.environ.get("S3_FQDN", "")
    return f"{fqdn.rstrip('/')}/{s3_key.lstrip('/')}" if fqdn else s3_key


if __name__ == "__main__":
    main()
