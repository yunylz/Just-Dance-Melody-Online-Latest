"""Authentication service — login, register, session management."""

from __future__ import annotations

import time

from src.api.client import ApiClient, ApiError
from src.utils.storage import session_store


class AuthService:
    """Handles authentication flows against the JDMO Hub API.

    Endpoints implemented (from the Hub API):
      POST /auth/v1/session      — Login, returns a session token
      POST /auth/v1/register     — Register a new account
      POST /auth/v1/forgot-password — Request password reset
      POST /auth/v1/resend-verification — Resend email verification
    """

    def __init__(self, client: ApiClient | None = None):
        from src.api.client import api_client
        self.client = client or api_client

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------
    def login(self, email: str, password: str, remember_me: bool = False) -> dict:
        """Authenticate with email + password.

        Returns the session info dict on success:
            { "success": true, "session": { "token", "username", "userId", "exp", ... } }

        May also return a 2FA challenge:
            { "success": true, "twoFactorRequired": true, "twoFactorToken": "...", ... }
        """
        resp = self.client.post("/auth/v1/session", json={
            "email": email,
            "password": password,
            "rememberMe": remember_me,
        })

        if not resp.ok:
            raise ApiError.from_response(resp)

        body = resp.json()

        # Handle 2FA requirement (staff accounts)
        if body.get("twoFactorRequired"):
            return body  # caller must handle 2FA flow

        session_data = body.get("session")
        if session_data:
            session_store.save_session(
                token=session_data["token"],
                username=session_data["username"],
                user_id=session_data["userId"],
                expires_at=session_data["exp"],
            )
            # Check admin status
            try:
                me = self.client.get("/users/v1/me")
                if me.ok:
                    status = me.json().get("status", {})
                    session_store.is_admin = bool(status.get("admin", False))
            except Exception:
                pass

        return body

    # ------------------------------------------------------------------
    # 2FA verification
    # ------------------------------------------------------------------
    def verify_2fa(self, code: str, two_factor_token: str) -> dict:
        """Complete 2FA verification and receive a full session token."""
        resp = self.client.post("/auth/v1/2fa/verify", json={
            "code": code,
            "twoFactorToken": two_factor_token,
        })

        if not resp.ok:
            raise ApiError.from_response(resp)

        body = resp.json()
        session_data = body.get("session")
        if session_data:
            session_store.save_session(
                token=session_data["token"],
                username=session_data["username"],
                user_id=session_data["userId"],
                expires_at=session_data["exp"],
            )
        return body

    # ------------------------------------------------------------------
    # Register
    # ------------------------------------------------------------------
    def register(
        self,
        username: str,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        country: str,
        date_of_birth: str,  # YYYY-MM-DD
        accepted_terms: bool = True,
        avatar_id: int = 1,
    ) -> dict:
        """Register a new account.

        On success the API returns a confirmation and sends a verification email.
        """
        resp = self.client.post("/auth/v1/register", json={
            "username": username,
            "email": email,
            "password": password,
            "firstName": first_name,
            "lastName": last_name,
            "country": country,
            "dateOfBirth": date_of_birth,
            "acceptedTermsOfUse": accepted_terms,
            "avatarId": avatar_id,
        })

        if not resp.ok:
            raise ApiError.from_response(resp)

        return resp.json()

    # ------------------------------------------------------------------
    # Forgot / Reset password
    # ------------------------------------------------------------------
    def forgot_password(self, email: str) -> dict:
        """Request a password reset email."""
        resp = self.client.post("/auth/v1/forgot-password", json={"email": email})
        if not resp.ok:
            raise ApiError.from_response(resp)
        return resp.json()

    # ------------------------------------------------------------------
    # Resend verification email
    # ------------------------------------------------------------------
    def resend_verification(self, email: str) -> dict:
        """Resend the email-verification email."""
        resp = self.client.post("/auth/v1/resend-verification", json={"email": email})
        if not resp.ok:
            raise ApiError.from_response(resp)
        return resp.json()

    # ------------------------------------------------------------------
    # Logout (client-side only — token invalidation is TBD on server)
    # ------------------------------------------------------------------
    def logout(self):
        session_store.clear()

    # ------------------------------------------------------------------
    # Check if stored session is still valid by hitting a lightweight endpoint
    # ------------------------------------------------------------------
    def validate_session(self) -> bool:
        """Check if the stored token is still valid and update admin status."""
        if not session_store.is_logged_in:
            return False

        try:
            resp = self.client.get("/users/v1/me")
            if resp.ok:
                status = resp.json().get("status", {})
                session_store.is_admin = bool(status.get("admin", False))
                return True
            return False
        except Exception:
            return False


# Singleton
auth_service = AuthService()
