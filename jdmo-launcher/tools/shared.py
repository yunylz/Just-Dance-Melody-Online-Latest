#!/usr/bin/env python3
"""Shared utilities for JDMO dev tools — S3 client, .env loader, hashing."""

from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import IO

import boto3
from botocore.config import Config as BotoConfig
from tqdm import tqdm

# ── Project root discovery ────────────────────────────────────────────
# Tools live in <project>/tools/, so the project root is the parent dir.
TOOLS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TOOLS_DIR.parent


# ── .env loader ───────────────────────────────────────────────────────
def load_env(env_path: Path | None = None) -> dict[str, str]:
    """Load key=value pairs from a .env file.  Returns a dict."""
    path = env_path or PROJECT_ROOT / ".env"
    if not path.exists():
        print(f"⚠  .env not found at {path}", file=sys.stderr)
        return {}
    env: dict[str, str] = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", maxsplit=1)
            env[key.strip()] = val.strip().strip('"').strip("'")
    return env


# ── S3 client factory ─────────────────────────────────────────────────
def s3_client(env: dict[str, str] | None = None):
    """Build a boto3 S3 client from .env variables."""
    if env is None:
        env = load_env()
    return boto3.client(
        "s3",
        region_name=env.get("S3_REGION", "us-east-005"),
        endpoint_url=env.get("S3_ENDPOINT"),
        aws_access_key_id=env["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=env["S3_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
    )


# ── File helpers ──────────────────────────────────────────────────────
def file_md5(path: Path) -> str:
    """Return hex MD5 of a file."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(64 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def file_sha256(path: Path) -> str:
    """Return hex SHA-256 of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(64 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


# ── S3 upload helpers ─────────────────────────────────────────────────
def upload_file(
    client,
    bucket: str,
    local_path: Path,
    s3_key: str,
    content_type: str = "application/octet-stream",
    cache_control: str = "public, max-age=31536000, immutable",
    callback: callable | None = None,
) -> str:
    """Upload a single file to S3 and return its public URL."""
    extra = {
        "ContentType": content_type,
    }
    if cache_control:
        extra["CacheControl"] = cache_control

    client.upload_file(
        str(local_path),
        bucket,
        s3_key,
        ExtraArgs=extra,
        Callback=callback,
    )

    fqdn = os.environ.get("S3_PUBLIC_FQDN") or os.environ.get("S3_FQDN", "")
    if fqdn:
        return f"{fqdn.rstrip('/')}/{s3_key.lstrip('/')}"
    return s3_key


def upload_directory(
    client,
    bucket: str,
    local_dir: Path,
    s3_prefix: str,
    content_type_map: dict[str, str] | None = None,
    cache_control: str = "public, max-age=31536000, immutable",
) -> list[dict]:
    """Recursively upload a directory to S3.

    Returns a manifest list: [{path, size, md5, url}, …].
    """
    if content_type_map is None:
        content_type_map = {
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".ico": "image/x-icon",
            ".txt": "text/plain",
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
        }

    files = sorted(local_dir.rglob("*"))
    files = [f for f in files if f.is_file() and f.name not in (".DS_Store", "account.ini")]

    manifest: list[dict] = []
    pbar = tqdm(files, unit="file", desc="  Uploading", ncols=70)
    for entry in pbar:
        rel = entry.relative_to(local_dir)
        s3_key = f"{s3_prefix.rstrip('/')}/{rel.as_posix()}"
        suffix = entry.suffix.lower()
        ct = content_type_map.get(suffix, "application/octet-stream")

        upload_file(client, bucket, entry, s3_key, content_type=ct, cache_control=cache_control)
        manifest.append(
            {
                "path": rel.as_posix(),
                "size": entry.stat().st_size,
                "md5": file_md5(entry),
            }
        )
        pbar.set_postfix_str(rel.as_posix()[:40], refresh=False)

    pbar.close()
    return manifest


# ── latest.json helpers ───────────────────────────────────────────────
def download_json(client, bucket: str, s3_key: str) -> dict | None:
    """Download and parse a JSON file from S3, or return None."""
    try:
        resp = client.get_object(Bucket=bucket, Key=s3_key)
        return json.loads(resp["Body"].read())
    except client.exceptions.NoSuchKey:
        return None
    except Exception as exc:
        print(f"⚠  Could not read s3://{bucket}/{s3_key}: {exc}", file=sys.stderr)
        return None


def upload_json(client, bucket: str, s3_key: str, data: dict):
    """Upload a JSON dict to S3 with public read."""
    body = json.dumps(data, indent=2, default=str).encode("utf-8")
    client.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=body,
        ContentType="application/json",
        CacheControl="public, max-age=60",
    )
