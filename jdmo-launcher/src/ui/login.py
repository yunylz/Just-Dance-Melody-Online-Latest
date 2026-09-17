"""Login screen for the JDMO Launcher."""

from __future__ import annotations

import logging
import sys

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QCheckBox, QMessageBox, QInputDialog,
)
from PySide6.QtCore import Qt, Signal, QTimer
from PySide6.QtGui import QFont

from src.api.auth import auth_service, ApiError
from src.utils.config import config
from src.utils.storage import session_store

log = logging.getLogger("launcher.ui.login")

REGISTER_URL = f"{config.hub_url}/login?r=true"


class LoginWidget(QWidget):
    """Login form with email, password, remember-me and a link to register."""

    register_requested = Signal()
    login_successful = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build_ui()
        self._restore_fields()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)

        # Card container
        card = QVBoxLayout()
        card.setSpacing(0)
        card_widget = QWidget()
        card_widget.setLayout(card)
        card_widget.setObjectName("loginCard")
        card_widget.setFixedWidth(380)
        layout.addWidget(card_widget, alignment=Qt.AlignCenter)

        # Title
        title = QLabel("JDMO Launcher")
        title_font = QFont()
        title_font.setPointSize(22)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setAlignment(Qt.AlignCenter)
        card.addWidget(title)
        card.addSpacing(4)

        subtitle = QLabel("Sign in to your JDMO Hub account")
        subtitle.setStyleSheet("color: #999;")
        subtitle.setAlignment(Qt.AlignCenter)
        card.addWidget(subtitle)
        card.addSpacing(24)

        # Error label
        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #ff5555; font-size: 12px;")
        self.error_label.setAlignment(Qt.AlignCenter)
        self.error_label.setWordWrap(True)
        self.error_label.setVisible(False)
        card.addWidget(self.error_label)
        card.addSpacing(8)

        # Email
        email_label = QLabel("Email")
        email_label.setStyleSheet("font-size: 12px;")
        card.addWidget(email_label)
        card.addSpacing(2)

        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText("you@example.com")
        self.email_edit.setMinimumHeight(36)
        self.email_edit.setStyleSheet(
            "QLineEdit { padding-left: 10px; }"
            "QLineEdit::placeholder { color: #888; }"
        )
        card.addWidget(self.email_edit)
        card.addSpacing(12)

        # Password
        pass_label = QLabel("Password")
        pass_label.setStyleSheet("font-size: 12px;")
        card.addWidget(pass_label)
        card.addSpacing(2)

        self.password_edit = QLineEdit()
        self.password_edit.setPlaceholderText("••••••••")
        self.password_edit.setEchoMode(QLineEdit.Password)
        self.password_edit.setMinimumHeight(36)
        self.password_edit.setStyleSheet(
            "QLineEdit { padding-left: 10px; }"
            "QLineEdit::placeholder { color: #888; }"
        )
        card.addWidget(self.password_edit)
        card.addSpacing(8)

        # Remember me
        self.remember_check = QCheckBox("Remember me")
        card.addWidget(self.remember_check)
        card.addSpacing(4)

        # Forgot password
        forgot_btn = QPushButton("Forgot password?")
        forgot_btn.setFlat(True)
        forgot_btn.setCursor(Qt.PointingHandCursor)
        forgot_btn.setStyleSheet("QPushButton { color: #80a0ff; text-align: left; font-size: 12px; }")
        forgot_btn.clicked.connect(self._forgot_password)
        card.addWidget(forgot_btn)
        card.addSpacing(16)

        # Sign in button
        self.signin_btn = QPushButton("Sign In")
        self.signin_btn.setMinimumHeight(40)
        self.signin_btn.setStyleSheet(
            "QPushButton { background: #4a8cd4; color: white; font-weight: bold; "
            "border-radius: 6px; font-size: 14px; }"
            "QPushButton:hover { background: #5a9ce4; }"
            "QPushButton:disabled { background: #3a5a7a; color: #888; }"
        )
        self.signin_btn.clicked.connect(self._do_login)
        card.addWidget(self.signin_btn)
        card.addSpacing(16)

        # Divider
        divider = QLabel()
        divider.setFixedHeight(1)
        divider.setStyleSheet("background: #555;")
        card.addWidget(divider)
        card.addSpacing(16)

        # Register link
        reg_label = QLabel("Don't have an account?")
        reg_label.setAlignment(Qt.AlignCenter)
        reg_label.setStyleSheet("color: #999;")
        card.addWidget(reg_label)
        card.addSpacing(4)

        register_btn = QPushButton("Create Account")
        register_btn.setFlat(True)
        register_btn.setCursor(Qt.PointingHandCursor)
        register_btn.setMinimumHeight(36)
        register_btn.setStyleSheet(
            "QPushButton { border: 1px solid #666; border-radius: 6px; font-size: 13px; }"
            "QPushButton:hover { border-color: #999; }"
        )
        register_btn.clicked.connect(self._open_register_browser)
        card.addWidget(register_btn)

        # ── Debug: environment switch (dev only) ──
        if not getattr(sys, "frozen", False):
            from src.utils.config import API_URLS, HUB_URLS, DEFAULT_API_BASE_URL, DEFAULT_HUB_URL
            current_env = "PROD" if DEFAULT_API_BASE_URL == API_URLS["PROD"] else "LOCAL"
            self.env_btn = QPushButton(f"🔧 {current_env}")
            self.env_btn.setFlat(True)
            self.env_btn.setCursor(Qt.PointingHandCursor)
            self.env_btn.setStyleSheet(
                "QPushButton { color: #555; font-size: 10px; padding: 4px; }"
                "QPushButton:hover { color: #999; }"
            )
            self.env_btn.clicked.connect(self._toggle_env)
            card.addWidget(self.env_btn, alignment=Qt.AlignCenter)

        # Enter key navigation
        self.email_edit.returnPressed.connect(self.password_edit.setFocus)
        self.password_edit.returnPressed.connect(self._do_login)

        QTimer.singleShot(100, self.email_edit.setFocus)

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------
    def try_auto_login(self):
        if session_store.is_logged_in:
            try:
                if auth_service.validate_session():
                    self.login_successful.emit()
            except Exception:
                pass

    def reset_form(self):
        self.error_label.setVisible(False)
        self.signin_btn.setEnabled(True)
        self.signin_btn.setText("Sign In")

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------
    def _show_error(self, msg: str):
        self.error_label.setText(msg)
        self.error_label.setVisible(True)

    def _hide_error(self):
        self.error_label.setVisible(False)

    def _set_loading(self, loading: bool):
        self.signin_btn.setEnabled(not loading)
        self.signin_btn.setText("Signing in..." if loading else "Sign In")
        self.email_edit.setEnabled(not loading)
        self.password_edit.setEnabled(not loading)
        if loading:
            self._hide_error()

    def _restore_fields(self):
        if config.last_email:
            self.email_edit.setText(config.last_email)
        if config.remember_me:
            self.remember_check.setChecked(True)

    def _do_login(self):
        email = self.email_edit.text().strip()
        password = self.password_edit.text()
        remember = self.remember_check.isChecked()

        if not email or not password:
            self._show_error("Please enter both email and password.")
            return

        self._set_loading(True)

        try:
            result = auth_service.login(email, password, remember_me=remember)

            if result.get("twoFactorRequired"):
                self._set_loading(False)
                self._prompt_2fa(result.get("twoFactorToken", ""))
                return

            config.last_email = email
            config.remember_me = remember
            self.login_successful.emit()

        except ApiError as e:
            self._set_loading(False)
            self._show_error(str(e))
        except Exception as e:
            self._set_loading(False)
            self._show_error(f"Connection error: {e}")

    def _prompt_2fa(self, two_factor_token: str):
        code, ok = QInputDialog.getText(self, "Two-Factor Auth", "Enter your 6-digit 2FA code:")
        if not ok or not code:
            return
        self._set_loading(True)
        try:
            auth_service.verify_2fa(code, two_factor_token)
            config.last_email = self.email_edit.text().strip()
            config.remember_me = self.remember_check.isChecked()
            self.login_successful.emit()
        except ApiError as e:
            self._set_loading(False)
            self._show_error(str(e))
        except Exception as e:
            self._set_loading(False)
            self._show_error(f"Error: {e}")

    def _open_register_browser(self):
        """Open the Hub login/register page in the default browser."""
        config.open_hub_login()

    def _toggle_env(self):
        """Switch between LOCAL and PROD environments (debug only)."""
        from src.utils.config import API_URLS, HUB_URLS
        import importlib
        import sys

        current = config.api_base_url
        if "127.0.0.1" in current or "localhost" in current:
            new_api = API_URLS["PROD"]
            new_hub = HUB_URLS["PROD"]
            label = "PROD"
        else:
            new_api = API_URLS["LOCAL"]
            new_hub = HUB_URLS["LOCAL"]
            label = "LOCAL"

        config.api_base_url = new_api
        config._data["hub_url"] = new_hub
        config._save()

        # Reload auth service so it picks up the new base URL
        from src.api.client import api_client
        api_client.base_url = new_api.rstrip("/")

        self.env_btn.setText(f"🔧 {label}")
        log.info("Switched env to %s (api=%s, hub=%s)", label, new_api, new_hub)
        self._show_error(f"Switched to {label}")



    def _forgot_password(self):
        email = self.email_edit.text().strip()
        if not email:
            self._show_error("Enter your email first, then click 'Forgot password?'")
            return
        try:
            auth_service.forgot_password(email)
            QMessageBox.information(
                self, "Password Reset",
                "If an account with this email exists, a password reset link has been sent.",
            )
        except ApiError as e:
            self._show_error(str(e))
        except Exception as e:
            self._show_error(f"Error: {e}")
