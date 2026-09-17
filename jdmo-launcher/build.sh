#!/usr/bin/env bash
# Build the JDMO Launcher with PyInstaller
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Installing dependencies …"
.venv/bin/pip install --quiet -r requirements.txt pyinstaller

echo "==> Building with PyInstaller …"
ICON_FLAG=""
if [ -f "icon.ico" ]; then
    ICON_FLAG="--icon icon.ico"
elif [ -f "icon.png" ]; then
    ICON_FLAG="--icon icon.png"
fi

.venv/bin/pyinstaller --clean --noconfirm --onefile --windowed \
    --name "jdmo-launcher" \
    --add-data "src/assets:src/assets" \
    --add-data "version.txt:." \
    $ICON_FLAG \
    launcher.py

echo ""
echo "✅ Build complete!"
echo "   Binary: dist/jdmo-launcher"
ls -lh dist/jdmo-launcher*
