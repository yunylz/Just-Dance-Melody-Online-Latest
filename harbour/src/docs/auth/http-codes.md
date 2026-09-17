# HTTP Error Codes

**File:** `src/lib/http-codes.js`

All Harbour errors are returned as standardised objects with a numeric `code`, HTTP `status`, and human-readable `message`.

## Error Object Shape

```javascript
{
  message: "Human-readable description",
  code: 12,       // Numeric error code
  status: 401     // HTTP status code
}
```

In development mode, the global `errorHandler` wraps these into a JSON response:

```json
{
  "status": 401,
  "message": "Authentication verification failed.",
  "errorId": "AUTH_VERIFICATION_FAILED",
  "errorCode": 12,
  "isSuccessful": false,
  "serverTime": "2026-06-26T12:00:00.000Z",
  "requestId": "<uuid>"
}
```

In production, only the HTTP status code is sent (no body).

## Code Table

### 4xx Client Errors

| `errorId` | Code | Status | Meaning | Used by |
|---|---|---|---|---|
| `INVALID_BODY` | 1 | 400 | Request body failed Joi schema validation | `validateRequest` middleware |
| `INVALID_HEADERS` | 2 | 400 | Missing or invalid headers (User-Agent, BuildId) | `verifyUserAgent`, `verifyBuildId` |
| `INVALID_QUERY` | 3 | 400 | Invalid query parameters | Profile search routes |
| `UNAUTHORIZED` | 4 | 401 | No authentication provided | `ticketRequired` |
| `FORBIDDEN` | 5 | 403 | Authenticated but not permitted | Admin routes |
| `INVALID_PARAMS` | 6 | 400 | Invalid route parameters | `validateRequest` middleware |
| `APP_NOT_FOUND` | 7 | 404 | `Ubi-AppId` is not registered | `verifyAppByHeader` |
| `APPLICATION_REQUIRED` | 8 | 400 | No app resolved before auth step | `verifyUserAgent`, `verifyAuth` |
| `AUTHORIZATION_REQUIRED` | 9 | 401 | No `Authorization` header | `verifyAuth` |
| `AUTHORIZATION_INVALID_TYPE` | 10 | 401 | Auth scheme doesn't match platform | `verifyAuth` |
| `PASSWORD_TOO_WEAK` | 11 | 400 | Password fails strength check | `validateRequest` (body) |
| `AUTH_VERIFICATION_FAILED` | 12 | 401 | Token rejected by verifier | All auth handlers |
| `AUTH_TOKEN_EXPIRED` | 14 | 401 | Token has expired | `authSwitch.verify`, `mapAuthError` |
| `AUTH_TOKEN_INVALID` | 15 | 401 | Token is invalid or corrupted | `authSwitch.verify`, `authWiiU.verify`, `mapAuthError` |
| `AUTH_TOKEN_MALFORMED` | 16 | 400 | Token format is wrong | All auth handlers (parse steps) |
| `PLATFORM_ID_MISMATCH` | 17 | 400 | Platform ID doesn't match verified identity | `authWiiU.verify` |
| `USERNAME_MISMATCH` | 18 | 400 | Username doesn't match verified identity | `authWiiU.verify` |
| `USER_NOT_ON_HUB` | 20 | 401 | No Hub account linked to this identity | `handleStandardSession`, `createLinkedSession` |
| `PLATFORM_NOT_AVAILABLE` | 21 | 400 | Platform not supported for this action | Session validation |
| `USER_DOESNT_HAVE_PLATFORM` | 22 | 400 | User exists but has no profile for platform | `createLinkedSession` |
| `SESSION_NOT_FOUND` | 23 | 400 | Session ID not found in cache | `handleSessionDeletion` |
| `INVALID_HEADERS` | 26 | 400 | One or more headers are invalid | `verifyUserAgent`, `verifyBuildId` |
| `TICKET_EXPIRED` | 27 | 401 | Harbour session ticket has expired | Ticket validation |
| `ADMIN_ONLY` | 28 | 401 | Action restricted to admins | Admin routes |
| `UNKNOWN_TICKET_TYPE` | 29 | 400 | Unknown ticket type | Ticket parsing |
| `REQUESTED_PLATFORM_TYPE_REQUIRED` | 35 | 400 | Basic auth used without `x-requestedplatformtype` header | Session validation |
| `INVALID_SWITCH_TICKET` | 37 | 401 | Switch JWT hostname doesn't end with nintendo.com | `authSwitch.verify` |
| `TICKET_REQUIRED` | 38 | 401 | Harbour ticket is missing | `ticketRequired` |
| `APP_ID_REQUIRED` | 39 | 400 | `Ubi-AppId` header is missing | `verifyAppByHeader` |
| `UNKNOWN_AUTH_TYPE` | 40 | 400 | `Authorization` scheme not recognised | `verifyAuth` |
| `BACKOFFICE_TOKEN_REQUIRED` | 41 | 401 | BackOffice token is missing | BackOffice routes |

### 403 Forbidden

| `errorId` | Code | Status | Meaning | Used by |
|---|---|---|---|---|
| `INACTIVE_ACCOUNT` | 30 | 403 | Account is inactive | `createLinkedSession` |
| `LOCKED_ACCOUNT` | 31 | 403 | Account is locked | `createLinkedSession` |
| `BANNED_ACCOUNT` | 32 | 403 | Account is banned | `createLinkedSession` |
| `BANNED_DEVICE` | 33 | 403 | Device is banned | `authWiiU.verify` |
| `S2S_TOKEN_ONLY` | 34 | 401 | S2S token required | `s2sTicketRequired` |

### 5xx Server Errors

| `errorId` | Code | Status | Meaning | Used by |
|---|---|---|---|---|
| `AUTH_SYSTEM_ERROR` | 13 | 500 | Authentication system failure | Auth error mapping |
| `PRETENDO_ERROR` | 19 | 500 | Pretendo Network request failed | `authWiiU.verify` |
| `CANT_ENCRYPT_PRETENDO_TOKEN` | 24 | 500 | Token encryption failed | API service token |
| `INTERNAL_SERVER_ERROR` | 25 | 500 | Unhandled server error | Default error handler |
| `UNKNOWN_HUB_ERROR` | 36 | 500 | Hub request failed | `authBasic.verify` |
| `UBISERVICES_ERROR` | 42 | 500 | UbiServices request failed | `handleUbiservicesSession` |
| `UBISERVICES_PSN_ERROR` | 43 | 500 | PSN-specific UbiServices error | `handleUbiservicesSession` |

## Error Mapping Helpers

### `mapAuthError`

Maps error message strings from auth handlers to the appropriate HTTP error code:

```javascript
const mapAuthError = (errorMessage) => {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("expired")) return AUTH_TOKEN_EXPIRED;
  if (msg.includes("invalid") || msg.includes("corrupted")) return AUTH_TOKEN_INVALID;
  if (msg.includes("malformed") || msg.includes("format")) return AUTH_TOKEN_MALFORMED;
  return AUTH_VERIFICATION_FAILED;
};
```

### `findErrorId`

Looks up the human-readable error ID key for a given numeric code:

```javascript
const findErrorId = (code) => {
  for (const [key, def] of Object.entries(httpCodes)) {
    if (def.code === code) return key;
  }
  return null;
};
```

Used by the global error handler to populate `errorId` in error responses.
