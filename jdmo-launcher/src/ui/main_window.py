"""Main launcher dashboard shown after successful login."""

from __future__ import annotations

import logging
import os
import sys
import threading
import time as time_module

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QFrame, QMessageBox, QProgressBar, QDialog,
    QApplication, QMenu, QFileDialog,
)
from PySide6.QtCore import Qt, Signal, QMetaObject, Slot, Q_ARG, QTimer
from PySide6.QtGui import QFont, QColor, QPalette, QPixmap, QAction

import base64
import webbrowser

from src.api.auth import auth_service
from src.api.games import game_service, B2_MANIFEST_BASE
from src.api.updater import check_for_update, _current_version
from src.utils.config import config
from src.utils.storage import session_store
from launcher import enable_logging_for_admin

log = logging.getLogger("launcher.ui")


CARD_COLORS = [
    ("#2b5ea7", "#1a3a6e"),
    ("#7b2d8b", "#4a1a5e"),
    ("#2d8b5e", "#1a5e3a"),
    ("#8b5e2d", "#5e3a1a"),
]


def _format_speed(mbps: float) -> str:
    if mbps < 1:
        return f"{mbps * 1024:.0f} KB/s"
    return f"{mbps:.1f} MB/s"


def _format_time(seconds: float) -> str:
    if seconds < 0 or seconds > 86400:
        return "∞"
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    return f"{int(seconds // 3600)}h {int((seconds % 3600) // 60)}m"


