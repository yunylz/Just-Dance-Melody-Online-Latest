#!/usr/bin/env python3
"""
Test launcher self-update — fully local, no S3 needed.

Starts a local HTTP server serving mock latest.json and binaries,
builds two versions, and runs the update flow entirely offline.

Usage:
    python tools/test-update-local.py
"""

from __future__ import annotations

import http.server
import json
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

_TOOLS = Path(__file__).resolve().parent
PROJECT_ROOT = _TOOLS.parent
DIST = PROJECT_ROOT / "dist"
VERSION_FILE = PROJECT_ROOT / "version.txt"

PORT = 8765
LOCAL_CDN = f"http://127.0.0.1:{PORT}"


def read_version() -> str:
    return VERSION_FILE.read_text().strip()


def write_version(v: str):
    VERSION_FILE.write_text(v + "\n")


def bump(v: str) -> str:
    parts = v.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def build(version: str) -> Path:
    print(f"\n  🔨  Building v{version} …")
    build_dir = PROJECT_ROOT / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)

    cmd = [
        sys.executable, "-m", "PyInstaller", "--clean", "--noconfirm",
        "--onefile",
        "--name", "jdmo-launcher",
        "--add-data", f"src/assets{os.pathsep}src/assets",
        "--add-data", f"version.txt{os.pathsep}.",
        "--distpath", str(DIST),
        str(PROJECT_ROOT / "launcher.py"),
    ]
    subprocess.run(cmd, cwd=PROJECT_ROOT, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Find binary
    for name in ("jdmo-launcher", "jdmo-launcher.exe", "jdmo-launcher.app"):
        p = DIST / name
        if p.exists():
            binary = p
            break
    else:
        sys.exit("Binary not found")

    ext = ".exe" if sys.platform == "win32" else ""
    tagged = DIST / f"test-v{version.replace('.', '')}{ext}"
    if binary.is_dir():
        shutil.copytree(binary, tagged)
    else:
        shutil.copy2(binary, tagged)
        os.chmod(tagged, 0o755)
    return tagged


def serve(server_dir: Path):
    """Start HTTP server in a thread — returns immediately."""
    os.chdir(server_dir)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            print(f"  🌐  {args[0]}")

    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"  🌐  HTTP server at {LOCAL_CDN}")
    server.serve_forever()


def main():
    print("═" * 50)
    print("  🧪  Update Test — Fully Local")
    print("═" * 50)

    original = read_version()
    bumped_ver = bump(original)
    print(f"\n  📄  {original} → {bumped_ver}")

    # ── Build version A (current) ──
    write_version(original)
    bin_a = build(original)

    # ── Build version B (update) ──
    write_version(bumped_ver)
    bin_b = build(bumped_ver)

    # ── Restore original ──
    write_version(original)

    # ── Set up local CDN structure ──
    cdn_dir = PROJECT_ROOT / ".test-cdn"
    if cdn_dir.exists():
        shutil.rmtree(cdn_dir)
    builds_dir = cdn_dir / "public" / "builds" / "jdmo-launcher"
    builds_dir.mkdir(parents=True)

    # Copy binaries into CDN
    system = platform.system().lower()
    arch = platform.machine().lower()
    platform_key = f"{system}-{arch}"
    shutil.copy2(bin_b, builds_dir / bin_b.name)

    # Write latest.json pointing to version B
    latest = {
        "appName": "JDMO Launcher",
        "version": bumped_ver,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "changelog": f"Test {original} → {bumped_ver}",
        "downloadUrl": f"{LOCAL_CDN}/public/builds/jdmo-launcher/{bin_b.name}",
        "sha256": "",
        "platforms": {
            platform_key: {
                "url": f"{LOCAL_CDN}/public/builds/jdmo-launcher/{bin_b.name}",
                "sha256": "",
                "size": bin_b.stat().st_size,
                "filename": bin_b.name,
            }
        },
    }
    (builds_dir / "latest.json").write_text(json.dumps(latest, indent=2))

    # ── Start local HTTP server ──
    t = threading.Thread(target=serve, args=(cdn_dir,), daemon=True)
    t.start()
    time.sleep(0.5)

    # ── Run version A with CDN pointed to localhost ──
    env = os.environ.copy()
    env["JDMO_CDN_URL"] = LOCAL_CDN

    print(f"\n  ▶   Running {bin_a.name} …")
    print(f"      (should detect v{bumped_ver} and auto-update)")
    print("═" * 50)

    subprocess.run([str(bin_a)], env=env)

    # ── Clean up ──
    shutil.rmtree(cdn_dir, ignore_errors=True)
    print("\n✅  Test complete")


if __name__ == "__main__":
    main()
