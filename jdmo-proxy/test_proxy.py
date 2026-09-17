#!/usr/bin/env python3
"""
DanceParty Proxy - Auth Test Suite
Usage:
    pip install pytest requests
    pytest test_proxy.py -v \
        --proxy=http://127.0.0.1:4080 \
        --hub=http://127.0.0.1:8455 \
        --proxy-secret=yourproxysecret \
        --username=realuser \
        --password=realpass
"""

import base64
import pytest
import requests
from urllib.parse import quote

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TEST_URL_HTTP  = "http://example.com"
TEST_URL_HTTPS = "https://example.com"


class _Mock407Response:
    """Returned when urllib3 raises ProxyError on a rejected CONNECT tunnel."""
    status_code = 407
    text = "Proxy authentication required"
    headers = {"Proxy-Authenticate": 'Basic realm="DanceParty"'}


def make_request(proxy_url, auth=None, https=False, timeout=10):
    """
    Make a request through the proxy.
    Embeds credentials directly in the proxy URL so they're sent on the
    first attempt (requests' auth= param waits for a 407 challenge first,
    which causes an infinite retry loop with mitmproxy).
    """
    if auth:
        username, password = auth
        proxy_with_auth = proxy_url.replace(
            "://", f"://{quote(username)}:{quote(password)}@"
        )
    else:
        proxy_with_auth = proxy_url

    proxies = {
        "http":  proxy_with_auth,
        "https": proxy_with_auth,
    }
    url = TEST_URL_HTTPS if https else TEST_URL_HTTP
    try:
        return requests.get(
            url,
            proxies=proxies,
            timeout=timeout,
            verify=False,
            allow_redirects=True
        )
    except requests.exceptions.ProxyError as e:
        if "407" in str(e):
            return _Mock407Response()
        raise


# ---------------------------------------------------------------------------
# 1. Hub response tests — call /auth/v1/proxy-verify directly
# ---------------------------------------------------------------------------

class TestHubResponse:

    def test_valid_credentials_returns_allowed_true(self, hub_url, proxy_secret, valid_creds):
        """Hub should return allowed=true for a real account"""
        username, password = valid_creds
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": username, "password": password},
            headers={"x-proxy-secret": proxy_secret},
            timeout=5
        )
        assert r.status_code == 200, f"Hub returned {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("allowed") is True, f"Expected allowed=true, got: {data}"

    def test_invalid_credentials_returns_allowed_false(self, hub_url, proxy_secret):
        """Hub should return allowed=false for a non-existent user"""
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": "doesnotexist", "password": "wrongpass"},
            headers={"x-proxy-secret": proxy_secret},
            timeout=5
        )
        assert r.status_code == 200, f"Hub returned {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("allowed") is False, f"Expected allowed=false, got: {data}"

    def test_wrong_password_returns_allowed_false(self, hub_url, proxy_secret, valid_creds):
        """Hub should return allowed=false when password is wrong for a real user"""
        username, _ = valid_creds
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": username, "password": "completelywrongpassword"},
            headers={"x-proxy-secret": proxy_secret},
            timeout=5
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("allowed") is False, f"Expected allowed=false, got: {data}"

    def test_wrong_proxy_secret_returns_401(self, hub_url, valid_creds):
        """Hub should reject requests with a wrong proxy secret"""
        username, password = valid_creds
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": username, "password": password},
            headers={"x-proxy-secret": "wrongsecret"},
            timeout=5
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_missing_proxy_secret_returns_401(self, hub_url, valid_creds):
        """Hub should reject requests with no proxy secret header"""
        username, password = valid_creds
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": username, "password": password},
            timeout=5
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_response_includes_admin_flag(self, hub_url, proxy_secret, valid_creds):
        """Hub should return the admin flag (a) in the response"""
        username, password = valid_creds
        r = requests.post(
            f"{hub_url}/auth/v1/proxy-verify",
            json={"username": username, "password": password},
            headers={"x-proxy-secret": proxy_secret},
            timeout=5
        )
        data = r.json()
        assert "a" in data, f"Expected 'a' field in response, got: {data}"
        assert data["a"] in (0, 1), f"Expected a=0 or a=1, got: {data['a']}"


# ---------------------------------------------------------------------------
# 2. No auth tests
# ---------------------------------------------------------------------------