class MainWidget(QWidget):
    """Dashboard showing installed/available games and account info."""

    logout_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        # Enable logging if user is admin (release builds)
        if session_store.is_admin:
            enable_logging_for_admin()
        self._progress_dialog = None
        self._action_containers = {}
        self._game_buttons: dict[str, QPushButton] = {}  # game_id → play_btn
        self._build_ui()
        self._refresh_games()

        # Poll running game processes every 2 seconds
        self._process_timer = QTimer(self)
        self._process_timer.timeout.connect(self._poll_processes)
        self._process_timer.start(2000)

        # Check for launcher updates in background (built releases only)
        if getattr(sys, "frozen", False):
            threading.Thread(target=self._check_update, daemon=True).start()
        else:
            log.debug("Skipping launcher update check (dev mode)")

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 16, 24, 24)

        # ── Top bar ──
        top = QHBoxLayout()
        title = QLabel("JDMO Launcher")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        top.addWidget(title)

        version_label = QLabel(f"v{_current_version()}")
        version_label.setStyleSheet("color: #777; font-size: 11px; padding-top: 6px;")
        top.addWidget(version_label)
        top.addStretch()

        user_label = QLabel(f"Welcome, {session_store.username or 'Player'}")
        user_label.setStyleSheet("color: #999;")
        top.addWidget(user_label)
        top.addSpacing(8)

        # Go to Hub
        hub_btn = QPushButton("Go to Hub")
        hub_btn.setFixedSize(80, 30)
        hub_btn.setStyleSheet(
            "QPushButton { border: 1px solid #666; border-radius: 4px; font-size: 12px; }"
            "QPushButton:hover { border-color: #4a8cd4; color: #4a8cd4; }"
        )
        hub_btn.clicked.connect(self._open_hub)
        top.addWidget(hub_btn)
        top.addSpacing(6)

        # Settings gear
        settings_btn = QPushButton("⚙")
        settings_btn.setFixedSize(30, 30)
        settings_btn.setStyleSheet(
            "QPushButton { border: 1px solid #666; border-radius: 4px; font-size: 14px; }"
            "QPushButton:hover { border-color: #999; }"
        )
        settings_btn.clicked.connect(self._open_settings)
        top.addWidget(settings_btn)
        top.addSpacing(6)

        logout_btn = QPushButton("Logout")
        logout_btn.setFixedSize(70, 30)
        logout_btn.setStyleSheet(
            "QPushButton { border: 1px solid #666; border-radius: 4px; font-size: 12px; }"
            "QPushButton:hover { border-color: #999; }"
        )
        logout_btn.clicked.connect(self._do_logout)
        top.addWidget(logout_btn)

        layout.addLayout(top)
        layout.addSpacing(16)

        # ── Section title ──
        sec = QLabel("Your Games")
        sec_font = QFont()
        sec_font.setPointSize(15)
        sec_font.setBold(True)
        sec.setFont(sec_font)
        layout.addWidget(sec)
        layout.addSpacing(12)

        # ── Scrollable game list ──
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.NoFrame)

        self.games_container = QWidget()
        self.games_layout = QVBoxLayout(self.games_container)
        self.games_layout.setSpacing(12)
        self.games_layout.setContentsMargins(0, 0, 0, 0)
        self.games_layout.addStretch()

        scroll.setWidget(self.games_container)
        layout.addWidget(scroll, 1)

    # ------------------------------------------------------------------
    # Game cards
    # ------------------------------------------------------------------
    @Slot()
    def _refresh_games(self):
        log.info("Refreshing game cards")
        while self.games_layout.count() > 1:
            item = self.games_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        games = game_service.get_available_games()
        installed = game_service.get_installed_games()

        for idx, (game_id, info) in enumerate(games.items()):
            is_installed = game_id in installed
            color_pair = CARD_COLORS[idx % len(CARD_COLORS)]
            card, meta_label, actions_container = self._create_game_card(
                game_id, info, is_installed, color_pair
            )
            self.games_layout.insertWidget(self.games_layout.count() - 1, card)

            # Background CDN check for ALL games
            threading.Thread(
                target=self._check_cdn_version,
                args=(game_id, meta_label, actions_container, color_pair),
                daemon=True,
            ).start()

    def _check_cdn_version(self, game_id, meta_label, actions_container, colors):
        """Fetch latest.json from CDN, then update meta label and action buttons."""
        import requests as req
        cdn_ver = ""
        try:
            url = f"{B2_MANIFEST_BASE}/public/builds/{game_id}/latest.json"
            log.debug("Fetching CDN manifest: %s", url)
            resp = req.get(url, timeout=10,
                           headers={"User-Agent": "UbiServices_SDK_JDMO_Launcher"})
            if resp.ok:
                data = resp.json()
                cdn_ver = data.get("version", "")
        except Exception as exc:
            log.warning("CDN check failed for %s: %s", game_id, exc)

        # Build meta text
        local_ver = config.get_game_meta(game_id).get("version", "")
        meta_parts = []
        if cdn_ver:
            meta_parts.append(f"v{cdn_ver}")
            if local_ver and local_ver != cdn_ver:
                meta_parts.append("⚠ Update available")
        last_played = config.get_game_meta(game_id).get("last_played", "")
        if last_played:
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(last_played)
                local = dt.astimezone()
                meta_parts.append(f"Last Played: {local.strftime('%b %d, %Y')}")
            except Exception:
                pass
        meta_text = "  ·  ".join(meta_parts) if meta_parts else (
            f"v{cdn_ver}" if cdn_ver else "Offline"
        )

        # Update UI from background thread
        QMetaObject.invokeMethod(
            meta_label, "setText",
            Qt.ConnectionType.QueuedConnection,
            Q_ARG(str, meta_text),
        )

        # Populate action buttons on the main thread
        self._action_containers[game_id] = actions_container
        installed = config.is_game_installed(game_id)
        local_ver = config.get_game_meta(game_id).get("version", "")
        update_avail = bool(cdn_ver and local_ver and cdn_ver != local_ver)
        QMetaObject.invokeMethod(
            self, "_populate_actions",
            Qt.ConnectionType.QueuedConnection,
            Q_ARG(str, game_id),
            Q_ARG(bool, installed),
            Q_ARG(str, colors[0]),
            Q_ARG(bool, update_avail),
        )

    @Slot(str, bool, str, bool)
    def _populate_actions(self, game_id, installed, color_hex, update_available=False):
        """Replace placeholder children with real action buttons (main thread only)."""
        container = self._action_containers.pop(game_id, None)
        if container is None:
            return
        # Clear existing children from the container's layout, keep the layout
        layout = container.layout()
        if not layout:
            return
        while layout.count():
            item = layout.takeAt(0)
            if item and item.widget():
                item.widget().deleteLater()

        if installed and update_available:
            update_btn = QPushButton("⬆  Update")
            update_btn.setFixedSize(90, 34)
            update_btn.setStyleSheet(
                "QPushButton { background: #e67e22; color: white; font-weight: bold; "
                "border-radius: 6px; font-size: 12px; }"
                "QPushButton:hover { background: #d35400; }"
            )
            update_btn.clicked.connect(lambda _, g=game_id: self._update_game(g))
            layout.addWidget(update_btn)

            # 3-dot menu
            menu_btn = QPushButton("···")
            menu_btn.setFixedSize(30, 34)
            menu_btn.setStyleSheet(
                "QPushButton { border: 1px solid rgba(255,255,255,0.3); "
                "border-radius: 4px; font-size: 13px; color: #ddd; }"
                "QPushButton:hover { background: rgba(255,255,255,0.1); }"
            )
            game_menu = QMenu(self)
            game_menu.setStyleSheet(
                "QMenu { background: #333; border: 1px solid #555; padding: 4px; }"
                "QMenu::item { padding: 6px 20px; }"
                "QMenu::item:selected { background: #4a8cd4; }"
            )
            show_label = "Show in Explorer" if sys.platform == "win32" else "Show in Finder"
            show_action = QAction(show_label, self)
            show_action.triggered.connect(lambda _, g=game_id: self._show_dir(g))
            game_menu.addAction(show_action)
            uninstall_action = QAction("Uninstall", self)
            uninstall_action.triggered.connect(lambda _, g=game_id: self._delete_game(g))
            game_menu.addAction(uninstall_action)
            menu_btn.clicked.connect(
                lambda: game_menu.exec(menu_btn.mapToGlobal(
                    menu_btn.rect().bottomLeft()))
            )
            layout.addWidget(menu_btn)
        elif installed:
            play_btn = QPushButton("▶  Play")
            play_btn.setFixedSize(90, 34)
            play_btn.setStyleSheet(
                "QPushButton { background: #2ecc71; color: white; font-weight: bold; "
                "border-radius: 6px; font-size: 13px; }"
                "QPushButton:hover { background: #27ae60; }"
            )
            play_btn.clicked.connect(lambda _, g=game_id: self._launch_game(g))
            self._game_buttons[game_id] = play_btn
            layout.addWidget(play_btn)

            # 3-dot menu (no chevron — use clicked signal, not setMenu)
            menu_btn = QPushButton("···")
            menu_btn.setFixedSize(30, 34)
            menu_btn.setStyleSheet(
                "QPushButton { border: 1px solid rgba(255,255,255,0.3); "
                "border-radius: 4px; font-size: 13px; color: #ddd; }"
                "QPushButton:hover { background: rgba(255,255,255,0.1); }"
            )
            game_menu = QMenu(self)
            game_menu.setStyleSheet(
                "QMenu { background: #333; border: 1px solid #555; padding: 4px; }"
                "QMenu::item { padding: 6px 20px; }"
                "QMenu::item:selected { background: #4a8cd4; }"
            )
            show_label = "Show in Explorer" if sys.platform == "win32" else "Show in Finder"
            show_action = QAction(show_label, self)
            show_action.triggered.connect(lambda _, g=game_id: self._show_dir(g))
            game_menu.addAction(show_action)
            uninstall_action = QAction("Uninstall", self)
            uninstall_action.triggered.connect(lambda _, g=game_id: self._delete_game(g))
            game_menu.addAction(uninstall_action)
            menu_btn.clicked.connect(
                lambda: game_menu.exec(menu_btn.mapToGlobal(
                    menu_btn.rect().bottomLeft()))
            )
            layout.addWidget(menu_btn)
        else:
            dl_btn = QPushButton("Download")
            dl_btn.setFixedSize(90, 34)
            style = (
                "QPushButton { background: white; color: %s; font-weight: bold; "
                "border-radius: 6px; font-size: 13px; }"
                "QPushButton:hover { background: #eee; }"
            ) % color_hex
            dl_btn.setStyleSheet(style)
            dl_btn.clicked.connect(lambda _, g=game_id: self._download_game(g))
            layout.addWidget(dl_btn)

    def _create_game_card(self, game_id, info, installed, colors):
        card = QFrame()
        card.setObjectName("gameCard")
        card.setStyleSheet(
            f"#gameCard {{ background: {colors[0]}; border-radius: 10px; }}"
        )
        card.setFixedHeight(90)

        h = QHBoxLayout(card)
        h.setContentsMargins(16, 14, 16, 14)
        h.setAlignment(Qt.AlignVCenter)

        # Icon
        icon = QLabel()
        icon.setFixedSize(56, 56)
        icon.setScaledContents(True)
        icon.setStyleSheet("border-radius: 8px;")
        if getattr(sys, "frozen", False):
            assets_base = os.path.join(sys._MEIPASS, "src", "assets")
        else:
            assets_base = os.path.join(os.path.dirname(__file__), "..", "assets")
        icon_path = os.path.join(assets_base, game_id, "icon.jpg")
        if os.path.exists(icon_path):
            pixmap = QPixmap(icon_path)
            if not pixmap.isNull():
                icon.setPixmap(pixmap)
        h.addWidget(icon)
        h.addSpacing(14)

        # Info column
        info_col = QVBoxLayout()
        name_label = QLabel(info["name"])
        name_font = QFont()
        name_font.setPointSize(15)
        name_font.setBold(True)
        name_label.setFont(name_font)
        name_label.setStyleSheet("color: white;")
        info_col.addWidget(name_label)

        desc_label = QLabel(info["description"])
        desc_label.setStyleSheet("color: #ccc; font-size: 11px;")
        desc_label.setWordWrap(True)
        info_col.addWidget(desc_label)

        meta_label = QLabel("Checking for updates…")
        meta_label.setStyleSheet("color: #888; font-size: 10px; font-style: italic;")
        info_col.addWidget(meta_label)

        h.addLayout(info_col, 1)

        # Action placeholder — replaced after CDN check
        actions_container = QWidget()
        checking_label = QLabel("Checking…")
        checking_label.setStyleSheet("color: #aaa; font-size: 11px; font-style: italic;")
        # Put the label inside a temporary layout so we can replace it later
        placeholder_layout = QHBoxLayout(actions_container)
        placeholder_layout.setContentsMargins(0, 0, 0, 0)
        placeholder_layout.addWidget(checking_label)
        h.addWidget(actions_container)

        return card, meta_label, actions_container

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------
    def _open_settings(self):
        menu = QMenu(self)
        menu.setStyleSheet(
            "QMenu { background: #333; border: 1px solid #555; padding: 4px; }"
            "QMenu::item { padding: 6px 20px; }"
            "QMenu::item:selected { background: #4a8cd4; }"
        )
        dl_action = QAction("Download location…", self)
        dl_action.triggered.connect(self._choose_download_path)
        menu.addAction(dl_action)
        menu.exec(self.sender().mapToGlobal(self.sender().rect().bottomLeft()))

    def _choose_download_path(self):
        current = config.download_path
        path = QFileDialog.getExistingDirectory(self, "Choose Download Location", current)
        if path:
            config.download_path = path
            log.info("Download path changed to: %s", path)
            self._refresh_games()

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------
    @Slot(str)
    def _show_error_dialog(self, message: str):
        """Show an error dialog (must be called from main thread)."""
        QMessageBox.critical(self, "Error", message)

    def _open_hub(self):
        token = session_store.token
        if token:
            encoded = base64.b64encode(token.encode()).decode()
            url = f"https://hub.c0llydoll.dev/hub?t={encoded}"
        else:
            url = "https://hub.c0llydoll.dev/hub"
        log.info("Opening Hub: %s", url)
        webbrowser.open(url)

    def _show_dir(self, game_id: str):
        game_service.show_in_file_manager(game_id)

    def _update_game(self, game_id: str):
        """Update an already-installed game — skip location prompt."""
        log.info("Updating game: %s", game_id)
        self._do_download(game_id, is_update=True)

    def _download_game(self, game_id: str):
        info = game_service.get_game_info(game_id)
        name = info["name"] if info else game_id
        log.info("Download started: %s (%s)", name, game_id)

        # ── Ask for download path (only for fresh installs) ──
        default_path = config.download_path
        msg = QMessageBox(self)
        msg.setWindowTitle("Download Location")
        msg.setText(f"Where should {name} be installed?")
        default_btn = msg.addButton("Default Location", QMessageBox.AcceptRole)
        custom_btn = msg.addButton("Choose Location…", QMessageBox.ActionRole)
        msg.addButton(QMessageBox.Cancel)
        msg.setDefaultButton(default_btn)
        msg.exec()

        if msg.clickedButton() == custom_btn:
            chosen = QFileDialog.getExistingDirectory(self, "Select Install Folder", default_path)
            if not chosen:
                return
            config.download_path = chosen
        elif msg.clickedButton() == msg.buttons()[-1]:
            return

        log.info("Download path: %s", config.games_path)
        self._do_download(game_id)

    def _do_download(self, game_id: str, is_update: bool = False):
        """Core download logic — shared by fresh installs and updates."""
        info = game_service.get_game_info(game_id)
        name = info["name"] if info else game_id
        action = "Updating" if is_update else "Downloading"

        # ── Professional download dialog ──
        dlg = QDialog(self)
        dlg.setWindowTitle(f"{action} {name}")
        dlg.setFixedSize(480, 200)
        dlg.setModal(True)

        layout = QVBoxLayout(dlg)
        layout.setSpacing(8)

        # Current file
        self._dl_file_label = QLabel("Preparing…")
        self._dl_file_label.setStyleSheet("font-size: 13px; font-weight: bold;")
        layout.addWidget(self._dl_file_label)

        # Overall progress bar
        self._dl_bar = QProgressBar()
        self._dl_bar.setRange(0, 100)
        self._dl_bar.setValue(0)
        self._dl_bar.setFixedHeight(22)
        self._dl_bar.setStyleSheet(
            "QProgressBar { border: 1px solid #555; border-radius: 4px; "
            "text-align: center; font-size: 11px; background: #2a2a2a; }"
            "QProgressBar::chunk { background: #4a8cd4; border-radius: 3px; }"
        )
        layout.addWidget(self._dl_bar)

        # Stats row: speed + ETA
        stats_row = QHBoxLayout()
        self._dl_speed_label = QLabel("Speed: —")
        self._dl_speed_label.setStyleSheet("color: #aaa; font-size: 11px;")
        stats_row.addWidget(self._dl_speed_label)
        stats_row.addStretch()
        self._dl_eta_label = QLabel("ETA: —")
        self._dl_eta_label.setStyleSheet("color: #aaa; font-size: 11px;")
        stats_row.addWidget(self._dl_eta_label)
        layout.addLayout(stats_row)

        # Size row
        self._dl_size_label = QLabel("Size: —")
        self._dl_size_label.setStyleSheet("color: #aaa; font-size: 11px;")
        layout.addWidget(self._dl_size_label)

        # Cancel button
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setFixedHeight(30)
        cancel_btn.setStyleSheet(
            "QPushButton { border: 1px solid #666; border-radius: 4px; font-size: 12px; }"
            "QPushButton:hover { border-color: #c0392b; color: #e74c3c; }"
        )
        layout.addWidget(cancel_btn, alignment=Qt.AlignRight)

        cancel_event = threading.Event()
        start_time = [time_module.time()]
        self._dl_progress = {"pct": 0, "speed": 0.0, "eta": 0.0, "dl_bytes": 0, "total_bytes": 0, "file": ""}

        cancel_btn.clicked.connect(lambda: cancel_event.set())
        dlg.rejected.connect(lambda: cancel_event.set())
        dlg.finished.connect(lambda: cancel_event.set())

        # Timer to poll progress from the main thread
        def poll_progress():
            p = self._dl_progress
            self._dl_bar.setValue(p["pct"])
            self._dl_speed_label.setText(f"Speed: {_format_speed(p['speed'])}")
            if p["eta"] and p["eta"] < 86400:
                self._dl_eta_label.setText(f"ETA: {_format_time(p['eta'])}")
            else:
                self._dl_eta_label.setText("ETA: —")
            if p["total_bytes"] > 0:
                dl_mb = p["dl_bytes"] / (1024 * 1024)
                total_mb = p["total_bytes"] / (1024 * 1024)
                self._dl_size_label.setText(f"Downloaded {dl_mb:.0f} / {total_mb:.0f} MB")

        timer = QTimer(dlg)
        timer.timeout.connect(poll_progress)
        timer.start(200)

        dlg.show()

        def task():
            try:
                self._dl_progress = {"pct": 0, "speed": 0.0, "eta": 0.0, "dl_bytes": 0, "total_bytes": 0, "file": ""}

                def byte_cb(dl_bytes, total_bytes, speed):
                    elapsed = time_module.time() - start_time[0]
                    remaining_bytes = total_bytes - dl_bytes
                    eta = remaining_bytes / (speed * 1024 * 1024) if speed > 0 else 0
                    pct = int(dl_bytes / total_bytes * 100) if total_bytes > 0 else 0
                    self._dl_progress.update(pct=pct, speed=speed, eta=eta,
                                              dl_bytes=dl_bytes, total_bytes=total_bytes)

                def status_cb(msg):
                    self._dl_progress["file"] = msg
                    if msg.startswith('"'):
                        display = f'Downloading {msg}…'
                    else:
                        display = msg
                    QMetaObject.invokeMethod(
                        self._dl_file_label, "setText",
                        Qt.ConnectionType.QueuedConnection,
                        Q_ARG(str, display),
                    )

                game_service.download_game(
                    game_id,
                    byte_callback=byte_cb,
                    status_callback=status_cb,
                    cancel_event=cancel_event,
                )
                log.info("Download complete: %s", game_id)
                QMetaObject.invokeMethod(dlg, "accept", Qt.ConnectionType.QueuedConnection)
                QMetaObject.invokeMethod(self, "_refresh_games", Qt.ConnectionType.QueuedConnection)
            except RuntimeError as e:
                if "cancelled" in str(e).lower():
                    log.info("Download cancelled: %s", game_id)
                    QMetaObject.invokeMethod(dlg, "reject", Qt.ConnectionType.QueuedConnection)
                else:
                    log.error("Download failed for %s: %s", game_id, e)
                    QMetaObject.invokeMethod(dlg, "reject", Qt.ConnectionType.QueuedConnection)
                    QMetaObject.invokeMethod(
                        self, "_show_error_dialog",
                        Qt.ConnectionType.QueuedConnection,
                        Q_ARG(str, f"Download failed: {e}"),
                    )
            except Exception as e:
                log.error("Download failed for %s: %s", game_id, e)
                QMetaObject.invokeMethod(dlg, "reject", Qt.ConnectionType.QueuedConnection)
                QMetaObject.invokeMethod(
                    self, "_show_error_dialog",
                    Qt.ConnectionType.QueuedConnection,
                    Q_ARG(str, f"Download failed: {e}"),
                )

        threading.Thread(target=task, daemon=True).start()

    def _launch_game(self, game_id: str):
        log.info("Launching game: %s", game_id)
        try:
            config.set_game_last_played(game_id)
            proc = game_service.launch_game(game_id)
            if proc is not None:
                btn = self._game_buttons.get(game_id)
                if btn:
                    btn.setText("▶  Running")
                    btn.setStyleSheet(
                        "QPushButton { background: #f39c12; color: white; font-weight: bold; "
                        "border-radius: 6px; font-size: 12px; }"
                        "QPushButton:hover { background: #e67e22; }"
                    )
                # Wine on macOS spawns the game as a child then exits immediately,
                # so keep "Running" for at least 30s even if the process disappears
                if sys.platform == "darwin":
                    QTimer.singleShot(30000, lambda: self._poll_processes())
            else:
                log.warning("Launch returned no process for %s", game_id)
        except Exception as e:
            log.error("Launch failed for %s: %s", game_id, e)
            QMessageBox.critical(self, "Launch Failed", str(e))

    def _poll_processes(self):
        """Called every 2s — update any play buttons whose game has exited."""
        for game_id, btn in list(self._game_buttons.items()):
            if btn.text() == "▶  Running" and not game_service.is_game_running(game_id):
                btn.setText("▶  Play")
                btn.setStyleSheet(
                    "QPushButton { background: #2ecc71; color: white; font-weight: bold; "
                    "border-radius: 6px; font-size: 13px; }"
                    "QPushButton:hover { background: #27ae60; }"
                )
                log.info("Game %s process exited, button reset", game_id)

    def _delete_game(self, game_id: str):
        info = game_service.get_game_info(game_id)
        name = info["name"] if info else game_id
        reply = QMessageBox.question(
            self, "Delete Game", f"Delete {name}?",
            QMessageBox.Yes | QMessageBox.No,
        )
        if reply == QMessageBox.Yes:
            log.info("Deleting game: %s", game_id)
            game_service.delete_game(game_id)
            self._refresh_games()

    def _do_logout(self):
        log.info("Logging out")
        auth_service.logout()
        self.logout_requested.emit()

    # ------------------------------------------------------------------
    # Self-update
    # ------------------------------------------------------------------
    def _check_update(self):
        try:
            info = check_for_update()
            if info.available:
                QMetaObject.invokeMethod(
                    self, "_prompt_update",
                    Qt.ConnectionType.QueuedConnection,
                    Q_ARG(str, info.version),
                    Q_ARG(str, info.changelog),
                    Q_ARG(str, info.download_url),
                    Q_ARG(str, info.sha256),
                )
        except Exception:
            pass

    @Slot(str, str, str, str)
    def _prompt_update(self, version: str, changelog: str, url: str, sha256: str):
        """Force the user to download the new launcher version."""
        log.info("New launcher version available: %s", version)
        dlg = QDialog(self)
        dlg.setWindowTitle("Update Required")
        dlg.setFixedSize(420, 180)
        dlg.setModal(True)
        dlg.setWindowFlags(Qt.Dialog | Qt.CustomizeWindowHint | Qt.WindowTitleHint)
        layout = QVBoxLayout(dlg)
        layout.addWidget(QLabel(
            f"JDMO Launcher v{version} is available.\n\n"
            "This version is required to continue.\n"
            "Please download the update to proceed."
        ))
        dl_btn = QPushButton("Download Update")
        dl_btn.setMinimumHeight(36)
        dl_btn.setStyleSheet(
            "QPushButton { background: #4a8cd4; color: white; font-weight: bold; "
            "border-radius: 6px; font-size: 14px; }"
            "QPushButton:hover { background: #5a9ce4; }"
        )
        token = session_store.token
        if token:
            encoded = base64.b64encode(token.encode()).decode()
            dl_url = f"https://hub.c0llydoll.dev/hub/downloads?d=launcher&t={encoded}"
        else:
            dl_url = "https://hub.c0llydoll.dev/hub/downloads?d=launcher"
        dl_btn.clicked.connect(
            lambda: (
                webbrowser.open(dl_url),
                QApplication.instance().quit(),
            )
        )
        layout.addWidget(dl_btn)
        dlg.exec()
