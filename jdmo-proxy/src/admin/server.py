import asyncio
import json
import os
from pathlib import Path
from typing import List, Optional
import subprocess

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth

from config import (
    OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_AUTHORIZE_URL, 
    OIDC_TOKEN_URL, OIDC_USERINFO_URL, OIDC_LOGOUT_URL, 
    OIDC_REDIRECT_URI, OIDC_CONF_URL, SESSION_SECRET
)

from src import db

app = FastAPI(title="DanceParty Proxy Admin")


oauth = OAuth()
oauth.register(
    name='oidc',
    client_id=OIDC_CLIENT_ID,
    client_secret=OIDC_CLIENT_SECRET,
    authorize_url=OIDC_AUTHORIZE_URL,
    access_token_url=OIDC_TOKEN_URL,
    userinfo_endpoint=OIDC_USERINFO_URL,
    server_metadata_url=OIDC_CONF_URL,
    client_kwargs={'scope': 'openid profile email'},
)

STATE_FILE = Path(__file__).parent.parent.parent / "state.json"
LOG_FILE = Path(__file__).parent.parent.parent / "proxy.log"
UI_DIR = Path(__file__).parent / "ui"

class HostModel(BaseModel):
    domain: str
    target: str = "harbour"
    description: Optional[str] = ""

class ToggleModel(BaseModel):
    enabled: bool

class TestRequestModel(BaseModel):
    proxy_url: str
    hub_url: str
    proxy_secret: str
    username: str
    password: str

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Skip auth for OIDC routes
    if request.url.path in ["/auth/login", "/auth/callback"]:
        return await call_next(request)
    
    # Check session for user
    user = request.session.get('user')
    if not user:
        return RedirectResponse(url='/auth/login')
    
    return await call_next(request)

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
@app.get("/auth/login")
async def login(request: Request):
    return await oauth.oidc.authorize_redirect(request, OIDC_REDIRECT_URI)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.oidc.authorize_access_token(request)
        user = token.get('userinfo')
        if user:
            request.session['user'] = dict(user)
        return RedirectResponse(url='/')
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=400, detail="Authentication failed")

@app.get("/auth/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url=OIDC_LOGOUT_URL)

@app.get("/api/status")
async def get_status():
    state = {"connections": [], "users": []}
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r") as f:
                state = json.load(f)
        except Exception:
            pass
            
    metrics_summary = db.get_metrics_summary()
    recent_metrics = db.get_recent_metrics(limit=50)
    
    return {
        "active_connections": len(state.get("connections", [])),
        "connection_list": state.get("connections", []),
        "active_users_count": len(state.get("users", [])),
        "authenticated_users": state.get("users", []),
        "metrics": metrics_summary,
        "recent_traffic": recent_metrics
    }

@app.get("/api/hosts")
async def get_hosts():
    return db.get_all_hosts()

@app.post("/api/hosts")
async def add_host(host: HostModel):
    success = db.add_host(host.domain, host.target, host.description)
    if not success:
        raise HTTPException(status_code=400, detail="Host already exists")
    return {"status": "ok"}

@app.delete("/api/hosts/{domain:path}")
async def delete_host(domain: str):
    db.delete_host(domain)
    return {"status": "ok"}

@app.post("/api/hosts/{domain:path}/toggle")
async def toggle_host(domain: str, toggle: ToggleModel):
    db.toggle_host(domain, toggle.enabled)
    return {"status": "ok"}

@app.post("/api/test")
async def run_tests(config: TestRequestModel):
    import sys
    cmd = [
        sys.executable, "-m", "pytest", "test_proxy.py", "-v",
        f"--proxy={config.proxy_url}",
        f"--hub={config.hub_url}",
        f"--proxy-secret={config.proxy_secret}",
        f"--username={config.username}",
        f"--password={config.password}"
    ]
    
    # Run pytest asynchronously to avoid blocking the API
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(Path(__file__).parent.parent.parent)
    )
    
    stdout, stderr = await process.communicate()
    
    return {
        "return_code": process.returncode,
        "stdout": stdout.decode(),
        "stderr": stderr.decode()
    }

@app.websocket("/api/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    
    # Check session
    user = websocket.scope.get('session', {}).get('user')
    if not user:
        await websocket.close(code=1008)
        return
    
    if not LOG_FILE.exists():
        with open(LOG_FILE, "w") as f:
            f.write("")
            
    try:
        # Send up to the last 500 lines initially
        try:
            tail_out = subprocess.check_output(["tail", "-n", "500", str(LOG_FILE)]).decode('utf-8', errors='ignore')
            for line in tail_out.splitlines():
                if line.strip():
                    await websocket.send_text(line.strip())
        except Exception as e:
            print(f"Error fetching past logs: {e}")

        with open(LOG_FILE, "r") as f:
            f.seek(0, 2)
            
            while True:
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.5)
                    continue
                await websocket.send_text(line.strip())
    except WebSocketDisconnect:
        print("Client disconnected from logs")
    except Exception as e:
        print(f"Error reading logs: {e}")

# Mount static files for UI
if not UI_DIR.exists():
    UI_DIR.mkdir(parents=True)

app.mount("/assets", StaticFiles(directory=str(UI_DIR), html=True), name="ui")

@app.get("/{full_path:path}")
async def serve_ui(full_path: str):
    index_path = UI_DIR / "index.html"
    if not index_path.exists():
        return {"error": "UI not built yet"}
    return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8375)