class TestNoAuth:

    def test_http_no_auth_returns_407(self, proxy_url):
        """Plain HTTP with no credentials should be rejected"""
        r = make_request(proxy_url, auth=None, https=False)
        assert r.status_code == 407, f"Expected 407, got {r.status_code}"

    def test_https_no_auth_returns_407(self, proxy_url):
        """HTTPS CONNECT with no credentials should be rejected"""
        r = make_request(proxy_url, auth=None, https=True)
        assert r.status_code == 407, f"Expected 407, got {r.status_code}"

    def test_407_includes_proxy_authenticate_header(self, proxy_url):
        """407 must include Proxy-Authenticate header"""
        r = make_request(proxy_url, auth=None, https=False)
        assert "Proxy-Authenticate" in r.headers, "Missing Proxy-Authenticate header"
        assert "Basic" in r.headers["Proxy-Authenticate"]

    def test_407_realm_is_danceparty(self, proxy_url):
        """Proxy-Authenticate realm should be DanceParty"""
        r = make_request(proxy_url, auth=None, https=False)
        assert 'realm="DanceParty"' in r.headers.get("Proxy-Authenticate", "")

    def test_non_basic_scheme_returns_407(self, proxy_url):
        """Bearer token scheme should be rejected"""
        r = requests.get(
            TEST_URL_HTTP,
            proxies={"http": proxy_url},
            headers={"Proxy-Authorization": "Bearer sometoken"},
            timeout=10,
            verify=False
        )
        assert r.status_code == 407

    def test_garbage_base64_returns_407(self, proxy_url):
        """Malformed base64 should be rejected"""
        r = requests.get(
            TEST_URL_HTTP,
            proxies={"http": proxy_url},
            headers={"Proxy-Authorization": "Basic !!!notbase64!!!"},
            timeout=10,
            verify=False
        )
        assert r.status_code == 407

    def test_base64_without_colon_returns_407(self, proxy_url):
        """Base64 with no colon separator should be rejected"""
        no_colon = base64.b64encode(b"usernameonly").decode()
        r = requests.get(
            TEST_URL_HTTP,
            proxies={"http": proxy_url},
            headers={"Proxy-Authorization": f"Basic {no_colon}"},
            timeout=10,
            verify=False
        )
        assert r.status_code == 407


# ---------------------------------------------------------------------------
# 3. Valid auth tests
# ---------------------------------------------------------------------------

class TestValidAuth:

    def test_http_valid_creds_allowed(self, proxy_url, valid_creds):
        r = make_request(proxy_url, auth=valid_creds, https=False)
        assert r.status_code == 200, f"Expected 200, got {r.status_code} — body: {r.text[:200]}"

    def test_https_valid_creds_allowed(self, proxy_url, valid_creds):
        r = make_request(proxy_url, auth=valid_creds, https=True)
        assert r.status_code == 200, f"Expected 200, got {r.status_code} — body: {r.text[:200]}"

    def test_valid_creds_response_has_content(self, proxy_url, valid_creds):
        r = make_request(proxy_url, auth=valid_creds, https=False)
        assert r.status_code == 200
        assert len(r.text) > 0, "Expected response body to have content"

    def test_multiple_requests_same_creds(self, proxy_url, valid_creds):
        """Multiple sequential requests with valid creds should all succeed"""
        for i in range(3):
            r = make_request(proxy_url, auth=valid_creds, https=False)
            assert r.status_code == 200, f"Request {i+1} failed: {r.status_code}"

    def test_connection_cache_reuses_auth(self, proxy_url, valid_creds):
        """
        Second request on same session without auth should still pass
        — proves the per-connection cache is working.
        """
        username, password = valid_creds
        proxy_with_auth = proxy_url.replace(
            "://", f"://{quote(username)}:{quote(password)}@"
        )
        session = requests.Session()
        session.proxies = {"http": proxy_with_auth, "https": proxy_with_auth}
        session.verify = False

        r1 = session.get(TEST_URL_HTTP)
        assert r1.status_code == 200, f"First request failed: {r1.status_code}"

        # Strip auth from proxy URL — cache should carry the connection
        session.proxies = {"http": proxy_url, "https": proxy_url}
        r2 = session.get(TEST_URL_HTTP)
        assert r2.status_code == 200, (
            f"Second request failed ({r2.status_code}) — "
            "connection cache may not be working"
        )


# ---------------------------------------------------------------------------
# 4. Invalid auth tests
# ---------------------------------------------------------------------------

class TestInvalidAuth:

    def test_http_wrong_user_returns_407(self, proxy_url):
        r = make_request(proxy_url, auth=("doesnotexist", "wrongpass"), https=False)
        assert r.status_code == 407, f"Expected 407, got {r.status_code}"

    def test_https_wrong_user_returns_407(self, proxy_url):
        r = make_request(proxy_url, auth=("doesnotexist", "wrongpass"), https=True)
        assert r.status_code == 407, f"Expected 407, got {r.status_code}"

    def test_wrong_password_returns_407(self, proxy_url, valid_creds):
        username, _ = valid_creds
        r = make_request(proxy_url, auth=(username, "completelywrongpassword"), https=False)
        assert r.status_code == 407, f"Expected 407, got {r.status_code}"

    def test_wrong_creds_body_contains_reason(self, proxy_url):
        r = make_request(proxy_url, auth=("doesnotexist", "wrongpass"), https=False)
        assert r.status_code == 407
        assert len(r.text.strip()) > 0, "Expected a reason in the response body"

    def test_empty_username_returns_407(self, proxy_url):
        r = make_request(proxy_url, auth=("", "somepassword"), https=False)
        assert r.status_code == 407

    def test_empty_password_returns_407(self, proxy_url):
        r = make_request(proxy_url, auth=("someuser", ""), https=False)
        assert r.status_code == 407