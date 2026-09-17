#!/usr/bin/env python3
"""JDMO Launcher — Entry point.

A Python GUI app for launching Just Dance 2017 with custom JDMO servers.
"""

from __future__ import annotations

import logging
import sys
import os

_project_root = os.path.dirname(os.path.abspath(__file__))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


def _resolve_asset(name: str) -> str:
    """Resolve an asset file path, handling frozen builds."""
    if getattr(sys, "frozen", False):
        base = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
        # PyInstaller --add-data puts files in base or base/assets
        for sub in ("", "assets", "src/assets"):
            p = os.path.join(base, sub, name)
            if os.path.exists(p):
                return p
    return os.path.join(_project_root, "src", "assets", name)

# ── Logging ───────────────────────────────────────────────────────────
_is_frozen = getattr(sys, "frozen", False)
if _is_frozen:
    logging.getLogger().addHandler(logging.NullHandler())
    logging.getLogger().setLevel(logging.CRITICAL + 1)
else:
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )
log = logging.getLogger("launcher")
if not _is_frozen:
    log.info("Starting JDMO Launcher")

# Silence noisy libs
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)


def enable_logging_for_admin():
    """Called after login if user is admin — sends logs to stderr."""
    if not getattr(sys, "frozen", False):
        return
    root = logging.getLogger()
    # Remove NullHandler, add stderr handler
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    ))
    root.addHandler(handler)
    root.setLevel(logging.DEBUG)
    logging.getLogger("launcher").info("Admin logging enabled")


def main():
    from PySide6.QtWidgets import QApplication
    from PySide6.QtCore import Qt
    from PySide6.QtGui import QIcon

    app = QApplication(sys.argv)
    app.setApplicationName("JDMO Launcher")
    app.setOrganizationName("RyuAtelier")
    app.setApplicationDisplayName("JDMO Launcher")

    # Set app icon (taskbar + window title) — .ico preferred for multi-res on Windows
    icon_path = _resolve_asset("icon.ico") or _resolve_asset("icon.png")
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    # Dark Fusion theme
    from PySide6.QtGui import QPalette, QColor
    app.setStyle("Fusion")
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(30, 30, 30))
    palette.setColor(QPalette.WindowText, QColor(220, 220, 220))
    palette.setColor(QPalette.Base, QColor(42, 42, 42))
    palette.setColor(QPalette.AlternateBase, QColor(50, 50, 50))
    palette.setColor(QPalette.ToolTipBase, QColor(42, 42, 42))
    palette.setColor(QPalette.ToolTipText, QColor(220, 220, 220))
    palette.setColor(QPalette.Text, QColor(220, 220, 220))
    palette.setColor(QPalette.Button, QColor(50, 50, 50))
    palette.setColor(QPalette.ButtonText, QColor(220, 220, 220))
    palette.setColor(QPalette.BrightText, QColor(255, 80, 80))
    palette.setColor(QPalette.Link, QColor(80, 160, 255))
    palette.setColor(QPalette.Highlight, QColor(70, 130, 210))
    palette.setColor(QPalette.HighlightedText, QColor(30, 30, 30))
    palette.setColor(QPalette.Disabled, QPalette.Text, QColor(100, 100, 100))
    palette.setColor(QPalette.Disabled, QPalette.ButtonText, QColor(100, 100, 100))
    app.setPalette(palette)

    app.setStyleSheet("""
        QToolTip { background: #2a2a2a; border: 1px solid #555; color: #ddd; padding: 4px; }
        QScrollBar:vertical { background: #2a2a2a; width: 10px; }
        QScrollBar::handle:vertical { background: #555; min-height: 30px; border-radius: 4px; }
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
    """)

    from src.ui.app import MainApp
    window = MainApp()
    window.show()
    app.exec()


if __name__ == "__main__":
    main()
