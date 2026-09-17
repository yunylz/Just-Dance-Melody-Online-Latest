# Services

Each service file is auto-discovered and mounted by `lib/load-services.js`. The filename format `<name>.<version>.js` determines the route prefix — e.g. `profiles.v2.js` → `/v2/profiles`.

Services receive four arguments: `(app, publicRouter, privateRouter, logger)`. Public routes are always active; private routes only mount when `PRIVATE_ROUTES=true` in config.

---

## Auth concepts

Most routes require one or more of the following middleware applied in order:

| Middleware | What it does |
|---|---|
| `verifyAppByHeader` | Reads `Ubi-AppId` header, resolves the app + platform |
| `verifyUserAgent` | Checks `User-Agent` matches app's expected value (skipped in dev) |
| `verifyBuildId` | Checks `Ubi-AppBuildId` matches app's build ID (skipped in dev) |
| `verifyAuth` | Validates the `Authorization` header token for the platform's auth type |
| `ticketRequired` | Validates an existing Harbour session ticket (`Authorization: Ubi_v1 t=<ticket>`) |
| `s2sTicketRequired` | Must follow `ticketRequired` — rejects if not an S2S token |
| `backOfficeTokenRequired` | Validates a BackOffice bearer token |

### Auth types

| Header value | Platform | Handler |
|---|---|---|
| `Authorization: WiiU <encrypted>` | Wii U | `lib/auth/wiiu.js` — AES-128-CBC decrypt, verify against Pretendo `/me` |
| `Authorization: PSN2.0 <b64>` | PS4 | `lib/auth/psn2.js` — Parse NP ticket, `issuerid` must be `256` |
| `Authorization: Switch <jwt>` | Nintendo Switch | `lib/auth/switch.js` — Decode JWT, validate Nintendo domains |
| `Authorization: uplaypc_v1 t=JDMO:<enc>` | PC (cracked) | `lib/auth/pc-crack.js` — Hub `/auth/v1/verify-ticket` decrypt + validate |
| `Authorization: uplaypc_v1 t=<token>` | PC (official) | `lib/auth/pc.js` — Forwards to UbiServices for verification |
| `Authorization: Basic <b64>` | Any (bypass) | `lib/auth/basic.js` — Decode `username:password`, login to Hub |

Basic auth is a **privileged bypass** — it works regardless of the app's registered platform and requires `x-requestedplatformtype` header to select the target profile.

---

## `admin.v1.js` → `/v1/admin`

Admin dashboard and management API.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Cookie | Admin dashboard HTML |
| `GET` | `/auth/login` | — | OIDC login redirect **DEPRECATED, please use the SSO.** |
| `GET` | `/auth/oidc/login` | — | OIDC login redirect |
| `GET` | `/auth/oidc/callback` | — | OIDC callback |
| `GET` | `/auth/me` | `adminAuth` | Current admin info |
| `GET` | `/logout` | — | Clear session |
| `GET` | `/platforms` | `adminAuth` | List platform definitions |
| | **Apps** | | |
| `GET/POST` | `/apps` | `adminAuth` | List / create apps |
| `GET/PATCH/DELETE` | `/apps/:appId` | `adminAuth` | Get / update / delete app |
| `GET/PUT` | `/apps/:appId/configuration` | `adminAuth` | Get / update app config |
| `GET/PUT` | `/apps/:appId/parameters` | `adminAuth` | Get / update app parameters |
| | **Spaces** | | |
| `GET/POST` | `/spaces` | `adminAuth` | List / create spaces |
| `GET/PATCH/DELETE` | `/spaces/:spaceId` | `adminAuth` | Get / update / delete space |
| `GET/PUT` | `/spaces/:spaceId/configs/events` | `adminAuth` | Get / update event config |
| `GET/POST` | `/spaces/:spaceId/entities` | `adminAuth` | List / create entities |
| `PATCH/DELETE` | `/spaces/:spaceId/entities/:entityId` | `adminAuth` | Update / delete entity |
| `GET/PUT` | `/spaces/:spaceId/populations` | `adminAuth` | List / update populations |
| `GET/PUT` | `/spaces/:spaceId/actions` | `adminAuth` | List / update actions |
| `GET/PUT` | `/spaces/:spaceId/rewards` | `adminAuth` | List / update rewards |
| `GET/PUT` | `/spaces/:spaceId/parameters` | `adminAuth` | Get / update space parameters |
| `PUT` | `/spaces/:spaceId/eventsDefinitions` | `adminAuth` | Update event definitions |
| | **Sessions** | | |
| `GET` | `/sessions` | `adminAuth` | List active sessions |
| `DELETE` | `/sessions/:sessionId` | `adminAuth` | Force-delete session |
| | **Tickets** | | |
| `POST` | `/tickets/decrypt` | `adminAuth` | Decrypt a Harbour ticket |
| `POST` | `/tickets/encrypt` | `adminAuth` | Encrypt claims into a ticket |

---

## `api.v1.js` → `/v1/api`

Pretendo Network integration.

| Method | Path | Auth | Description |
|---|---|---|---|
| `ALL` | `/provider/service_token/@me` | Nintendo headers | Build and AES-encrypt a WiiU service token. JD titles handled locally, others proxied to Pretendo |
| `ALL` | `/*path` | — | Catch-all — returns 404 |

---

