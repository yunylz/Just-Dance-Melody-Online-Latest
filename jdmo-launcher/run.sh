#!/usr/bin/env bash
# JDMO Launcher — shortcut to run from the virtual environment
set -euo pipefail
cd "$(dirname "$0")"
exec .venv/bin/python launcher.py "$@"
