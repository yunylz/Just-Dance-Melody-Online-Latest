# Error Codes

All standardised error responses are defined in `src/lib/http-codes.ts`. Each error is an object with three properties:

```typescript
{
  message: string;  // Human-readable description
  code: number;     // Internal error identifier
  status: number;   // HTTP status code
}
```

These are passed to the error handler via `next({ ...ERROR_NAME })` and are used consistently across all services.

Error codes are only shown in non-prod environments or if the client is an admin, client is package manager or if the request is S2S.

---

## 4xx — Client Errors

### 400 Bad Request

| Export | Code | Message |
|--------|------|---------|
| `INVALID_BODY` | 1 | The request body is invalid. |
| `INVALID_HEADERS` | 2 | The request headers are invalid. |
| `INVALID_QUERY` | 3 | The query parameters are invalid. |
| `INVALID_PARAMS` | 6 | One or more parameters are invalid. |
| `INVALID_TOKEN_FORMAT` | 18 | The provided token format is invalid. |
| `TOKEN_EXPIRED` | 21 | The provided token has expired. |
| `INVALID_NAME_FORMAT` | 27 | Name can only contain letters, spaces, hyphens, and apostrophes. |
| `INVALID_COUNTRY` | 28 | Please select a valid country. |
| `UPDATE_REQUIRED` | 29 | At least one field must be provided for update. |
| `INVALID_REQUEST` | 34 | The request is invalid. Please contact DanceParty Support if you think this is a mistake. |
| `SONG_CANT_BE_UPDATED` | 35 | The song can't be updated. Please check logs for more information. |
| `SONG_CANT_BE_CREATED` | 36 | The song can't be created. Please check logs for more information. |
| `SONG_CANT_BE_DELETED` | 37 | The song can't be deleted. Please check logs for more information. |
| `SONG_ALREADY_EXISTS` | 38 | The song already exists. Please check logs for more information. |
| `SKU_REQUIRED` | 39 | A Sku ID is required for this action. |
| `SKU_INVALID` | 40 | The provided SKU ID is invalid. |
| `CANT_CREATE_SESSION` | 46 | Cannot create session. Please check logs for more information. |
| `UNKNOWN_LEADERBORD_TYPE` | 55 | Unknown leaderboard type. Please try again later. |
| `BAD_REQUEST` | 58 | Bad Request |
| `INVALID_PAIRING_CODE` | 59 | Invalid pairing code. Please provide a valid pairing code. |
| `ALIAS_CANT_BE_UPDATED` | 61 | The alias can't be updated. Please check logs for more information. |
| `PLAYLIST_CANT_BE_UPDATED` | 62 | The playlist can't be updated. Please check logs for more information. |

### 401 Unauthorized

| Export | Code | Message |
|--------|------|---------|
| `UNAUTHORIZED` | 4 | You are not authorized to perform this action. |
| `INVALID_CREDENTIALS` | 8 | The provided credentials are invalid. |
| `SESSION_EXPIRED` | 9 | Your session has expired. Please log in again. |
| `AUTH_REQUIRED` | 10 | Authorization is required to access this resource. |
| `TAMPERED_TOKEN` | 11 | The authentication token is invalid or has been tampered with. This attempt has been logged. |
| `GENERIC_AUTH_ERROR` | 19 | Invalid credentials or user not found. |
| `TICKET_EXPIRED` | 41 | The provided ticket has expired. |
| `SKU_APP_ID_MISMATCH` | 42 | The provided SKU App ID does not match the ticket App ID. |
| `SESSION_REQUIRED` | 43 | A session is required for this action. |
| `INVALID_S2S_TOKEN` | 63 | The provided S2S token is invalid or missing. |
| `ENVIRONMENT_MISMATCH` | 64 | Nice try. Ticket environment and JMCS environment does not match. This attempt was logged for further investigation. |

### 403 Forbidden

| Export | Code | Message |
|--------|------|---------|
| `FORBIDDEN` | 5 | Access to this resource is forbidden. |
| `INACTIVE_ACCOUNT` | 15 | The account is inactive. Please contact DanceParty Support for more information. |
| `LOCKED_ACCOUNT` | 16 | The account is locked. Please contact DanceParty Support for more information. |
| `BANNED_ACCOUNT` | 17 | The account is banned. Please contact DanceParty Support for more information. |
| `ACCOUNT_NOT_ELIGIBLE` | 22 | This account is not eligible for this action. |
| `ADMIN_ONLY` | 30 | This action is only available to administrators. |
| `MOD_ONLY` | 31 | This action is only available to moderators. |
| `USER_NOT_BANNED` | 32 | This user is not banned. Can't unban. |
| `CHEAT_DETECTED` | 53 | Cheating is not allowed. This attempt was logged for further investigation. |
| `SKU_ROUTE_MISMATCH` | 54 | This SKU has no access to this route. Please try again later. |
| `BACKOFFICE_ONLY` | 56 | This route is only available for Backoffice. This attempt was logged for further investigation. |

### 404 Not Found

| Export | Code | Message |
|--------|------|---------|
| `SONG_NOT_FOUND` | 12 | The requested song could not be found. |
| `PLATFORM_NOT_FOUND` | 13 | The requested platform could not be found. |
| `PROFILE_NOT_FOUND` | 14 | The requested profile could not be found. |
| `SCRIPT_NOT_FOUND` | 44 | The requested script does not exist. |
| `SCRIPT_ACTION_NOT_FOUND` | 45 | The requested action does not exist on this script. |
| `MAP_NOT_FAVORITED` | 48 | This map is not in your favorites. |
| `SCORE_NOT_FOUND` | 49 | No score entry found for this map. |
| `ALIAS_NOT_FOUND` | 51 | This alias was not found on the profile. |
| `CONTENT_AUTH_NOT_FOUND` | 52 | Content authorization not found. |
| `NOT_FOUND` | 57 | Not Found |
| `SESSION_NOT_FOUND` | 60 | Session not found. |

### 409 Conflict

| Export | Code | Message |
|--------|------|---------|
| `DUPLICATE_REQUEST` | 23 | A similar request is already being processed. |
| `MAP_ALREADY_FAVORITED` | 47 | This map is already in your favorites. |
| `ALIAS_ALREADY_UNLOCKED` | 50 | This alias is already unlocked. |

### 429 Too Many Requests

| Export | Code | Message |
|--------|------|---------|
| `RATE_LIMITED` | 20 | Too many requests. Please try again later. |
| `TOO_MANY_AUTH_ATTEMPTS` | 33 | Too many login attempts. Please try again later. |

### 2xx — Success (informational)

| Export | Code | Message | Status |
|--------|------|---------|--------|
| `VERIFICATION_PENDING` | 24 | Account verification is still pending. Please check your email. | 202 |

---

## 5xx — Server Errors

| Export | Code | Message | Status |
|--------|------|---------|--------|
| `INTERNAL_SERVER_ERROR` | 7 | An unexpected server error occurred. Please try again later. | 500 |
| `MAINTENANCE_MODE` | 25 | The service is currently under maintenance. Please try again later. | 503 |
| `FEATURE_DISABLED` | 26 | This feature is currently disabled. | 503 |

---

## Usage pattern

Errors are thrown through Express's `next()` function:

```typescript
import { SONG_NOT_FOUND, INTERNAL_SERVER_ERROR } from "../lib/http-codes";

// Not found
return next(SONG_NOT_FOUND);

// With dynamic message override
return next({ ...INTERNAL_SERVER_ERROR, error: dbError, message: "Custom message" });
```

The error handler in `http-middleware.ts` catches these and returns the appropriate HTTP response.
