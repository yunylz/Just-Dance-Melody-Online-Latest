#!/bin/bash
# Generate all PWA icons from a single source image
# Usage: ./scripts/generate-icons.sh [source.png]
# Default source: static/icon.png

set -euo pipefail

SRC="${1:-static/icon.png}"
OUT="static"

if [ ! -f "$SRC" ]; then
	echo "❌ Source image not found: $SRC"
	echo "Usage: $0 [path/to/source.png]"
	exit 1
fi

# Check for ImageMagick
if ! command -v magick &>/dev/null && ! command -v convert &>/dev/null; then
	echo "❌ ImageMagick not found. Install it first:"
	echo "   brew install imagemagick"
	exit 1
fi

# Use 'magick' on modern ImageMagick, fallback to 'convert'
if command -v magick &>/dev/null; then
	CMD="magick"
else
	CMD="convert"
fi

echo "📦 Source: $SRC"
echo ""

# ── Icons ─────────────────────────────────────────────────────────────────
# Format: filename:size
ICONS="
android-chrome-192x192.png:192
android-chrome-512x512.png:512
apple-touch-icon.png:180
apple-touch-icon-precomposed.png:180
favicon-16x16.png:16
favicon-32x32.png:32
"

echo "$ICONS" | while IFS=: read -r file size; do
	[ -z "$file" ] && continue
	echo "  → $OUT/$file (${size}x${size})"
	$CMD "$SRC" -resize "${size}x${size}" "$OUT/$file"
done

# ── favicon.ico (multi-size) ──────────────────────────────────────────────
echo "  → $OUT/favicon.ico (16x16 + 32x32)"
$CMD "$SRC" -resize 16x16 /tmp/favicon-16.png
$CMD "$SRC" -resize 32x32 /tmp/favicon-32.png
$CMD /tmp/favicon-16.png /tmp/favicon-32.png "$OUT/favicon.ico"
rm -f /tmp/favicon-16.png /tmp/favicon-32.png

# ── Splash screens ───────────────────────────────────────────────────────
echo ""
echo "📱 Splash screens"

$CMD "$SRC" -resize 128x128 /tmp/splash-logo.png

# (width)x(height) format: label:geometry
SPLASHES="
splash-ipad-pro.png:2732x2048:+0-60
splash-ipad.png:1536x2048:+0-60
splash-iphone-plus.png:1242x2208:+0-50
splash-iphone.png:750x1334:+0-40
splash-iphone-x.png:1125x2436:+0-50
"

echo "$SPLASHES" | while IFS=: read -r file geo offset; do
	[ -z "$file" ] && continue
	echo "  → $OUT/$file (${geo})"
	$CMD -size "$geo" "xc:#0f172a" \
		/tmp/splash-logo.png -gravity center -geometry "$offset" -composite \
		"$OUT/$file"
done

rm -f /tmp/splash-logo.png

echo ""
echo "✅ All icons generated in $OUT/"
echo ""
echo "Generated files:"
ls -1 "$OUT"/favicon* "$OUT"/android-chrome* "$OUT"/apple-touch* "$OUT"/splash-*.png 2>/dev/null || true
