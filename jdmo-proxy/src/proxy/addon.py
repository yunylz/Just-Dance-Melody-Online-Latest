import json
import logging
import sys
from pathlib import Path
from mitmproxy import http, tls
import time

# Add project root to sys.path so config and src can be imported
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import HRBR_DOMAIN, PRETENDO_DOMAIN, HUB_URL, PROXY_SECRET, REQUIRE_AUTH
from src import db
from src.proxy import auth, router

# Configure logging to write to proxy.log
LOG_FILE = Path(__file__).parent.parent.parent / "proxy.log"

root_logger = logging.getLogger()
# Ensure we don't add multiple file handlers if mitmproxy reloads the addon
if not any(isinstance(h, logging.FileHandler) and h.baseFilename == str(LOG_FILE) for h in root_logger.handlers):
    file_handler = logging.FileHandler(str(LOG_FILE))
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
logger = logging.getLogger(__name__)

STATE_FILE = Path(__file__).parent.parent.parent / "state.json"
_active_connections = {} # conn_id -> client_address
_active_users = set() # usernames

def _dump_state():
    try:
        with open(STATE_FILE, "w") as f:
            json.dump({
                "connections": list(_active_connections.values()),
                "users": list(auth.get_active_users())
            }, f)
    except Exception as e:
        logger.error(f"Failed to dump state: {e}")

class DancePartyAddon:
    def __init__(self):
        self.hosts = {}
        self.last_host_refresh = 0

    def _get_target_for_domain(self, domain: str) -> str | None:
        """Get target from DB cache. Refreshes every 5 seconds."""
        now = time.time()
        if now - self.last_host_refresh > 5:
            self.hosts = db.get_active_hosts()
            self.last_host_refresh = now
        return self.hosts.get(domain)

    async def request(self, flow: http.HTTPFlow) -> None:
        client_address = str(flow.client_conn.peername)

        # 1. Authentication
        if REQUIRE_AUTH:
            creds = auth.parse_proxy_auth(flow)
            if creds is None:
                logger.info(f"[AUTH] {client_address} - No credentials, sending 407")
                flow.response = auth.make_407_response()
                return

            username, password = creds

            # Check TTL cache
            if auth.is_cached_and_valid(username, password):
                logger.debug(f"[AUTH] {client_address} - {username} allowed (TTL cache hit)")
                _active_users.add(username)
                _dump_state()
            else:
                # Validate against Hub asynchronously
                logger.info(f"[AUTH] {client_address} - Validating {username} against Hub")
                allowed, reason = await auth.verify_hub_credentials(username, password, HUB_URL, PROXY_SECRET)
                if not allowed:
                    logger.warning(f"[AUTH] {client_address} - {username} denied: {reason}")
                    flow.response = auth.make_407_response(reason)
                    return
                
                logger.info(f"[AUTH] {client_address} - {username} authenticated successfully")
                auth.cache_user(username, password)
                _active_users.add(username)
                _dump_state()
        else:
            # Authentication is disabled
            pass

        # 2. Routing
        host = flow.request.pretty_host
        path = flow.request.path
        method = flow.request.method

        logger.info(f"[REQUEST] {client_address} -> {method} {host}{path}")

        # Pretendo Service Token
        if host == PRETENDO_DOMAIN and path.startswith('/v1/api/provider/service_token/@me') and method in ['GET', 'POST']:
            logger.info(f"[PROXY] Pretendo service token -> {HRBR_DOMAIN}")
            router.proxy_to_harbour(flow, HRBR_DOMAIN)
            return

        if host == PRETENDO_DOMAIN:
            return



        # Check Dynamic Hosts from DB
        target = self._get_target_for_domain(host)
        if target:
            target_domain = HRBR_DOMAIN if target == 'harbour' else target
            logger.info(f"[PROXY] Dynamic domain {host} -> {target_domain}")
            router.proxy_to_harbour(flow, target_domain)
            return

        logger.info(f"[FORWARD] {host} -> Original destination")

    def response(self, flow: http.HTTPFlow) -> None:
        host = flow.request.pretty_host
        status = flow.response.status_code if flow.response else 0
        
        # Record metric
        # We record async or fire-and-forget for performance
        db.record_metric(host, flow.request.method, status, int((flow.response.timestamp_end - flow.request.timestamp_start) * 1000) if flow.response else 0)

        if host == PRETENDO_DOMAIN and flow.request.path.startswith('/v1/api/provider/service_token/@me'):
            logger.info(f"[RESPONSE] Pretendo service token: {status}")
        elif host == PRETENDO_DOMAIN:
            logger.info(f"[RESPONSE] Pretendo (other): {status}")
        elif self._get_target_for_domain(host):
            logger.info(f"[RESPONSE] Dynamic {host}: {status}")


    def tls_clienthello(self, data: tls.ClientHelloData) -> None:
        server_name = data.context.client.sni or ""
        
        domains_to_intercept = (
            server_name == PRETENDO_DOMAIN or

            self._get_target_for_domain(server_name) is not None
        )

        if domains_to_intercept:
            logger.info(f"[TLS] INTERCEPTING: {server_name}")
            data.ignore_connection = False
            data.establish_server_tls_first = False
        else:
            logger.info(f"[TLS] TUNNELING: {server_name}")
            data.ignore_connection = True

    def tcp_start(self, flow) -> None:
        conn_id = str(flow.client_conn.id)
        client = str(flow.client_conn.peername)
        _active_connections[conn_id] = client
        _dump_state()
        logger.info(f"[TCP START] Client {client}")

    def tcp_end(self, flow) -> None:
        conn_id = str(flow.client_conn.id)
        if conn_id in _active_connections:
            del _active_connections[conn_id]
            _dump_state()

    def tcp_error(self, flow) -> None:
        conn_id = str(flow.client_conn.id)
        if conn_id in _active_connections:
            del _active_connections[conn_id]
            _dump_state()

addons = [
    DancePartyAddon()
]
