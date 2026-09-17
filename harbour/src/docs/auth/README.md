# Auth System

Harbour's authentication has two independent layers that stack on top of each other depending on the route:

```
Layer 2 ── Harbour Ticket ── ticketRequired()
  Validates the session JWT issued by Harbour.
  Proves "this request belongs to an authenticated session."
  Used by most data routes (profiles, spaces, tracking, …).

Layer 1 ── Platform Token ── verifyAuth()
  Validates the credential from the game console / client.
  Proves "this user owns this platform account."
  Used only by the session creation route (POST /sessions).
```

## Route Middleware Chain

A typical protected route applies middleware in this order:

```
Request
  │
  ├─ 1. verifyAppByHeader   →  Resolves app + platform from Ubi-AppId
  ├─ 2. verifyUserAgent     →  Validates User-Agent (skipped in dev)
  ├─ 3. verifyBuildId       →  Validates Ubi-AppBuildId (skipped in dev)
  ├─ 4. verifyAuth          →  Validates platform credential token
  │                            (only on POST /sessions)
  │
  └─ (after session creation, subsequent requests use:)
  ├─ 5. ticketRequired      →  Validates the Harbour session JWT
  └─ 6. handler             →  Route logic
```

## Auth Types & Handlers

| `Authorization` scheme | Platform | Handler | Verifies against |
|---|---|---|---|
| `WiiU <aes-token>` | Wii U | `lib/auth/wiiu.js` | Pretendo Network `/v1/api/people/@me/profile` |
| `PSN2.0 <b64-ticket>` | PS4 | `lib/auth/psn2.js` | Local parsing (Sony has no public verify API); forwards to UbiServices |
| `Switch <jwt>` | Nintendo Switch | `lib/auth/switch.js` | Local JWT structural validation; forwards to UbiServices |
| `uplaypc_v1 t=JDMO:<enc>` | PC (cracked) | `lib/auth/pc-crack.js` | Hub's `/auth/v1/verify-ticket` endpoint (decrypts + validates) |
| `uplaypc_v1 t=<token>` | PC (official) | `lib/auth/pc.js` | Forwards to UbiServices (actual verification deferred to session flow) |
| `Basic <b64>` | Any (bypass) | `lib/auth/basic.js` | Hub's `/auth/v1/session` (email + password login) |

## Session Creation Flow

After `verifyAuth`, control passes to `session-client.js` which routes based on platform:

```
POST /v3/profiles/sessions
  │
  ├─ verifyAppByHeader    →  req.platform = { id: "nx"|"ps4"|"wiiu"|"uplay"|… }
  ├─ verifyUserAgent
  ├─ verifyBuildId
  ├─ verifyAuth           →  req.ubiservicesSession = true|false
  ├─ req.version = 3
  │
  └─ handleSessions()
       │
       ├─ platform in UBISERVICES_PLATFORMS && ubiservicesSession?
       │    └─ YES → handleUbiservicesSession()
       │         ├─ Calls ubiservices.createSession()   (real Ubisoft servers)
       │         ├─ Looks up Hub by { "profiles.profileId": usProfileId }
       │         ├─ Found?    → createLinkedSession()   (full session)
       │         └─ Not found → Guest session            (isGuest: true)
       │
       └─ NO → handleStandardSession()
            ├─ Looks up Hub by { "profiles.nameOnPlatform": nameOnPlatform }
            ├─ Found?    → createLinkedSession()
            └─ Not found → USER_NOT_ON_HUB error
```

### Ubiservices platforms (`UBISERVICES_PLATFORMS`)

These platforms **must** verify identity through the real Ubisoft servers before creating a session:

| Platform | Why |
|---|---|
| `ps4` | PSN token is parsed locally, but the Ubisoft identity link requires a UbiServices session |
| `nx` | Switch JWT is validated structurally, but the Ubisoft identity link requires a UbiServices session |
| `uplay` | Official PC token needs Ubisoft verification since the raw token has no parseable user identity |

### Non-Ubiservices platforms

| Platform | Why |
|---|---|
| `wiiu` | Uses Pretendo Network directly — no Ubisoft involvement |
| `basic` | Uses Hub email/password login — no Ubisoft involvement |
| `pc-crack` | Uses Hub's ticket verification — no Ubisoft involvement |

## Two-Layer Ticket System

Harbour issues its own JWT-style ticket after a successful platform login. This ticket is used by all subsequent API calls:

