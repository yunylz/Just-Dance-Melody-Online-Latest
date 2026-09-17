"""HTTP API client for communicating with the JDMO Hub API."""

from __future__ import annotations

import json
import time

import requests

from src.utils.config import config
from src.utils.storage import session_store


class ApiError(Exception):
    """Raised when the API returns a non-success response."""

    def __init__(self, message: str, code: int | None = None, status: int | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status

    @classmethod
    def from_response(cls, resp: requests.Response) -> "ApiError":
        try:
            body = resp.json()
            message = body.get("message", resp.reason or "Unknown error")
            code = body.get("code")
        except (json.JSONDecodeError, ValueError):
            message = resp.reason or "Unknown error"
            code = None
        return cls(message, code=code, status=resp.status_code)

    def __str__(self):
        return self.message


class ApiClient:
    """Low-level HTTP client for the JDMO Hub REST API."""

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or config.api_base_url).rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "UbiServices_SDK_JDMO_Launcher",
            "Accept": "application/json",
            "Content-Type": "application/json",
        })

    def _headers(self) -> dict:
        """Inject Authorization header if a session token is available."""
        h = {}
        token = session_store.token
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        headers = self._headers()
        if "headers" in kwargs:
            headers.update(kwargs.pop("headers"))
        resp = self._session.request(method, url, headers=headers, **kwargs)
        return resp

    def get(self, path: str, **kwargs) -> requests.Response:
        return self._request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> requests.Response:
        return self._request("POST", path, **kwargs)

    def patch(self, path: str, **kwargs) -> requests.Response:
        return self._request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs) -> requests.Response:
        return self._request("DELETE", path, **kwargs)


# Shared singleton instance
api_client = ApiClient()
