import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "proxy.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create hosts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT UNIQUE NOT NULL,
            target TEXT NOT NULL,
            enabled BOOLEAN DEFAULT 1,
            description TEXT
        )
    """)
    
    # Create metrics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            domain TEXT NOT NULL,
            method TEXT NOT NULL,
            status_code INTEGER,
            response_time_ms INTEGER
        )
    """)
    
    # Seed default hosts if empty
    cursor.execute("SELECT COUNT(*) FROM hosts")
    if cursor.fetchone()[0] == 0:
        # Load from config.py defaults (will be replaced by actual config)
        us_domains = [
            'public-ubiservices.ubi.com',
            'msr-public-ubiservices.ubi.com',
            'dev-api-ubiservices.ubi.com',
            'api-ubiservices.ubi.com',
            'msr-dev-api-ubiservices.ubi.com',
            'msr-api-ubiservices.ubi.com',
            'msr-ubiservices.ubi.com',
            'ubiservices.ubi.com'
        ]
        
        # We assume the target is HRBR_DOMAIN, but we'll store it as 'harbour' keyword
        # or we can leave target empty to use default config HRBR_DOMAIN
        for domain in us_domains:
            cursor.execute(
                "INSERT INTO hosts (domain, target, description) VALUES (?, ?, ?)",
                (domain, "harbour", "Default Ubisoft Domain")
            )
        conn.commit()
        
    conn.close()

def get_active_hosts():
    """Returns a dictionary of domain -> target for all enabled hosts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT domain, target FROM hosts WHERE enabled = 1")
    hosts = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return hosts

def add_host(domain: str, target: str, description: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO hosts (domain, target, description) VALUES (?, ?, ?)",
            (domain, target, description)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def delete_host(domain: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM hosts WHERE domain = ?", (domain,))
    conn.commit()
    conn.close()

def toggle_host(domain: str, enabled: bool):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE hosts SET enabled = ? WHERE domain = ?", (1 if enabled else 0, domain))
    conn.commit()
    conn.close()

def get_all_hosts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, domain, target, enabled, description FROM hosts")
    hosts = [
        {"id": row[0], "domain": row[1], "target": row[2], "enabled": bool(row[3]), "description": row[4]}
        for row in cursor.fetchall()
    ]
    conn.close()
    return hosts

def record_metric(domain: str, method: str, status_code: int, response_time_ms: int):
    # For performance, metrics could be batched, but direct insert is fine for now
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO metrics (domain, method, status_code, response_time_ms) VALUES (?, ?, ?, ?)",
        (domain, method, status_code, response_time_ms)
    )
    conn.commit()
    conn.close()

def get_recent_metrics(limit: int = 100):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT timestamp, domain, method, status_code, response_time_ms FROM metrics ORDER BY timestamp DESC LIMIT ?",
        (limit,)
    )
    metrics = [
        {"timestamp": row[0], "domain": row[1], "method": row[2], "status_code": row[3], "response_time_ms": row[4]}
        for row in cursor.fetchall()
    ]
    conn.close()
    return metrics

def get_metrics_summary():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM metrics")
    total_requests = cursor.fetchone()[0]
    
    # Get requests in last 24h
    cursor.execute("SELECT COUNT(*) FROM metrics WHERE timestamp >= datetime('now', '-1 day')")
    requests_24h = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total_requests": total_requests,
        "requests_24h": requests_24h
    }

# Initialize DB on module import
init_db()
