# Changelog

All notable changes to the Harbour server.

---

## [1.3.0] — 2026-06-26

### Added
- **Status endpoints** (`GET /v1/status`) — modelled after UbiServices' public status API. Main route lists available resources plus server metadata (version, boot time, commit, branch, uptime). Individual resource endpoints (`/v1/status/:resource`) return detailed health checks for databases, external services, etc. (`src/services/status.v1.js`)
- **Official Uplay PC auth** (`lib/auth/pc.js`) — new auth handler for legitimate (non-cracked) `uplaypc_v1` tokens. Forwards identity verification to UbiServices, same flow as PS4/NX. Routing in `verifyAuth` distinguishes crack tokens (`JDMO:` prefix) from official ones. (`src/lib/middleware.js`, `src/lib/auth/pc.js`)
- **UPLAY platform definition** — registered in `src/data/platforms.js` so apps with `platform: "uplay"` resolve correctly through the middleware pipeline.
- **Docs site** (`docs/`) — comprehensive documentation of the auth system, session flow, middleware pipeline, external services, and error codes. Powered by Docsify (zero-build, serves Markdown directly). Served on local environment at `/docs`.
- **Server metadata** — boot time, git commit hash, and branch name captured at startup and exposed via the status endpoint. (`src/server.js`)

### Changed
- **Ubiservices platforms** — `"uplay"` added to `UBISERVICES_PLATFORMS` in `session-client.js`, so official PC sessions go through the Ubiservices verification + guest session flow.
- **`handleUbiservicesSession`** — falls back `req.nameOnPlatform` to `usNameOnPlatform` from the Ubisoft response when the auth handler didn't set it (needed for PC, which has no parseable local token). (`src/lib/session-client.js`)

### Fixed
- **PC crack auth** (`lib/auth/pc-crack.js`) — now creates a uplay profile on the Hub if one doesn't exist, ensuring the user can be found in the standard session flow.

---

## [1.2.2] — 2026-06-25

- Initial tagged release.
