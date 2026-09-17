# JDMO Launcher

JDMO Launcher is a Python GUI app for launching Just Dance 2017 with custom Just Dance Melody Online servers.

Built with `customtkinter` and `requests`. Authenticates against the JDMO Hub API.

## Features

- **Login / Register** — Sign in with your JDMO Hub credentials (supports 2FA for staff accounts)
- **Session persistence** — Tokens stored locally; auto-login on restart
- **Forgot password** — Request a password reset email
- **Game library** — View available games, download, and launch them
- **Modern dark-themed UI** — Built with CustomTkinter

## Project Structure

```
jdmo-launcher/
├── launcher.py               # Entry point
├── requirements.txt
├── README.md
└── src/
    ├── api/
    │   ├── client.py         # HTTP client (requests wrapper)
    │   ├── auth.py           # Auth service (login, register, 2FA)
    │   └── games.py          # Game download / launch service
    ├── ui/
    │   ├── app.py            # Root window, screen transitions
    │   ├── login.py          # Login screen
    │   ├── register.py       # Registration screen
    │   └── main_window.py    # Game library dashboard
    └── utils/
        ├── config.py         # Persistent launcher config
        └── storage.py        # Session token storage
```

## How does it work?

1. Launch the app.
2. Login with your JDMO Hub credentials (or register a new account).
3. Under the **Your Games** section, click **Download** to download Just Dance 2017.
4. Once downloaded, hit **▶ Play** to boot the game.

## Quick Start

```bash
# Create venv & install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run (via venv)
./run.sh

# Or manually:
# source .venv/bin/activate && python launcher.py
```

> **macOS note:** If you get `ModuleNotFoundError: No module named '_tkinter'`, install Tkinter support:
> ```bash
> brew install python-tk@3.14
> ```

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/v1/session` | POST | Login — returns session token |
| `/auth/v1/register` | POST | Create account |
| `/auth/v1/forgot-password` | POST | Request password reset |
| `/auth/v1/resend-verification` | POST | Resend verification email |
| `/auth/v1/2fa/verify` | POST | 2FA verification for staff |
| `/users/v1/me` | GET | Validate stored session |

## Configuration

Stored in `~/.jdmo-launcher/config.json`:
- `api_base_url` — Hub API URL (default: `https://hub.jdmo.xyz`)
- `game_platform` — Target platform (ps3, ps4, wii, wiiu, xbox360, xboxone)
- `remember_me` — Persist login session
# jdmo-launcher
