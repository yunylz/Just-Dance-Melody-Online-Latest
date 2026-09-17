![Harbour](/public/assets/harbour_logo_black.png)

# Harbour Docs

Technical documentation for the Harbour server — the backend powering Just Dance Melody Online.

## Auth System

Harbour uses a **two-layer authentication** model:

| Layer | What | Where |
|---|---|---|
| **1. Platform Token** | Validate the credential sent by the game client | `src/lib/middleware.js` → `verifyAuth` → `src/lib/auth/*.js` |
| **2. Harbour Session Ticket** | Validate the JWT-style ticket issued after login | `src/lib/ticket-client.js` → `ticketRequired` |

→ [Auth Overview](auth/README.md)  
→ [Architecture Diagrams](auth/architecture.md)

## Services

Each service is auto-discovered and mounted at `/v<version>/<name>`. See [`src/services/README.md`](../src/services/README.md).
