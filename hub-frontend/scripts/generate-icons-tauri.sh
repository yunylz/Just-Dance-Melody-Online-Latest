#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go up one level to hub-frontend root
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

SOURCE="$PROJECT_ROOT/static/icon.png"
OUTPUT_DIR="$PROJECT_ROOT/src-tauri/icons"

# Verify source exists
if [ ! -f "$SOURCE" ]; then
  echo "Error: Source icon not found at $SOURCE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# --- Helper: create a version of the source matching Apple's official
# macOS icon template, at a given pixel size.
#
# Per Apple's spec (developer.apple.com/forums/thread/670578): on a
# 1024x1024 canvas, artwork lives inside an 824x824 square centered on
# the canvas (100px transparent gutter on every side), with a corner
# radius of 185.4px measured against that 824px content square
# (185.4/824 ≈ 22.5%). Skipping the gutter is why third-party icons look
# oversized vs. Apple's own apps in the Dock — rounding alone isn't
# enough. Windows .ico icons don't need any of this.
round_icon() {
  local size="$1"
  local out="$2"
  local content radius offset

  content=$(awk -v s="$size" 'BEGIN { printf "%d", s * 824 / 1024 }')
  radius=$(awk -v c="$content" 'BEGIN { printf "%d", c * 185.4 / 824 }')
  offset=$(( (size - content) / 2 ))

  magick -size "${size}x${size}" xc:none \
    \( "$SOURCE" -resize "${content}x${content}!" \) \
    -gravity center -compose over -composite \
    \( -size "${size}x${size}" xc:none -fill white \
       -draw "roundrectangle ${offset},${offset},$((offset+content-1)),$((offset+content-1)),${radius},${radius}" \) \
    -compose DstIn -composite "$out"
}

# Create standard PNG icons for Tauri config (used for Linux/general use,
# NOT the macOS Dock icon — kept square/unmasked, matching platform norms)
for size in 32 128; do
  magick "$SOURCE" -resize "${size}x${size}!" -alpha on "$OUTPUT_DIR/${size}x${size}.png"
done

# Create 128@2x (256px for retina)
magick "$SOURCE" -resize 256x256! -alpha on "$OUTPUT_DIR/128x128@2x.png"

# Create .icns for macOS (requires iconutil) — THIS is what needs rounding
mkdir -p "$OUTPUT_DIR/icon.iconset"

# Generate ALL required iconset sizes including @2x retina variants,
# each with the rounded-corner mask applied.
# (Using parallel arrays instead of `declare -A` because macOS ships a
# stock bash 3.2, which predates associative array support.)
ICON_NAMES=(
  "icon_16x16.png"
  "icon_16x16@2x.png"
  "icon_32x32.png"
  "icon_32x32@2x.png"
  "icon_128x128.png"
  "icon_128x128@2x.png"
  "icon_256x256.png"
  "icon_256x256@2x.png"
  "icon_512x512.png"
  "icon_512x512@2x.png"
)
ICON_SIZES=(16 32 32 64 128 256 256 512 512 1024)

for i in "${!ICON_NAMES[@]}"; do
  name="${ICON_NAMES[$i]}"
  size="${ICON_SIZES[$i]}"
  echo "  Generating $name (${size}x${size}, rounded)"
  round_icon "$size" "$OUTPUT_DIR/icon.iconset/$name"
done

# Create the .icns file from the iconset
iconutil -c icns "$OUTPUT_DIR/icon.iconset" -o "$OUTPUT_DIR/icon.icns"
echo "  Created icon.icns"

# Create Windows ICO (unmasked — Windows icons are square by convention)
magick "$SOURCE" -define icon:auto-resize=256,128,96,64,48,32,16 -alpha on "$OUTPUT_DIR/icon.ico"
echo "  Created icon.ico"

# Clean up iconset temp directory
rm -rf "$OUTPUT_DIR/icon.iconset"

echo "✓ Icons created in $OUTPUT_DIR"