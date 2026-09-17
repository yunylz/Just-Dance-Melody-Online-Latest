#!/bin/bash
# Build icon files for Windows (.ico) and macOS (.icns) from icon.png
#
# Usage: bash scripts/build-icons.sh
#
# Requires: Python + Pillow (pip install Pillow) — already in requirements.txt
#           iconutil (built-in on macOS)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC="$PROJECT_DIR/icon.png"
ASSETS="$PROJECT_DIR/assets"

if [ ! -f "$SRC" ]; then
    echo "Error: icon.png not found at $SRC"
    echo "Place a 1024x1024 PNG at the project root and re-run."
    exit 1
fi

mkdir -p "$ASSETS"

echo "=== Building icon.ico (Windows) ==="
python3 -c "
from PIL import Image
img = Image.open('$SRC').convert('RGBA')

# Resize to common .ico sizes (keep 256 as max — .ico supports up to 256)
sizes = [256, 128, 64, 48, 32, 16]
icons = []
for s in sizes:
    icons.append(img.resize((s, s), Image.LANCZOS))

# Save as .ico (first image determines the default size)
icons[0].save(
    '$ASSETS/icon.ico',
    format='ICO',
    sizes=[(s, s) for s in sizes],
    append_images=icons[1:],
)
print('Created assets/icon.ico')
"

echo ""
echo "=== Building icon.icns (macOS) ==="

ICONSET="$ASSETS/icon.iconset"
mkdir -p "$ICONSET"

# iconutil expects PNGs at these exact sizes + filenames
# Format: filename:size
ICON_SET=(
    "icon_16x16.png:16"
    "icon_16x16@2x.png:32"
    "icon_32x32.png:32"
    "icon_32x32@2x.png:64"
    "icon_128x128.png:128"
    "icon_128x128@2x.png:256"
    "icon_256x256.png:256"
    "icon_256x256@2x.png:512"
    "icon_512x512.png:512"
    "icon_512x512@2x.png:1024"
)

for entry in "${ICON_SET[@]}"; do
    filename="${entry%%:*}"
    size="${entry##*:}"
    python3 -c "
from PIL import Image
img = Image.open('$SRC').convert('RGBA')
resized = img.resize(($size, $size), Image.LANCZOS)
resized.save('$ICONSET/$filename')
" &
done
wait

echo "Generated iconset files."

# Convert iconset to .icns
iconutil -c icns "$ICONSET" --output "$ASSETS/icon.icns"
echo "Created assets/icon.icns"

# Clean up iconset
rm -rf "$ICONSET"

echo ""
echo "Done! Generated:"
ls -lh "$ASSETS/icon.ico" "$ASSETS/icon.icns"
