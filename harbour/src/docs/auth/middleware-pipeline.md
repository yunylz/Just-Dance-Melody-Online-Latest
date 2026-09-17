# Middleware Pipeline

The full middleware chain for a typical authenticated request.

## Route: `POST /v3/profiles/sessions` (Login)

This is the most complex route — it applies all three identity middleware layers plus the session handler.

```mermaid
sequenceDiagram
    participant C as Client
    participant M as middleware.js
    participant T as ticket-client.js
    participant S as session-client.js
    participant Hub as DanceParty Hub
    participant U as UbiServices
    
    C->>M: POST /v3/profiles/sessions
    M->>M: init()
    Note over M: CORS, JSON parse, GeoIP, validateRequest
    
    M->>M: verifyAppByHeader()
    Note over M: Read Ubi-AppId header
    Note over M: games.getApp(appId) → { platform, spaceId, ... }
    Note over M: req.platform = resolved platform object
    
    M->>M: verifyUserAgent()
    Note over M: Check User-Agent matches app (skipped in dev)
    
    M->>M: verifyBuildId()
    Note over M: Check Ubi-AppBuildId matches app (skipped in dev)
    
    M->>M: verifyAuth()
    Note over M: Parse Authorization header
    Note over M: Dispatch to lib/auth/<handler>.js
    Note over M: Sets req.ubiservicesSession, req.nameOnPlatform, etc.
    
    S->>S: handleSessions()
    Note over S: Check UBISERVICES_PLATFORMS + ubiservicesSession
    
    alt Ubiservices path (PS4/NX/PC)
        S->>U: ubiservices.createSession()
        U-->>S: { userId, profileId, nameOnPlatform, ticket, sessionId }
        S->>Hub: hubHelper.getUser({ "profiles.profileId": usProfileId })
        
        alt User found on Hub
            Hub-->>S: Hub user data
            S->>S: createLinkedSession()
            S->>Hub: hubHelper.getProfile(userId, platformId)
            S->>S: session.createSession()
            S-->>C: 200 { ticket, profileId, userId, ... }
        else User not found
            S->>S: Create guest session
            S-->>C: 200 { ticket, ..., isGuest: true }
        end
        
    else Standard path (WiiU/Basic/cracked PC)
        S->>Hub: hubHelper.getUser({ "profiles.nameOnPlatform": nameOnPlatform })
        
        alt User found on Hub
            Hub-->>S: Hub user data
            S->>S: createLinkedSession()
            S-->>C: 200 { ticket, profileId, userId, ... }
        else User not found
            S-->>C: 401 USER_NOT_ON_HUB
        end
    end
```

## Route: `GET /v3/profiles` (Search)

A data route that only needs the Harbour session ticket (Layer 2), not the platform credential (Layer 1).

```mermaid
sequenceDiagram
    participant C as Client
    participant M as middleware.js
    participant T as ticket-client.js
    participant Hub as DanceParty Hub
    
    C->>M: GET /v3/profiles?nameOnPlatform=Player
    M->>M: verifyAppByHeader()
    M->>M: verifyUserAgent()
    M->>M: verifyBuildId()
    T->>T: ticketRequired()
    Note over T: Decrypts Harbour JWT from Authorization header
    Note over T: Sets req.userId, req.profileId, req.sessionId, etc.
    Hub->>Hub: Search profiles by query params
    Hub-->>C: 200 { profiles: [...] }
```

## Route: `DELETE /v3/profiles/sessions` (Logout)

```mermaid
sequenceDiagram
    participant C as Client
    participant M as middleware.js
    participant T as ticket-client.js
    participant S as session-client.js
    participant U as UbiServices
    participant R as Redis
    
    C->>M: DELETE /v3/profiles/sessions
    M->>M: verifyAppByHeader()
    M->>M: verifyUserAgent()
    M->>M: verifyBuildId()
    T->>T: ticketRequired()
    Note over T: Extract sessionId from ticket
    S->>S: handleSessionDeletion()
    R->>R: Check session exists
    S->>U: ubiservices.deleteSession() (if linked)
    S->>R: Delete session from cache
    S-->>C: 200 {}
```

## Middleware Configuration Order

The Express app mounts middleware in this order in `src/server.js`:

```
1. middleware.init(app)
   ├── CORS
   ├── express.json()
   ├── GeoIP middleware (CloudFlare or MaxMind)
   └── validateRequest (Joi schema)

2. Service-specific routes
   Each service file mounts its own middleware chain per-route.
   Typical chain for POST /sessions:
     verifyAppByHeader → verifyUserAgent → verifyBuildId → verifyAuth → handler

3. middleware.notFound (404 catch-all)

4. middleware.errorHandler (global error formatter)
```

## Request Flow Summary

```
                                 ┌──────────────────┐
                                 │                  │
                                 │  init()          │
                                 │  - CORS          │
                                 │  - JSON parsing  │
                                 │  - GeoIP         │
                                 │  - Joi validate  │
                                 │                  │
                                 └────────┬─────────┘
                                          │
                                 ┌────────▼─────────┐
                                 │                  │
                                 │  verifyAppBy-    │
                                 │  Header()        │
                                 │                  │
                                 │  Reads Ubi-AppId │
                                 │  Resolves app    │
                                 │  + platform      │
                                 │                  │
                                 └────────┬─────────┘
                                          │
                                 ┌────────▼─────────┐
                                 │                  │
                                 │  verifyUserAgent │
                                 │  verifyBuildId   │
                                 │  (dev bypass)    │
                                 │                  │
                                 └────────┬─────────┘
                                          │
                          ┌───────────────┴───────────────┐
                          │                               │
                 ┌────────▼─────────┐          ┌──────────▼────────┐
                 │  POST /sessions   │          │  Other routes     │
                 │  only:            │          │                   │
                 │  verifyAuth()     │          │  ticketRequired() │
                 │                   │          │                   │
                 │  Validates the    │          │  Decrypts Harbour │
                 │  platform token   │          │  session ticket   │
                 │  (WiiU/PSN/Switch │          │  Sets req.userId, │
                 │  /PC/Basic)       │          │  profileId, etc.  │
                 │                   │          │                   │
                 └────────┬─────────┘          └──────────┬────────┘
                          │                               │
                 ┌────────▼─────────┐                     │
                 │  handleSessions()│                     │
                 │  Creates Harbour │                     │
                 │  session ticket  │                     │
                 │                  │                     │
                 └────────┬─────────┘                     │
                          │                               │
                          └───────┬───────────────────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Route handler   │
                         │  (business       │
                         │   logic)         │
                         │                  │
                         └──────────────────┘
```
