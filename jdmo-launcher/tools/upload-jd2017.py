#!/usr/bin/env python3
"""
JD2017 Game Uploader — upload game files to CDN, generate manifest + latest.json.

The launcher checks ``latest.json`` to know what version is current and
downloads missing / changed files.

Usage:
    python tools/upload-jd2017.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow running as `python tools/upload-jd2017.py` from project root
_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from shared import (
    PROJECT_ROOT,
    load_env,
    s3_client,
    upload_directory,
    download_json,
    upload_json,
    file_md5,
)

# ── Constants ─────────────────────────────────────────────────────────
GAME_ID = "jd2017"
S3_GAME_PREFIX = f"public/builds/{GAME_ID}"
SETTINGS_FILE = PROJECT_ROOT / ".jd2017-settings.json"


def load_settings() -> dict:
    """Load saved local game path, or prompt the user."""
    settings = {}
    if SETTINGS_FILE.exists():
        try:
            settings = json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass

    saved = settings.get("local_path", "")
    prompt = f"Where are your {GAME_ID} files locally?"
    if saved:
        prompt += f"  [{saved}]"

    answer = input(f"  {prompt}: ").strip()
    if not answer and saved:
        answer = saved

    if not answer or not Path(answer).is_dir():
        print(f"  ✗ Directory does not exist: {answer}")
        sys.exit(1)

    answer = str(Path(answer).resolve())
    settings["local_path"] = answer
    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))
    return settings


def build_local_manifest(local_path: Path) -> dict[str, dict]:
    """Walk local_path, return {rel_path: {path, size, md5}}."""
    print(f"\n  📦 Scanning {local_path} …")
    manifest: dict[str, dict] = {}
    for entry in sorted(local_path.rglob("*")):
        if not entry.is_file() or entry.name in (".DS_Store", "account.ini"):
            continue
        rel = entry.relative_to(local_path).as_posix()
        manifest[rel] = {
            "path": rel,
            "size": entry.stat().st_size,
            "md5": file_md5(entry),
        }
    print(f"     Found {len(manifest)} files.")
    return manifest


def main():
    print("═" * 50)
    print(f"  🎮  {GAME_ID} — CDN Uploader (sync mode)")
    print("═" * 50)

    # 1. Load .env
    env = load_env()
    if "S3_ACCESS_KEY_ID" not in env:
        print("  ✗ Missing S3 credentials in .env")
        sys.exit(1)

    bucket = env["S3_BUCKET"]
    fqdn = env.get("S3_FQDN", "").rstrip("/")
    s3_prefix = (env.get("S3_BUILDS_PATH", S3_GAME_PREFIX).rstrip("/") + f"/{GAME_ID}").lstrip("/")

    # 2. Ask for local path (saved for next time)
    settings = load_settings()
    local_path = Path(settings["local_path"])

    # 3. Connect to S3 + fetch existing manifest
    print("\n  🔌 Connecting to S3 …")
    client = s3_client(env)
    latest_key = f"{s3_prefix}/latest.json"
    existing_data = download_json(client, bucket, latest_key)
    existing_files: dict[str, dict] = {}
    if existing_data:
        for f in existing_data.get("files", []):
            existing_files[f["path"]] = f
        print(f"     Existing manifest: {len(existing_files)} files (v{existing_data.get('version', '?')})")
    else:
        print("     No existing manifest found — fresh upload.")

    # 4. Build local manifest
    local_files = build_local_manifest(local_path)

    # 5. Determine actions
    to_upload: list[dict] = []
    to_delete: list[str] = []
    unchanged = 0

    for rel_path, local_info in local_files.items():
        existing = existing_files.get(rel_path)
        if existing and existing["md5"] == local_info["md5"] and existing["size"] == local_info["size"]:
            unchanged += 1
            # Keep the existing entry (with its original md5 — same thing)
            continue
        to_upload.append(local_info)

    for rel_path in existing_files:
        if rel_path not in local_files:
            to_delete.append(rel_path)

    print(f"\n     Unchanged: {unchanged}  |  Upload: {len(to_upload)}  |  Delete: {len(to_delete)}")

    # 6. Upload new/changed files
    if to_upload:
        print(f"\n  ☁️   Uploading {len(to_upload)} file(s) to s3://{bucket}/{s3_prefix} …")
        from tqdm import tqdm
        for entry in to_upload:
            local_file = local_path / entry["path"]
            s3_key = f"{s3_prefix}/{entry['path']}"
            suffix = Path(entry["path"]).suffix.lower()
            ct_map = {
                ".json": "application/json", ".png": "image/png",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".gif": "image/gif", ".webp": "image/webp",
                ".ico": "image/x-icon", ".txt": "text/plain",
                ".html": "text/html", ".css": "text/css",
                ".js": "application/javascript",
            }
            file_size = entry.get("size", 0)
            size_mb = file_size / (1024 * 1024)
            print(f"     ↑ {entry['path']} ({size_mb:.0f} MB)")

            # Manual upload with progress — file wrapper tracks bytes read
            class ProgressFile:
                def __init__(self, path, pbar_):
                    self._f = open(path, "rb")
                    self._pbar = pbar_
                    self._pos = 0
                def read(self, size=-1):
                    data = self._f.read(size)
                    if data:
                        self._pbar.update(len(data))
                        self._pos += len(data)
                    return data
                def seek(self, offset, whence=0):
                    self._f.seek(offset, whence)
                    self._pos = self._f.tell()
                def tell(self):
                    return self._pos
                def close(self):
                    self._f.close()
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    self.close()

            with tqdm(total=file_size, unit="B", unit_scale=True, unit_divisor=1024,
                      desc="       Progress", ncols=70, leave=False) as pbar:
                with ProgressFile(local_file, pbar) as wrapper:
                    ct = ct_map.get(suffix, "application/octet-stream")
                    client.upload_fileobj(wrapper, bucket, s3_key,
                                          ExtraArgs={"ContentType": ct})

    # 7. Delete stale files from CDN
    if to_delete:
        print(f"\n  🗑   Deleting {len(to_delete)} stale file(s) from CDN …")
        for rel_path in to_delete:
            s3_key = f"{s3_prefix}/{rel_path}"
            try:
                client.delete_object(Bucket=bucket, Key=s3_key)
                print(f"     ✕ {rel_path}")
            except Exception as e:
                print(f"     ⚠ Failed to delete {rel_path}: {e}")

    # 8. Build new merged manifest
    merged = dict(existing_files)  # start from existing
    # Update changed entries
    for entry in to_upload:
        merged[entry["path"]] = entry
    # Remove deleted entries
    for rel_path in to_delete:
        merged.pop(rel_path, None)

    # If nothing changed, keep the same version
    if not to_upload and not to_delete:
        print("\n  ✅  Nothing changed — manifest is up to date.")
        print("═" * 50)
        return

    new_files = [merged[k] for k in sorted(merged)]

    # 9. Generate version
    now = datetime.now(timezone.utc)
    version = now.strftime("%Y%m%d.%H%M%S")

    # 10. Update latest.json
    version_history = (existing_data or {}).get("history", [])
    version_history.append(
        {
            "version": version,
            "updatedAt": now.isoformat(),
            "fileCount": len(new_files),
            "totalSize": sum(f["size"] for f in new_files),
        }
    )

    latest = {
        "gameId": GAME_ID,
        "version": version,
        "updatedAt": now.isoformat(),
        "fileCount": len(new_files),
        "totalSize": sum(f["size"] for f in new_files),
        "files": new_files,
        "history": version_history[-20:],
    }

    upload_json(client, bucket, latest_key, latest)
    manifest_url = f"{fqdn}/{latest_key}"
    total_size_mb = sum(f["size"] for f in new_files) / (1024 * 1024)
    print(f"\n  ✅  Done!  latest.json → {manifest_url}")
    print(f"      Version: {version}")
    print(f"      Files:   {len(new_files)} ({total_size_mb:.1f} MB)")
    print(f"      Changed: {len(to_upload)} uploaded, {len(to_delete)} deleted")
    print("═" * 50)


if __name__ == "__main__":
    main()
