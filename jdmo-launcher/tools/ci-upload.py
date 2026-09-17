#!/usr/bin/env python3
"""Called by GitHub Actions workflow to upload Windows build to CDN."""
import json
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
import boto3

bucket = os.environ['S3_BUCKET']
s3_prefix = 'public/builds/jdmo-launcher'
version = os.environ['GITHUB_REF_NAME']
system = 'windows'
arch = 'amd64'
binary = Path('dist/jdmo-launcher.exe')

sha256 = hashlib.sha256(binary.read_bytes()).hexdigest()
filename = f'jdmo-launcher-{system}-{arch}.exe'
s3_key = f'{s3_prefix}/{version}/{filename}'
latest_key = f'{s3_prefix}/latest.json'

client = boto3.client('s3',
    region_name=os.environ.get('S3_REGION', 'us-east-005'),
    endpoint_url=os.environ.get('S3_ENDPOINT'),
    aws_access_key_id=os.environ['S3_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['S3_SECRET_ACCESS_KEY'])

client.upload_file(str(binary), bucket, s3_key,
    ExtraArgs={'ContentType': 'application/octet-stream'})

fqdn = os.environ.get('S3_FQDN', 'https://jdmo-s3.s3.us-east-005.backblazeb2.com').rstrip('/')
url = f'{fqdn}/{s3_key}'

# Merge with existing latest.json
try:
    existing = json.load(client.get_object(Bucket=bucket, Key=latest_key)['Body'])
except Exception:
    existing = {}

platforms = existing.get('platforms', {})
platforms[f'{system}-{arch}'] = {
    'url': url, 'sha256': sha256,
    'size': binary.stat().st_size, 'filename': filename,
}

now = datetime.now(timezone.utc)
latest = {
    'appName': 'JDMO Launcher',
    'version': version,
    'updatedAt': now.isoformat(),
    'downloadUrl': url,
    'sha256': sha256,
    'platforms': platforms,
    'history': (existing.get('history', []) +
        [{'version': version, 'updatedAt': now.isoformat()}])[-30:],
}

client.put_object(Bucket=bucket, Key=latest_key,
    Body=json.dumps(latest, indent=2).encode(),
    ContentType='application/json',
    CacheControl='public, max-age=60')

print(f'Uploaded {filename} -> {url}')
print(f'Updated {latest_key} (platforms: {list(platforms.keys())})')
