#!/usr/bin/env python3
"""
Configuration loader for DanceParty Proxy Server.
Loads configuration from .env file with fallback defaults.
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Load configuration with defaults
PORT = int(os.getenv('PORT', '3128'))
HRBR_DOMAIN = os.getenv('HRBR_DOMAIN', 'hrbr.ryuatelier.org')
PRETENDO_DOMAIN = os.getenv('PRETENDO_DOMAIN', 'account.pretendo.cc')

# Hub auth configuration
HUB_URL = os.getenv('HUB_URL', 'http://127.0.0.1:3000')
PROXY_SECRET = os.getenv('PROXY_SECRET', '')
REQUIRE_AUTH = os.getenv('REQUIRE_AUTH', 'true').lower() == 'true'

# OIDC Configuration
OIDC_CLIENT_ID = os.getenv('OIDC_CLIENT_ID', '')
OIDC_CLIENT_SECRET = os.getenv('OIDC_CLIENT_SECRET', '')
OIDC_AUTHORIZE_URL = os.getenv('OIDC_AUTHORIZE_URL', '')
OIDC_TOKEN_URL = os.getenv('OIDC_TOKEN_URL', '')
OIDC_USERINFO_URL = os.getenv('OIDC_USERINFO_URL', '')
OIDC_LOGOUT_URL = os.getenv('OIDC_LOGOUT_URL', '')
OIDC_REDIRECT_URI = os.getenv('OIDC_REDIRECT_URI', '')
OIDC_CONF_URL = os.getenv('OIDC_CONF_URL', '')
SESSION_SECRET = os.getenv('SESSION_SECRET', PROXY_SECRET)

# Validate configuration
if not HRBR_DOMAIN:
    raise ValueError("HRBR_DOMAIN cannot be empty")

if not PRETENDO_DOMAIN:
    raise ValueError("PRETENDO_DOMAIN cannot be empty")

if not (1 <= PORT <= 65535):
    raise ValueError(f"PORT must be between 1 and 65535, got {PORT}")

if not PROXY_SECRET:
    raise ValueError("PROXY_SECRET cannot be empty")

if not HUB_URL:
    raise ValueError("HUB_URL cannot be empty")

# Optional: Print loaded configuration for debugging
if __name__ == "__main__":
    print("Configuration loaded:")
    print(f"PORT: {PORT}")
    print(f"HRBR_DOMAIN: {HRBR_DOMAIN}")
    print(f"PRETENDO_DOMAIN: {PRETENDO_DOMAIN}")
    print(f"HUB_URL: {HUB_URL}")
    print(f"PROXY_SECRET configured: {'Yes' if PROXY_SECRET else 'No'}")
    print(f"OIDC configured: {'Yes' if OIDC_CLIENT_ID else 'No'}")