# DanceParty Proxy - Setup & Admin Guide

The DanceParty Proxy is a custom `mitmproxy`-based server designed to intercept specific Wii U HTTPS traffic and redirect it to a custom Harbour server. It includes a built-in, real-time web Admin Panel.

## Features
- **Dynamic Routing**: Intercepts Pretendo and Ubisoft requests and forwards them to a Harbour server.

- **Premium Admin Panel**: Real-time dashboard, live log streaming, and dynamic host management accessible via a sleek web UI.
- **Secure Authentication**: Asynchronous, TTL-cached Hub authentication with SHA-256 password hashing.

---

## 🚀 Quick Start (Docker Compose)

### 1. Configuration
Create a `.env` file in the project directory:
```env
PORT=3128
HRBR_DOMAIN=hrbr.ryuatelier.org
PRETENDO_DOMAIN=account.pretendo.cc
HUB_URL=http://your-hub-server:3000
PROXY_SECRET=your_proxy_secret
```
*(Note: `US_DOMAINS` are no longer managed here. They are now managed dynamically via the Admin Panel).*

### 2. Initialize Database (Required for Docker)
To persist your settings, create an empty SQLite file before running docker:
```bash
touch proxy.db
```

### 3. Build and Start
```bash
docker-compose up -d --build
```

### 4. Access the Web Admin Panel
Open your browser and navigate to:
```
http://localhost:8080
```
From here you can:
- See real-time active users and connections
- Add/Remove Ubisoft or Custom domains to intercept dynamically
- View live proxy logs
- Run the Pytest suite

---

## 💻 Manual Setup (PM2 or Python)

If you don't want to use Docker, you can run the proxy directly on your host machine.

### 1. Install Dependencies
Ensure you have Python 3.10+ installed.
```bash
pip3 install -r requirements.txt
```

### 2. Run the Server
The entrypoint for the entire application is `server.py`. It launches both the Mitmproxy engine and the FastAPI Admin Panel simultaneously.

```bash
python3 server.py
```
*(Press `Ctrl+C` to gracefully shut down both services).*

### 3. Running with PM2 (Recommended for Production)
If you are managing this with PM2, simply use the provided ecosystem file:
```bash
pm2 start ecosystem.config.js
pm2 save
```
Logs can be viewed via `pm2 logs dp-proxy` or via the web Admin Panel.

---

## ⚙️ How it Works

### The Dual-Process Architecture
When you run `server.py`, it spins up two separate processes:
1. **Mitmproxy (`src/proxy/addon.py`)**: Runs on port `3128`. This handles the actual network traffic decryption and HTTPS forwarding.
2. **Uvicorn FastAPI (`src/admin/server.py`)**: Runs on port `8080`. This serves the Web UI (`src/admin/ui/index.html`) and provides the REST API/WebSockets.

Both processes communicate by sharing a local SQLite database (`proxy.db`) for dynamic configuration and a lightweight `state.json` file for real-time active connection tracking.

### Host Management
By default, the proxy is seeded with a standard list of Ubisoft domains (`public-ubiservices.ubi.com`, etc). You can view, disable, or add new domains directly from the **Hosts** tab in the Admin Panel without needing to restart the proxy.



---

## 🛠 Troubleshooting

**Admin Panel is showing "No connections" but traffic is flowing:**
Ensure both the proxy and the admin panel processes have write-access to the root directory so they can update and read `state.json`.

**Address already in use:**
If port `3128` or `8080` is in use, modify `config.py` (or your `.env`) for the proxy port, and edit `server.py` and `docker-compose.yml` to change the admin panel port.

**Running the test suite from the UI fails:**
Ensure `pytest` is installed (`pip install pytest`) and is available in the `PATH` of the process running `server.py`.