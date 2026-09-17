#!/usr/bin/env bash
# Prepares a release folder (ready to upload to the jdmo-builds S3 bucket) from a
# local `tauri build` bundle output. Standardizes filenames and generates latest.json.
#
# Usage:
#   ./scripts/prepare-release.sh <version> [bundle-dir]
#
# Examples:
#   ./scripts/prepare-release.sh 1.5.6
#   ./scripts/prepare-release.sh 1.5.6 src-tauri/target/aarch64-apple-darwin/release/bundle
#
# Output: ./release/hub/  → upload the CONTENTS of this folder to s3://jdmo-builds/hub/
set -euo pipefail

VERSION="${1:?Usage: prepare-release.sh <version> [bundle-dir]}"
BUNDLE="${2:-src-tauri/target/release/bundle}"
OUT="release/hub/${VERSION}"
CDN_BASE="${CDN_BASE:-https://jdmo-builds-cdn.c0llydoll.dev}"

mkdir -p "${OUT}"
rm -f "${OUT}"/*

# ── macOS artifacts ────────────────────────────────────────────────────────
MAC_DIR="${BUNDLE}/macos"
if [ -d "${MAC_DIR}" ]; then
  echo "Collecting macOS updater artifacts..."
  [ -f "${MAC_DIR}/JDMO Hub.app.tar.gz" ] && cp "${MAC_DIR}/JDMO Hub.app.tar.gz" "${OUT}/JDMO.Hub.app.tar.gz"
  [ -f "${MAC_DIR}/JDMO Hub.app.tar.gz.sig" ] && cp "${MAC_DIR}/JDMO Hub.app.tar.gz.sig" "${OUT}/JDMO.Hub.app.tar.gz.sig"
fi

# ── Windows artifacts ──────────────────────────────────────────────────────
NSIS_DIR="${BUNDLE}/nsis"
if [ -d "${NSIS_DIR}" ]; then
  echo "Collecting Windows artifacts..."
  for f in "${NSIS_DIR}"/*-setup.exe; do
    [ -f "${f}" ] && cp "${f}" "${OUT}/JDMO.Hub_${VERSION}_x64-setup.exe"
    [ -f "${f}.sig" ] && cp "${f}.sig" "${OUT}/JDMO.Hub_${VERSION}_x64-setup.exe.sig"
  done
fi

MSI_DIR="${BUNDLE}/msi"
if [ -d "${MSI_DIR}" ]; then
  for f in "${MSI_DIR}"/*.msi; do
    [ -f "${f}" ] && cp "${f}" "${OUT}/JDMO.Hub_${VERSION}_x64.msi"
    [ -f "${f}.sig" ] && cp "${f}.sig" "${OUT}/JDMO.Hub_${VERSION}_x64.msi.sig"
  done
fi

# ── Generate latest.json ───────────────────────────────────────────────────
APP_VERSION="${VERSION}" CDN_BASE="${CDN_BASE}" node scripts/generate-latest-json.mjs "${OUT}"
cp "${OUT}/latest.json" "release/hub/latest.json"
rm -f "${OUT}/latest.json"

echo ""
echo "Release prepared:"
echo "  release/hub/latest.json"
echo "  release/hub/${VERSION}/"
echo ""
echo "Upload the CONTENTS of release/hub/ to the bucket root:"
echo "  aws s3 sync release/hub/ s3://jdmo-builds/hub/ --endpoint-url <R2_ENDPOINT> --region auto"
ls -la "release/hub" "release/hub/${VERSION}"
