import hashlib
import logging
from cachetools import TTLCache
import httpx
from mitmproxy import http
import base64

logger = logging.getLogger(__name__)

# TTL Cache for successful authentications
# Key: username, Value: SHA256(password)
# TTL: 300 seconds (5 minutes)
_auth_cache = TTLCache(maxsize=1000, ttl=300)

def _hash_password(password: str) -> str:
    """Returns a SHA-256 hash of the password to avoid storing it in plaintext."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def is_cached_and_valid(username: str, password: str) -> bool:
    """Check if the user is in the TTL cache and the password matches."""
    cached_hash = _auth_cache.get(username)
    if cached_hash:
        return cached_hash == _hash_password(password)
    return False

def cache_user(username: str, password: str) -> None:
    """Store the user and hashed password in the TTL cache."""
    _auth_cache[username] = _hash_password(password)

async def verify_hub_credentials(username: str, password: str, hub_url: str, proxy_secret: str) -> tuple[bool, str]:
    """
    Asynchronously call Hub's /auth/v1/proxy-verify endpoint.
    Returns (allowed: bool, reason: str).
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{hub_url}/auth/v1/proxy-verify",
                json={"username": username, "password": password},
                headers={"x-proxy-secret": proxy_secret},
                timeout=5.0
            )
            resp.raise_for_status()
            data = resp.json()
            allowed = data.get("allowed", False)
            reason = data.get("reason", "INVALID_CREDENTIALS")
            return allowed, reason
    except httpx.TimeoutException:
        logger.error("[AUTH] Hub request timed out")
        return False, "HUB_TIMEOUT"
    except Exception as e:
        logger.error(f"[AUTH] Hub request failed: {e}")
        return False, "HUB_ERROR"

def parse_proxy_auth(flow: http.HTTPFlow) -> tuple[str, str] | None:
    """
    Parse the Proxy-Authorization header.
    Returns (username, password) or None if missing/malformed.
    """
    auth_header = flow.request.headers.get("Proxy-Authorization", "")
    if not auth_header.startswith("Basic "):
        return None
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, _, password = decoded.partition(":")
        if not username or not password:
            return None
        return username, password
    except Exception:
        return None

def make_407_response(reason: str = "Proxy authentication required") -> http.Response:
    """Returns a 407 Proxy Authentication Required response."""
    return http.Response.make(
        status_code=407,
        content=reason.encode(),
        headers={
            "Proxy-Authenticate": 'Basic realm="DanceParty"',
            "Content-Type": "text/plain"
        }
    )

def get_active_users() -> list[str]:
    """Return a list of currently authenticated (cached) users."""
    return list(_auth_cache.keys())
