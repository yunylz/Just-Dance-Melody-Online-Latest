"""Registration screen for the JDMO Launcher."""

from __future__ import annotations

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QCheckBox, QComboBox, QScrollArea, QMessageBox,
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont

from src.api.auth import auth_service, ApiError


COUNTRIES = [
    "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "BE",
    "BR", "JP", "KR", "MX", "SE", "NO", "DK", "FI", "PL", "RU",
    "CN", "IN", "AR", "CL", "CO", "PT", "CH", "AT", "IE", "NZ",
    "ZA", "TR", "GR", "IL", "SG", "MY", "TH", "PH", "VN", "OTHER",
]


class RegisterWidget(QWidget):
    """Registration form with all required fields in a scrollable panel."""

    back_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build_ui()

    def _build_ui(self):
        # Scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.NoFrame)

        form_container = QWidget()
        self.form_layout = QVBoxLayout(form_container)
        self.form_layout.setAlignment(Qt.AlignCenter)

        # Card
        card = QVBoxLayout()
        card.setSpacing(0)
        card_widget = QWidget()
        card_widget.setLayout(card)
        card_widget.setObjectName("regCard")
        card_widget.setFixedWidth(380)
        self.form_layout.addWidget(card_widget, alignment=Qt.AlignCenter)

        # Title
        title = QLabel("Create Account")
        title_font = QFont()
        title_font.setPointSize(20)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setAlignment(Qt.AlignCenter)
        card.addWidget(title)
        card.addSpacing(2)

        subtitle = QLabel("Join the JDMO community")
        subtitle.setStyleSheet("color: #999;")
        subtitle.setAlignment(Qt.AlignCenter)
        card.addWidget(subtitle)
        card.addSpacing(16)

        # Error
        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #ff5555; font-size: 12px;")
        self.error_label.setAlignment(Qt.AlignCenter)
        self.error_label.setWordWrap(True)
        self.error_label.setVisible(False)
        card.addWidget(self.error_label)
        card.addSpacing(8)

        fields = [
            ("First Name", "John", False, None),
            ("Last Name", "Doe", False, None),
            ("Username", "gamer123", False,
             "4-12 characters, letters and numbers only"),
            ("Email", "you@example.com", False, None),
            ("Password", "••••••••", True,
             "8-32 chars, upper + lower + number + special (!@#$%^&*)"),
            ("Confirm Password", "••••••••", True, None),
        ]

        self.entries = {}
        for label_text, placeholder, secret, hint in fields:
            lbl = QLabel(label_text)
            lbl.setStyleSheet("font-size: 12px;")
            card.addWidget(lbl)
            card.addSpacing(2)

            if hint:
                h = QLabel(hint)
                h.setStyleSheet("color: #888; font-size: 10px;")
                card.addWidget(h)

            entry = QLineEdit()
            entry.setPlaceholderText(placeholder)
            entry.setMinimumHeight(34)
            if secret:
                entry.setEchoMode(QLineEdit.Password)
            card.addWidget(entry)
            card.addSpacing(10)

            self.entries[label_text.lower().replace(" ", "_")] = entry

        # Country
        lbl = QLabel("Country")
        lbl.setStyleSheet("font-size: 12px;")
        card.addWidget(lbl)
        card.addSpacing(2)

        self.country_combo = QComboBox()
        self.country_combo.addItems(COUNTRIES)
        self.country_combo.setCurrentText("US")
        self.country_combo.setMinimumHeight(34)
        card.addWidget(self.country_combo)
        card.addSpacing(10)

        # Date of Birth
        lbl = QLabel("Date of Birth (YYYY-MM-DD)")
        lbl.setStyleSheet("font-size: 12px;")
        card.addWidget(lbl)
        card.addSpacing(2)

        self.dob_edit = QLineEdit()
        self.dob_edit.setPlaceholderText("2000-01-15")
        self.dob_edit.setMinimumHeight(34)
        card.addWidget(self.dob_edit)
        card.addSpacing(10)

        # Terms
        self.terms_check = QCheckBox("I accept the Terms of Use")
        card.addWidget(self.terms_check)
        card.addSpacing(16)

        # Register button
        self.register_btn = QPushButton("Create Account")
        self.register_btn.setMinimumHeight(40)
        self.register_btn.setStyleSheet(
            "QPushButton { background: #4a8cd4; color: white; font-weight: bold; "
            "border-radius: 6px; font-size: 14px; }"
            "QPushButton:hover { background: #5a9ce4; }"
            "QPushButton:disabled { background: #3a5a7a; color: #888; }"
        )
        self.register_btn.clicked.connect(self._do_register)
        card.addWidget(self.register_btn)
        card.addSpacing(12)

        # Back
        back_btn = QPushButton("← Back to Sign In")
        back_btn.setFlat(True)
        back_btn.setCursor(Qt.PointingHandCursor)
        back_btn.setStyleSheet("QPushButton { color: #80a0ff; font-size: 12px; }")
        back_btn.clicked.connect(self.back_requested.emit)
        card.addWidget(back_btn, alignment=Qt.AlignCenter)
        card.addSpacing(16)

        self.form_layout.addStretch()

        # Scroll area setup
        scroll.setWidget(form_container)
        outer = QVBoxLayout(self)
        outer.addWidget(scroll)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _show_error(self, msg: str):
        self.error_label.setText(msg)
        self.error_label.setVisible(True)

    def _hide_error(self):
        self.error_label.setVisible(False)

    def _set_loading(self, loading: bool):
        self.register_btn.setEnabled(not loading)
        self.register_btn.setText("Creating account..." if loading else "Create Account")

    def _do_register(self):
        data = {k: w.text().strip() for k, w in self.entries.items()}
        password = self.entries["password"].text()
        confirm = self.entries["confirm_password"].text()
        country = self.country_combo.currentText()
        dob = self.dob_edit.text().strip()

        if not all(data.values()) or not dob:
            self._show_error("All fields are required.")
            return
        if password != confirm:
            self._show_error("Passwords do not match.")
            return
        if not self.terms_check.isChecked():
            self._show_error("You must accept the Terms of Use.")
            return

        self._set_loading(True)
        self._hide_error()

        try:
            auth_service.register(
                username=data["username"],
                email=data["email"],
                password=password,
                first_name=data["first_name"],
                last_name=data["last_name"],
                country=country,
                date_of_birth=dob,
                accepted_terms=True,
            )
            self._set_loading(False)
            QMessageBox.information(
                self, "Registration Successful",
                "Account created! Please check your email to verify your address "
                "before signing in.",
            )
            self.back_requested.emit()
        except ApiError as e:
            self._set_loading(False)
            self._show_error(str(e))
        except Exception as e:
            self._set_loading(False)
            self._show_error(f"Error: {e}")
