# External Services

Harbour communicates with three external services for authentication and identity verification.

## 1. UbiServices (Ubisoft)

**File:** `src/lib/ubiservices.js`

Used by PS4, Nintendo Switch, and official Uplay PC to verify identity against the real Ubisoft servers.

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/v{version}/profiles/sessions` | Create a UbiServices session — verifies the platform credential and returns user identity |
| `DELETE` | `/v{version}/profiles/sessions` | Delete a UbiServices session |

### Configuration

```javascript
// config.js
UBISERVICES: {
    FQDN: process.env.UBISERVICES_FQDN,   // e.g. "https://ubiservices.example.com"
}
```

### Implementation

```javascript
class Ubiservices {
    constructor() {
        this.us = axios.create({
            baseURL: config.UBISERVICES.FQDN
        });
    }

    async createSession({ version = 3, appId, authorization, body = {} }) {
        const { data } = await this.us.post(
            `/v${version}/profiles/sessions`,
            body,
            {
                headers: {
                    Authorization: authorization,     // Passed through from client
                    "Ubi-AppId": appId
                }
            }
        );
        return data;  // { userId, profileId, nameOnPlatform, ticket, sessionId }
    }
}
```

### Response Shape

```json
{
  "userId": "<ubisoft-user-uuid>",
  "profileId": "<ubisoft-profile-uuid>",
  "nameOnPlatform": "PlayerName",
  "ticket": "<ubisoft-session-ticket>",
  "sessionId": "<ubisoft-session-uuid>"
}
```

### Error Handling

- **`errorCode === 3`:** PSN-specific error — returns `UBISERVICES_PSN_ERROR` with the Ubisoft error message passed through to the client
- **Other errors:** Returns `UBISERVICES_ERROR` with logged details

---

## 2. DanceParty Hub

**File:** `src/lib/hub-helper.js`

The Hub is Harbour's companion backend that manages users, profiles, and authentication. All Harbour instances share a single Hub.

### Authentication

All Hub requests include:

```javascript
{
    Authorization: `Bearer ${config.HUB.S2S_TOKEN}`,
    "Content-Type": "application/json",
    [config.HUB.AUTH_BYPASS_HEADER]: config.HUB.AUTH_BYPASS_VALUE
}
```

The S2S token and bypass headers are set via environment variables.

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/v1/session` | Login with email + password (Basic auth) |
| `POST` | `/auth/v1/verify-ticket` | Verify a PC crack ticket |
| `GET` | `/users/v1` | Search users by any profile field |
| `GET` | `/users/v1/{userId}/profiles/{platform}` | Get a user's profile for a specific platform |
| `PATCH` | `/users/v1/{userId}/profiles/{platform}` | Update a user's profile |
| `POST` | `/users/v1/{userId}/profiles` | Create a new profile for a user |
| `GET` | `/jmcs/v1/constants` | Get Just Dance constants |

### User Lookup Examples

```javascript
// By profile ID (Ubiservices path)
hubHelper.getUser({ "profiles.profileId": usProfileId });

// By nameOnPlatform (Standard path)
hubHelper.getUser({ "profiles.nameOnPlatform": nameOnPlatform });

// By Hub user ID (pc-crack profile creation)
hubHelper.getUser({ userId: UserId });
```

### Profile Operations

```javascript
// Get a user's profile for a specific platform
const profile = await hubHelper.getProfile(userId, "uplay");

// Update idOnPlatform on a profile
await hubHelper.updateProfile(userId, "nx", { idOnPlatform: "new-id" });

// Create a new profile
await hubHelper.createUplayProfile(userId, {
    username: "PlayerName",
    platform: "uplay",
    idOnPlatform: "<uuid>",
    profileId: "<uuid>"
});
```

### User Response Shape

```json
{
  "userId": "<hub-uuid>",
  "username": "PlayerName",
  "email": "player@example.com",
  "accountType": "Ubisoft",
  "status": {
    "inactiveAccount": false,
    "locked": false,
    "banned": false,
    "admin": false,
    "moderator": false,
    "patron": false,
    "qa": false,
    "jmcsEnv": "prod"
  },
  "profiles": [
    {
      "profileId": "<hub-profile-uuid>",
      "userId": "<hub-user-uuid>",
      "nameOnPlatform": "PlayerName",
      "idOnPlatform": "<platform-user-id>",
      "platformType": "nx"
    }
  ]
}
```

---

## 3. Pretendo Network

**File:** `src/lib/pretendo.js`

Used exclusively by the WiiU auth handler to verify player identity against the Pretendo Network (a replacement for the defunct Nintendo Network).

### Endpoint

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/v1/api/people/@me/profile` | Get the authenticated user's profile |

### Authentication

Pretendo requests include Nintendo-specific headers:

```javascript
{
    "Authorization": `Bearer ${token}`,
    "X-Nintendo-Client-ID": clientId,
    "X-Nintendo-Client-Secret": clientSecret,
    "X-Nintendo-Device-Cert": crypto.randomBytes(32).toString("base64")
}
```

The `clientId`, `clientSecret`, and `bearerToken` are extracted from the decrypted WiiU token payload.

### Response Shape

```xml
<?xml version="1.0" encoding="UTF-8"?>
<person>
  <pid>123456</pid>
  <user_id>PlayerName</user_id>
  <!-- ... other fields ... -->
</person>
```

### Verification

Harbour verifies that:
- The `pid` (Pretendo Player ID) matches `idOnPlatform` from the request body
- The `user_id` (Pretendo username) matches `nameOnPlatform` from the request body
- The device ID is not in `banned-devices.wiiu`

---

## Configuration Reference

All external service URLs and secrets are configured through environment variables:

| Variable | Service | Purpose |
|---|---|---|
| `UBISERVICES_FQDN` | UbiServices | Base URL for Ubisoft API |
| `HUB_API_FQDN` | DanceParty Hub | Base URL for Hub API |
| `HUB_S2S_TOKEN` | DanceParty Hub | S2S bearer token for Hub auth |
| `HUB_AUTH_SLOWDOWN_BYPASS_HEADER` | DanceParty Hub | Header for rate-limit bypass |
| `HUB_AUTH_SLOWDOWN_BYPASS_VALUE` | DanceParty Hub | Header value for rate-limit bypass |
| `PRETENDO_TOKEN_SECRET_KEY` | Pretendo | AES key for decrypting WiiU tokens |
| `PRETENDO_TOKEN_IV` | Pretendo | AES IV for decrypting WiiU tokens |
