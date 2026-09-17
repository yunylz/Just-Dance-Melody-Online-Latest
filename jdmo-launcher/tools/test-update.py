#!/usr/bin/env python3
"""
Test launcher self-update flow — fully automated.

Builds two versions, uploads both to S3, and sets latest.json so that
running the first build triggers an update to the second.

Usage:
    python tools/test-update.py
"""

from __future__ import annotations

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

PROJECT_ROOT = _TOOLS.parent

from shared import (
    load_env, s3_client, file_sha256, upload_json, download_json,
)

DIST = PROJECT_ROOT / "dist"
VERSION_FILE = PROJECT_ROOT / "version.txt"


def read_version() -> str:
    return VERSION_FILE.read_text().strip()


def write_version(v: str):
    VERSION_FILE.write_text(v + "\n")
    print(f"  📝  version.txt → {v}")


def bump_patch(ver: str) -> str:
    parts = ver.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def build(version: str) -> Path:
    """Run PyInstaller and return the path to the tagged binary."""
    print(f"\n  🔨  Building v{version} …")
    # Clean build artifacts but keep dist/ contents (previous builds)
    build_dir = PROJECT_ROOT / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)

    cmd = [
        sys.executable, "-m", "PyInstaller", "--clean", "--noconfirm",
        "--onefile", "--windowed",
        "--name", "jdmo-launcher",
        "--add-data", f"src/assets{os.pathsep}src/assets",
        "--add-data", f"version.txt{os.pathsep}.",
        "--distpath", str(DIST),
        str(PROJECT_ROOT / "launcher.py"),
    ]
    result = subprocess.run(cmd, cwd=PROJECT_ROOT)
    if result.returncode != 0:
        print("  ✗  Build failed")
        sys.exit(1)

    # Find the built binary — could be a file or .app bundle on macOS
    candidates = [
        DIST / "jdmo-launcher",
        DIST / "jdmo-launcher.exe",
        DIST / "jdmo-launcher.app",
    ]
    binary = None
    for c in candidates:
        if c.exists():
            binary = c
            break
    if binary is None:
        print("  ✗  Binary not found in dist/")
        sys.exit(1)

    ext = ".exe" if sys.platform == "win32" else ""
    tagged_name = f"jdmo-launcher-v{version.replace('.', '')}{ext}"
    tagged = DIST / tagged_name
    if binary.is_dir():  # .app bundle
        shutil.copytree(binary, tagged)
    else:
        shutil.copy2(binary, tagged)
    size = sum(f.stat().st_size for f in binary.rglob("*")) if binary.is_dir() else binary.stat().st_size
    print(f"  ✅  {tagged.name}  ({size / 1024 / 1024:.1f} MB)")
    return tagged


def upload_to_s3(client, bucket, s3_prefix, binary: Path, version: str):
    """Upload binary to S3 under versioned path and return the URL."""
    system = platform.system().lower()
    arch = platform.machine().lower()
    filename = binary.name
    s3_key = f"{s3_prefix}/{version}/{filename}"
    print(f"  ☁️   Uploading {filename} to s3://{bucket}/{s3_key} …")
    client.upload_file(
        str(binary), bucket, s3_key,
        ExtraArgs={"ContentType": "application/octet-stream",
                    "CacheControl": "public, max-age=31536000, immutable"},
    )
    fqdn = os.environ.get("S3_FQDN", "https://jdmo-s3.s3.us-east-005.backblazeb2.com")
    return f"{fqdn.rstrip('/')}/{s3_key}"


def main():
    print("═" * 50)
    print("  🧪  Launcher Update Test — Full Auto")
    print("═" * 50)

    env = load_env()
    if "S3_ACCESS_KEY_ID" not in env:
        print("  ✗  Missing S3 credentials in .env")
        sys.exit(1)

    bucket = env["S3_BUCKET"]
    s3_prefix = env.get("S3_LAUNCHER_PATH", "public/builds/jdmo-launcher").lstrip("/")

    original = read_version()
    print(f"\n  📄  Current version: {original}")

    # ── Build 1: current version ──
    build_v1 = build(original)

    # ── Bump version ──
    bumped = bump_patch(original)
    write_version(bumped)
    print(f"  ➕  Bumped to: {bumped}")

    # ── Build 2: bumped version ──
    build_v2 = build(bumped)

    # ── Upload both to S3 ──
    print("\n  🔌  Connecting to S3 …")
    client = s3_client(env)
    url_v1 = upload_to_s3(client, bucket, s3_prefix, build_v1, original)
    url_v2 = upload_to_s3(client, bucket, s3_prefix, build_v2, bumped)

    # ── Set latest.json to point to bumped version ──
    system = platform.system().lower()
    arch = platform.machine().lower()
    platform_key = f"{system}-{arch}"

    now = datetime.now(timezone.utc)
    sha256_v2 = file_sha256(build_v2)

    latest = {
        "appName": "JDMO Launcher",
        "version": bumped,
        "updatedAt": now.isoformat(),
        "changelog": f"Test update from {original} to {bumped}",
        "downloadUrl": url_v2,
        "sha256": sha256_v2,
        "platforms": {
            platform_key: {
                "url": url_v2,
                "sha256": sha256_v2,
                "size": build_v2.stat().st_size,
                "filename": build_v2.name,
            }
        },
        "history": [{"version": bumped, "updatedAt": now.isoformat(), "changelog": "Test update"}],
    }

    latest_key = f"{s3_prefix}/latest.json"
    upload_json(client, bucket, latest_key, latest)
    print(f"\n  📄  latest.json → s3://{bucket}/{latest_key}")
    print(f"      Points to v{bumped}")

    # ── Restore original version ──
    write_version(original)
    print(f"  🔙  Restored version.txt to {original}")

    print("\n" + "═" * 50)
    print("  ✅  Test ready!")
    print(f"\n  Run:  {build_v1}")
    print(f"  It should detect v{bumped} and auto-update.")
    print("═" * 50)


if __name__ == "__main__":
    main()
