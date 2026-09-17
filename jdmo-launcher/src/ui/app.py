"""Top-level application window — manages screen transitions."""

from __future__ import annotations

from PySide6.QtWidgets import QMainWindow, QStackedWidget, QWidget, QVBoxLayout
from PySide6.QtCore import QSize, QRect, QPoint, Signal

from src.ui.login import LoginWidget
from src.ui.register import RegisterWidget
from src.ui.main_window import MainWidget


class MainApp(QMainWindow):
    """Root window that switches between login, register, and main screens via QStackedWidget."""

    TITLE = "JDMO Launcher"

    def __init__(self):
        super().__init__()
        self.setWindowTitle(self.TITLE)
        self.setMinimumSize(540, 680)
        self.resize(540, 720)
        self._center()

        # Stacked widget to switch between screens
        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        # Build screens
        self.login_widget = LoginWidget(self)
        self.register_widget = RegisterWidget(self)
        self.main_widget = None  # created on login

        # Add login + register (main_widget added when logged in)
        self.stack.addWidget(self.login_widget)
        self.stack.addWidget(self.register_widget)

        # Wire signals
        self.login_widget.register_requested.connect(self.show_register)
        self.login_widget.login_successful.connect(self.show_main)
        self.register_widget.back_requested.connect(self.show_login)

        # Auto-login attempt
        self.login_widget.try_auto_login()

    # ------------------------------------------------------------------
    # Screen transitions
    # ------------------------------------------------------------------
    def show_login(self):
        self.setWindowTitle(self.TITLE)
        self.resize(540, 720)
        self._center()
        self.stack.setCurrentWidget(self.login_widget)
        self.login_widget.reset_form()

    def show_register(self):
        self.setWindowTitle(f"{self.TITLE} — Create Account")
        self.resize(540, 720)
        self._center()
        self.stack.setCurrentWidget(self.register_widget)

    def show_main(self):
        if self.main_widget is None:
            from src.ui.main_window import MainWidget
            self.main_widget = MainWidget(self)
            self.stack.addWidget(self.main_widget)
            self.main_widget.logout_requested.connect(self._handle_logout)

        self.setWindowTitle(self.TITLE)
        self.resize(820, 660)
        self._center()
        self.stack.setCurrentWidget(self.main_widget)

    def _handle_logout(self):
        self.main_widget = None
        self.show_login()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _center(self):
        screen = self.screen().geometry() if self.screen() else QRect(0, 0, 1920, 1080)
        geo = self.frameGeometry()
        geo.moveCenter(screen.center())
        self.move(geo.topLeft())
