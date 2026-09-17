<picture>
  <img src="/logo.png" alt="Harbour" width="320">
</picture>

**Harbour** is a Node.js server that re-creates the Ubiservices backend APIs used by Just Dance titles — handling authentication, sessions, profiles, spaces, and more.

This is the implementation used by **Just Dance Melody Online (JDMO)**. [Made by RyuAteler team.](https://ryuatelier.org)

---

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

The server starts on HTTP `:80` and HTTPS `:443` by default.

---

## Requirements

- **Node.js 18+**
- **MongoDB** — app/space/entity registry, Ubiservices session storage
- **Redis** — Harbour session ticket cache
- A running **JDMO Hub** instance — user store, authentication backend, profile management
- TLS certificate pair in `src/certs/` (`key.pem` + `cert.pem`) for HTTPS

---

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URI` | Redis connection string |
| `HUB_API_FQDN` | JDMO Hub base URL |
| `HUB_S2S_TOKEN` | Server-to-server token for Hub auth |
| `UBISERVICES_FQDN` | UbiServices endpoint for console auth verification |
| `PRETENDO_TOKEN_SECRET_KEY` | AES key for WiiU token decryption |
| `PRETENDO_TOKEN_IV` | AES IV for WiiU token decryption |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on changes) |
| `npm start` | Start without nodemon (production) |

---

## Architecture

### Two-Layer Auth

| Layer | What | Where |
|---|---|---|
| **1. Platform Token** | Validates the game client credential (WiiU AES, PSN ticket, Switch JWT, Uplay PC token, …) | `src/lib/auth/*.js` |
| **2. Harbour Ticket** | Validates the JWT-style session ticket issued after login | `src/lib/ticket-client.js` |

### Platforms

| Console | Auth Scheme | Verifies Against | Session Flow |
|---|---|---|---|
| Wii U | `WiiU <aes-token>` | Pretendo Network `/me` | Standard (Hub lookup) |
| PS4 | `PSN2.0 <b64-ticket>` | UbiServices (deferred) | Ubiservices (guest allowed) |
| Nintendo Switch | `Switch <jwt>` | UbiServices (deferred) | Ubiservices (guest allowed) |
| PC (official) | `uplaypc_v1 t=<token>` | UbiServices (deferred) | Ubiservices (guest allowed) |
| PC (cracked) | `uplaypc_v1 t=JDMO:<enc>` | Hub `/auth/v1/verify-ticket` | Standard (Hub lookup) |
| Any (bypass) | `Basic <b64>` | Hub `/auth/v1/session` | Standard (Hub lookup) |

### Service Auto-Loading

Services are discovered at startup by `lib/load-services.js`. The filename `<name>.<version>.js` sets the route prefix — see the [Services Route Table](docs/services/README.md) for the full route table.

### Project Structure

```
src/
├── config.js                # Environment config
├── server.js                # Express bootstrap
├── lib/
│   ├── middleware.js         # verifyAppByHeader, verifyAuth, etc.
│   ├── session-client.js    # Session creation/deletion flow
│   ├── session.js / ticket.js / ticket-client.js  # Harbour ticket system
│   ├── hub-helper.js        # Hub API client
│   ├── ubiservices.js       # UbiServices API client
│   ├── pretendo.js          # Pretendo Network client
│   ├── http-codes.js        # Error code definitions
│   ├── games.js             # App/space/entity registry
│   └── auth/                # Platform auth handlers
│       ├── wiiu.js, psn2.js, switch.js
│       ├── pc.js, pc-crack.js, basic.js
├── data/
│   └── platforms.js         # Platform definitions
├── services/                # Auto-discovered API routes
└── public/                  # Static files (dashboard, assets)
```

### Status Endpoint

A UbiServices-style health check is available at [`/v1/status`](/v1/status):

```
GET /v1/status          → resource list + server metadata
GET /v1/status/applications         → apps DB health
GET /v1/status/connections          → all external services ping
GET /v1/status/...                  → any subsystem
```

---

## Docs

Comprehensive documentation — auth flows, session creation, middleware pipeline, external services, error codes — is available in [`docs/`](docs/) or served at `/docs/` on local/dev environments.

---

## License

All rights and ownership belongs to RyuAtelier.