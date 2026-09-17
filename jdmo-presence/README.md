# JDMO Presence

A lightweight cross-platform system tray app that syncs your in-game status to Discord Rich Presence.

## Stack

| Purpose | Library |
|---|---|
| Tray icon + menu | `pystray` + `Pillow` |
| API polling | `httpx` |
| Discord Rich Presence | `pypresence` |
| Auto-update | custom (`httpx` + shell helper) |
| Bundling | `PyInstaller` |

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure

Edit `jdmo_presence/config.py`:

```python
API_BASE_URL = "https://yourapi.com"       # your real API base URL
DISCORD_CLIENT_ID = "000000000000000000"   # from discord.com/developers/applications
```

### 3. Discord application

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Copy the **Application ID** → paste as `DISCORD_CLIENT_ID`
4. Under **Rich Presence → Art Assets**, upload your logo as `jdmo_logo`

### 4. Run (dev)

```bash
python run.py
```

---

## API contract

The app expects the following from your API:

### Auth
```
POST /presence/v1/auth/login
Body: { "email": "...", "password": "..." }
Response: { "token": "..." }
```

### Status (polled every 15 seconds)
```
GET /presence/v1/status
Headers: Authorization: Bearer <token>
Response:
{
  "playing": true,
  "menu": "Main Menu",      // current screen/menu
  "song": "Song Title",     // optional: current song
  "details": "Extra info"   // optional: extra presence line
}
```

### Version check
```
GET /presence/v1/version
Response:
{
  "version": "1.1.0",
  "download_url": "https://..."
}
```

---

## Building a distributable

```bash
# Install PyInstaller
pip install pyinstaller

# Build (produces dist/JDMOPresence or dist/JDMO Presence.app on macOS)
pyinstaller jdmo_presence.spec
```

Build on each target platform separately (Windows → .exe, macOS → .app, Linux → binary).

---

## Tray menu

```
Status: ♪ Song Title       ← live, greyed out
Account: user@email.com    ← greyed out
─────────────────────────
⬆ Update to 1.1.0          ← only shown when update available
─────────────────────────
Logout
Quit
```

---

## Project structure

```
jdmo-presence/
├── run.py                      # launcher / PyInstaller entry
├── requirements.txt
├── jdmo_presence.spec          # PyInstaller build config
├── assets/
│   ├── icon.png                # tray icon (replace placeholder)
│   ├── icon.ico                # Windows
│   └── icon.icns               # macOS
└── jdmo_presence/
    ├── __init__.py
    ├── __main__.py
    ├── app.py                  # orchestration + tray icon
    ├── api.py                  # API client (auth, status, version)
    ├── config.py               # constants + token storage
    ├── discord_handler.py      # Discord Rich Presence
    ├── login_dialog.py         # Tkinter login popup
    └── updater.py              # auto-update logic
```