## `applications.v1.js` → `/v1/applications`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ticket + S2S | List all apps (filter by `?appId=`, `?name=`, `?platform=`) |
| `GET` | `/:appId` | ticket | Get app by ID |
| `GET` | `/:appId/configuration` | ticket | Get app platform configuration |
| `GET` | `/:appId/parameters` | ticket | Get app parameters |

---

## `applications.v2.js` → `/v2/applications`

Identical routes and handlers to v1.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ticket + S2S | List all apps |
| `GET` | `/:appId` | ticket | Get app by ID |
| `GET` | `/:appId/configuration` | ticket | Get app configuration |
| `GET` | `/:appId/parameters` | ticket | Get app parameters |

---

## `backoffice.v1.js` → `/v1/backoffice`

Server-to-server management. All routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/sessions` | BackOffice | List all active Harbour + Ubiservices sessions |
| `GET` | `/verify-code` | BackOffice | Look up session by verification code (`?code=`) |
| `POST` | `/events` | BackOffice | Insert tracking batch (`?userId=`) |
| `GET` | `/events/latest` | BackOffice | Latest tracking batch for a user (`?userId=`) |
| `GET` | `/events` | BackOffice | Paginated tracking history (`?userId=&limit=&skip=`) |
| `GET` | `/events/latest-event` | BackOffice | Most recent single event (`?userId=`) |

---

## `gateway.v1.js` → `/v1/gateway`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/ping` | — | Lightweight health check |
| `GET` | `/configuration/cors` | — | Allowed CORS domains (currently empty) |

---

## `profiles.v1.js` → `/v1/profiles`

Legacy profile endpoints.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/me` | ticket | Get / create current user's stub profile |
| `GET` | `/me/populations` | ticket | Get space populations with JMCS redirection |
| `PUT` | `/me/populations/data` | ticket | Stub — returns `{}` |
| `GET` | `/:profileId/actions` | ticket | Get actions for a space (`?spaceId=`) |
| `GET` | `/:profileId/rewards` | ticket | Get rewards for a space (`?spaceId=`) |
| `GET` | `/me/friends` | ticket | Friends list (stub — returns `[]`) |
| `GET` | `/:userId/actions` | — | Stub |
| `PUT` | `/:userId/actions` | — | Stub |
| `POST` | `/:userId/events` | — | Stub |

---

## `profiles.v2.js` → `/v2/profiles`

Core session management and profile search.

### `GET /v2/profiles`

Search profiles across all Hub users.

**Headers:** `Ubi-AppId` + Harbour ticket (`Ubi_v1 t=<ticket>`).

**Query params** (at least one required):

| Param | Type | Description |
|---|---|---|
| `profileId` | string (csv) | Filter by profile UUID(s) |
| `idOnPlatform` | string (csv) | Filter by platform user ID(s) |
| `nameOnPlatform` | string (csv) | Filter by platform username(s) |
| `platformType` | string | `wiiu`, `ps3`, `x360`, `nx`, `ps4` |

**Response:** `{ "profiles": [{ "profileId", "userId", "nameOnPlatform", "idOnPlatform", "platformType" }] }`

---

### `POST /v2/profiles/sessions`

Main login endpoint.

**Headers:**

| Header | Description |
|---|---|
| `Ubi-AppId` | Registered app ID |
| `Authorization` | Platform credential |
| `x-requestedplatformtype` | Required for Basic auth only |

**Body:** `{ "genomeId", "idOnPlatform", "nameOnPlatform" }`

**Response:** `{ "platformType", "ticket", "profileId", "userId", "nameOnPlatform", "expiration", "spaceId", "sessionId", ... }`

**Error codes:** `USER_NOT_ON_HUB` (20), `INACTIVE_ACCOUNT` (30), `LOCKED_ACCOUNT` (31), `BANNED_ACCOUNT` (32), `USER_DOESNT_HAVE_PLATFORM` (22).

---

### `DELETE /v2/profiles/sessions`

Logout. **Headers:** `Ubi-AppId` + Harbour ticket. **Response:** `{}`.

---

## `profiles.v3.js` → `/v3/profiles`

Same endpoints as v2 with Patreon-gating and uPlay account linking.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ticket | Search profiles |
| `POST` | `/sessions` | app + platform token | Create session |
| `DELETE` | `/sessions` | ticket | Delete session |
| `POST` | `/me/events` | ticket | Store telemetry events |

---

## `status.v1.js` → `/v1/status`

Health-check endpoints modelled after UbiServices' public status API.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | — | List resources + server metadata |
| `GET` | `/:resource` | — | Health check for a subsystem |

**Resources:** `applications`, `authentication`, `configuration`, `connections`, `gateway`, `population`, `profiles`, `spaces`, `users`

---

## `spaces.v1.js` → `/v1/spaces`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/entities` | ticket | Global entities list |
| `GET` | `/:spaceId/entities` | ticket | Entities for a space |

---

## `spaces.v2.js` → `/v2/spaces`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/entities` | ticket | Global entities (v2) |

---

## `spaces.v4.js` → `/v4/spaces`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/configurations` | ticket | Space configurations |

---

## `users.v1.js` → `/v1/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | S2S | Search Hub users |

---

## `users.v2.js` → `/v2/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/:userId` | ticket | Get Hub user info |

---

## `users.v3.js` → `/v3/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/me` | ticket | Get current user's full Hub profile |
