"""JDMO Presence - API client."""

import httpx
from . import config


class APIError(Exception):
    pass


class AuthError(APIError):
    pass


class EmailNotVerifiedError(AuthError):
    """Raised when the account email has not been verified yet."""


class AccountStatusError(AuthError):
    """Raised for inactive/locked/banned accounts."""


class TwoFactorRequiredError(AuthError):
    """Raised when 2FA is required. Carries the temporary 2FA token and setup flag."""

    def __init__(self, message: str, two_factor_token: str = "", setup_required: bool = False):
        super().__init__(message)
        self.two_factor_token = two_factor_token
        self.setup_required = setup_required


class RateLimitedError(AuthError):
    """Raised when too many auth attempts have been made."""


# Map Hub API error codes to our exception types
_HUB_ERROR_MAP: dict[int, tuple[type[AuthError], str]] = {
    11: (AuthError, "Invalid email or password."),
    27: (EmailNotVerifiedError, "Email not verified. Check your inbox (and spam folder) for a verification link."),
    28: (AccountStatusError, "Your account is inactive. Please contact support."),
    29: (AccountStatusError, "Your account is locked. Please contact support."),
    30: (AccountStatusError, "Your account is banned. Please contact support."),
    71: (RateLimitedError, "Too many login attempts. Please try again later."),
    86: (TwoFactorRequiredError, "Two-factor authentication is required but not yet supported in this client."),
}


class APIClient:
    def __init__(self):
        self._token: str | None = None
        self._user_email: str | None = None
        self._user_id: str | None = None
        self._username: str | None = None
        self._http = httpx.Client(base_url=config.API_BASE_URL, timeout=10)

        # Restore saved session
        stored = config.load_token()
        if stored:
            self._token = stored.get("token")
            self._user_email = stored.get("email")
            self._user_id = stored.get("userId")
            self._username = stored.get("username")

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def login(self, email: str, password: str, remember_me: bool = False) -> None:
        """Authenticate with the Hub API. Raises AuthError (or subclass) on failure."""
        try:
            resp = self._http.post(
                "/auth/v1/session",
                json={"email": email, "password": password, "rememberMe": remember_me},
            )
        except httpx.RequestError as e:
            raise APIError(f"Network error: {e}") from e

        # Successful login
        if resp.is_success:
            data = resp.json()

            # Check for 2FA requirement
            if data.get("twoFactorRequired"):
                raise TwoFactorRequiredError(
                    "Two-factor authentication is required.",
                    two_factor_token=data.get("twoFactorToken", ""),
                    setup_required=data.get("setupRequired", False),
                )

            session_data = data.get("session")
            if not session_data or not session_data.get("token"):
                raise APIError("API returned success but no session token found.")

            self._token = session_data["token"]
            self._user_email = email
            self._user_id = session_data.get("userId")
            self._username = session_data.get("username")

            config.save_token({
                "token": self._token,
                "email": email,
                "userId": self._user_id,
                "username": self._username,
            })
            return

        # Parse Hub-style structured error response
        try:
            err_body = resp.json()
            err_code = err_body.get("code")
            err_msg = err_body.get("message", "Login failed.")
        except Exception:
            err_code = None
            err_msg = resp.text or "Login failed."

        # Map known error codes
        if err_code and err_code in _HUB_ERROR_MAP:
            exc_cls, default_msg = _HUB_ERROR_MAP[err_code]
            raise exc_cls(err_msg)

        # Fallback by HTTP status
        if resp.status_code == 401:
            raise AuthError(err_msg or "Invalid email or password.")
        if resp.status_code == 429:
            raise RateLimitedError(err_msg or "Too many requests. Please try again later.")

        raise APIError(f"Login failed ({resp.status_code}): {err_msg}")

    def logout(self) -> None:
        self._token = None
        self._user_email = None
        self._user_id = None
        self._username = None
        config.clear_token()

    def verify_2fa(self, code: str, two_factor_token: str) -> None:
        """
        Complete 2FA verification with a TOTP code.

        On success, sets the session token (same as a normal login).
        Raises AuthError (or subclass) on failure.
        """
        try:
            resp = self._http.post(
                "/auth/v1/2fa/verify",
                json={"code": code, "twoFactorToken": two_factor_token},
            )
        except httpx.RequestError as e:
            raise APIError(f"Network error: {e}") from e

        if resp.is_success:
            data = resp.json()
            session_data = data.get("session")
            if not session_data or not session_data.get("token"):
                raise APIError("2FA verification succeeded but no session token returned.")

            self._token = session_data["token"]
            self._user_id = session_data.get("userId")
            self._username = session_data.get("username")
            # email was already set from the initial login attempt

            config.save_token({
                "token": self._token,
                "email": self._user_email or "",
                "userId": self._user_id,
                "username": self._username,
            })
            return

        # Parse Hub-style structured error response
        try:
            err_body = resp.json()
            err_code = err_body.get("code")
            err_msg = err_body.get("message", "2FA verification failed.")
        except Exception:
            err_code = None
            err_msg = resp.text or "2FA verification failed."

        # Map known error codes
        if err_code == 87:
            raise AuthError("Invalid 2FA code. Please try again.")
        if err_code == 89:
            raise TwoFactorRequiredError("2FA is not enabled for this account.")
        if err_code and err_code in _HUB_ERROR_MAP:
            exc_cls, default_msg = _HUB_ERROR_MAP[err_code]
            raise exc_cls(err_msg)

        if resp.status_code == 401:
            raise AuthError(err_msg or "Invalid or expired 2FA token.")
        if resp.status_code == 429:
            raise RateLimitedError(err_msg or "Too many requests. Please try again later.")

        raise APIError(f"2FA verification failed ({resp.status_code}): {err_msg}")

    @property
    def is_logged_in(self) -> bool:
        return self._token is not None

    @property
    def email(self) -> str | None:
        return self._user_email

    @property
    def user_id(self) -> str | None:
        return self._user_id

    @property
    def username(self) -> str | None:
        return self._username

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    def get_status(self) -> dict | None:
        """
        Fetch player status.

        Expected response shape (adjust once your API is ready):
        {
            "playing": true,
            "menu": "Main Menu",       // current menu/screen
            "song": "Song Title",      // current song if applicable
            "details": "Some detail"   // extra line for Discord presence
        }

        Returns None if the request fails gracefully (e.g. not connected).
        Raises AuthError if the token is rejected (401).
        """
        if not self._token:
            return None

        try:
            resp = self._http.get(
                config.API_STATUS_ENDPOINT,
                headers={"Authorization": f"Bearer {self._token}"},
            )
        except httpx.RequestError:
            return None  # network blip — silently skip this poll

        if resp.status_code == 401:
            raise AuthError("Session expired. Please log in again.")
        if not resp.is_success:
            return None

        return resp.json()

    # ------------------------------------------------------------------
    # Version check
    # ------------------------------------------------------------------

    def get_latest_version(self) -> dict | None:
        """
        Check for updates.

        Expected response shape:
        {
            "version": "1.1.0",
            "download_url": "https://..."
        }
        """
        try:
            resp = self._http.get(config.API_VERSION_ENDPOINT, timeout=5)
            if resp.is_success:
                return resp.json()
        except httpx.RequestError:
            pass
        return None
