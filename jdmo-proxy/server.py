#!/usr/bin/env python3
"""
DanceParty Proxy Server Launcher - Starts the proxy with proper configuration.
"""

import sys
import subprocess
import logging
import os
from pathlib import Path

import config

# Configure logging for the launcher
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - SERVER - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


def main():
    """Launch the proxy server and the admin panel."""
    script_dir = Path(__file__).parent.absolute()
    addon_script = script_dir / "src" / "proxy" / "addon.py"
    admin_script = script_dir / "src" / "admin" / "server.py"
    
    if not addon_script.exists():
        logger.error(f"Addon script not found at {addon_script}")
        sys.exit(1)

    mitm_cmd = [
        'mitmdump',
        '-s', str(addon_script),
        '--listen-host', '0.0.0.0',
        '--listen-port', str(config.PORT),
        '--set', 'block_global=false',
        '--set', 'ssl_insecure=true',
        '--set', 'tls_version_client_min=UNBOUNDED',
        '--set', 'tls_version_server_min=UNBOUNDED'
    ]
    
    admin_cmd = [
        sys.executable, '-m', 'src.admin.server'
    ]

    logger.info("Starting DanceParty Proxy Server & Admin Panel...")
    logger.info(f"Proxy Port: {config.PORT}")
    logger.info("Admin Port: 8080")
    logger.info("Press Ctrl+C to stop both servers")
    logger.info("=" * 60)
    
    processes = []
    try:
        # Start Admin Panel
        admin_proc = subprocess.Popen(admin_cmd)
        processes.append(admin_proc)
        
        # Start Mitmdump
        mitm_proc = subprocess.Popen(mitm_cmd)
        processes.append(mitm_proc)
        
        # Wait for either to exit
        while True:
            for p in processes:
                if p.poll() is not None:
                    raise KeyboardInterrupt
            subprocess.time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("\nStopping servers...")
        for p in processes:
            p.terminate()
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
    except FileNotFoundError as e:
        logger.error(f"Executable not found: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import time # Needed for sleep
    subprocess.time = time
    main()