```
LAYER 1                          LAYER 2
Platform Token                   Harbour Ticket
(one-time use)                   (reusable, TTL = 3h)
     │                                │
     ▼                                ▼
POST /sessions                  GET /profiles
Authorization: WiiU <...>       Authorization: Ubi_v1 t=<harbour-jwt>
     │                                │
     ▼                                ▼
verifyAuth()                    ticketRequired()
     │                                │
     ▼                                ▼
Session created!                 Decrypts JWT, sets
Issues Harbour JWT               req.userId, req.profileId, etc.
```

## Error Codes

| `errorId` | Code | Status | Meaning |
|---|---|---|---|
| `INVALID_BODY` | 1 | 400 | Request body failed Joi validation |
| `INVALID_HEADERS` | 2 | 400 | Missing/wrong headers (User-Agent, BuildId, etc.) |
| `UNAUTHORIZED` | 4 | 401 | Not authenticated |
| `FORBIDDEN` | 5 | 403 | Authenticated but not allowed |
| `APP_NOT_FOUND` | 7 | 404 | `Ubi-AppId` not registered |
| `APPLICATION_REQUIRED` | 8 | 400 | No app resolved before auth step |
| `AUTHORIZATION_REQUIRED` | 9 | 401 | No `Authorization` header |
| `AUTHORIZATION_INVALID_TYPE` | 10 | 401 | Auth scheme doesn't match platform |
| `AUTH_VERIFICATION_FAILED` | 12 | 401 | Token rejected by verifier |
| `AUTH_TOKEN_EXPIRED` | 14 | 401 | Token is expired |
| `AUTH_TOKEN_INVALID` | 15 | 401 | Token is invalid/corrupted |
| `AUTH_TOKEN_MALFORMED` | 16 | 400 | Token format is wrong |
| `PRETENDO_ERROR` | 19 | 500 | Pretendo Network request failed |
| `USER_NOT_ON_HUB` | 20 | 401 | No Hub account linked to this platform identity |
| `USER_DOESNT_HAVE_PLATFORM` | 22 | 400 | User exists but has no profile for this platform |
| `INACTIVE_ACCOUNT` | 30 | 403 | Account is inactive |
| `LOCKED_ACCOUNT` | 31 | 403 | Account is locked |
| `BANNED_ACCOUNT` | 32 | 403 | Account is banned |
| `BANNED_DEVICE` | 33 | 403 | Device is banned |
| `UNKNOWN_AUTH_TYPE` | 40 | 400 | `Authorization` scheme is not recognised |
| `UBISERVICES_ERROR` | 42 | 500 | UbiServices request failed |
| `UBISERVICES_PSN_ERROR` | 43 | 500 | PSN-specific UbiServices error |

## File Map

```
src/
├── config.js                          # Environment config (UBISERVICES, HUB, PRETENDO, …)
├── server.js                          # Express bootstrap, mounts middleware + services
│
├── lib/
│   ├── middleware.js                  # verifyAppByHeader, verifyUserAgent, verifyBuildId, verifyAuth
│   ├── session-client.js              # handleSessions, handleUbiservicesSession, handleStandardSession
│   ├── session.js                     # Harbour ticket creation/validation
│   ├── ticket-client.js               # ticketRequired, s2sTicketRequired middleware
│   ├── ticket.js                      # Harbour ticket encrypt/decrypt
│   ├── hub-helper.js                  # Hub API client (getUser, createProfile, verifyTicket, …)
│   ├── ubiservices.js                 # Ubisoft API client (createSession, deleteSession)
│   ├── pretendo.js                    # Pretendo Network API client
│   ├── http-codes.js                  # Error code definitions
│   ├── http-schema.js                 # Joi request validation schemas
│   ├── games.js                       # App/Space/Entity/Profile registry (MongoDB-backed)
│   │
│   └── auth/
│       ├── basic.js                   # Basic (email+password) auth → Hub login
│       ├── wiiu.js                    # WiiU AES token → Pretendo /me
│       ├── psn2.js                    # PSN2.0 NP ticket → local parse + UbiServices
│       ├── switch.js                  # Nintendo Switch JWT → local parse + UbiServices
│       ├── pc.js                      # Official Uplay PC token → UbiServices
│       └── pc-crack.js                # Cracked Uplay PC token → Hub verifyTicket
│
├── data/
│   ├── platforms.js                   # Platform definitions (id, authType, platformType)
│   ├── banned-devices.js              # Banned device ID lists per platform
│   ├── s2s.js                         # S2S passwords
│   └── games.json / wiiu.json         # Static game data (legacy)
│
└── services/
    ├── profiles.v2.js                 # POST /v2/profiles/sessions
    ├── profiles.v3.js                 # POST /v3/profiles/sessions (same handler)
    └── …
```
