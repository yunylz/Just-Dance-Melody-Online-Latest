# HTTP Schema / Body Validations

All request validation schemas are defined in `src/lib/http-schema.ts` using [Joi](https://joi.dev/). The `validateRequest` middleware matches the incoming route against these schemas and validates `body`, `query`, and `params` accordingly.

Validation failures return appropriate HTTP error codes:
- `INVALID_BODY` — body failed schema validation.
- `INVALID_QUERY` — query string failed schema validation.
- `INVALID_PARAMS` — URL params failed schema validation.

---

## Constant Provider

### `POST /constant-provider/v1/sku-constants`

**Body schema:** `constantsJoiSchema`

---

## SongDB v1

### `PUT /songdb/v1/songs/:mapName`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `title` | `string` | optional |
| `artist` | `string` | optional |
| `originalJDVersion` | `number` | optional |
| `coachCount` | `number` | optional |
| `difficulty` | `number` | optional |
| `sweatDifficulty` | `number` | optional |
| `songColor1A` | `string` | optional |
| `songColor1B` | `string` | optional |
| `songColor2A` | `string` | optional |
| `songColor2B` | `string` | optional |
| `lyricsColor` | `string` | optional |
| `lyricsType` | `number` | optional |
| `mode` | `number` | optional |
| `status` | `number` | optional |
| `tags` | `array` | optional |
| `customTypeNameId` | `number` | optional |
| `mapLength` | `number` | optional |
| `assets` | `object` | optional |
| `packages` | `object` | optional |
| `urls` | `object` | optional |
| `audioPreviewData` | `object` | optional |
| `credits` | `string` (allow empty) | optional |
| `mapPreviewMpd` | `string` | optional |
| `serverChangelist` | `number` (default `0`) | optional |
| `searchTagsLocIds` | `array` (default `[]`) | optional |
| `bannerTheme` | `string` (default `""`) | optional |
| `releaseDate` | `string` (ISO date, allow empty) | optional |
| `isPatreon` | `boolean` (default `false`) | optional |

**`unknown(false)`** — extra fields are rejected.

### `POST /songdb/v1/songs/:mapName`

Same body schema as `PUT`.

### `POST /songdb/v1/tags`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `name` | `string` | **required** |
| `color` | `string` | optional |
| `description` | `string` (allow empty) | optional |

---

## Sessions v1

### `POST /sessions/v1/session`

**Body:** accepts one of two schemas:

**Game schema:**

| Field | Type | Required |
|-------|------|----------|
| `publicIp` | `string` | **required** |
| `pairingInfo.protocol` | `"v2.phonescoring.jd.ubisoft.com"` | **required** |
| `pairingInfo.pairingUrl` | `string` | **required** |
| `pairingInfo.tlsCertificate` | `string` | **required** |
| `pairingInfo.titleId` | `string` | **required** |
| `pairingInfo.displayName` | `string` | **required** |
| `populations` | `array` (default `[]`) | optional |

**Companion schema:**

| Field | Type | Required |
|-------|------|----------|
| `mobileInfo.language` | `string` | **required** |
| `mobileInfo.deviceId` | `string` (guid) | **required** |
| `mobileInfo.firstPartyToken` | `string` | **required** |
| `mobileInfo.platform` | `"ios"` or `"android"` | **required** |

### `GET /sessions/v1/pairing-info`

**Query:**

| Field | Type | Required |
|-------|------|----------|
| `code` | `string` | **required** |

---

## Subscription v1

### `POST /subscription/v1/refresh`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `deviceId` | `string` | optional |
| `accessToken` | `string` | optional |

**`unknown(true)`** — extra fields are allowed.

---

## Profile v1

### `POST /profile/v1/profiles`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `name` | `string` | **required** |
| `avatar` | `number` (integer) | **required** |
| `country` | `number` (integer) | **required** |
| `wdfRank` | `number` (integer) | **required** |
| `stars` | `number` (integer) | **required** |
| `unlocks` | `number` (integer) | **required** |
| `songsPlayed` | `number` (integer) | **required** |
| `progression` | `object` | **required** |
| `scores` | `map<string, object>` | optional |
| `nickname` | `string` | optional |
| `skin` | `number` (integer) | optional |
| `alias` | `number` (integer) | optional |
| `aliasGender` | `number` (integer) | optional |
| `portraitBorder` | `number` (integer) | optional |
| `jdPoints` | `number` (integer) | optional |
| `favorites` | `string[]` | optional |
| `unlockedAvatars` | `number[]` | optional |
| `unlockedSkins` | `number[]` | optional |
| `unlockedPortraitBorders` | `number[]` | optional |
| `diamondPoints` | `number` (integer) | optional |
| `platformId` | `string` (allow empty) | optional |
| `populations` | `array` | optional |

**`unknown(true)`** — extra fields are allowed.

### `POST /profile/v1/filter-players`

**Body:** `array` of strings, max 1000 items.

---

## Profile v2

### `POST /profile/v2/profiles`

Same as v1 profiles plus additional fields:

| Field | Type | Required |
|-------|------|----------|
| `history` | `map<string, number>` | optional |
| `unlockedAliases` | `number[]` | optional |
| `stats` | `object` | optional |
| `newAccountLinkedToUplay` | `boolean` | optional |

**Note:** `jdPoints` accepts either `number` or `map<string, number>`.

### `POST /profile/v2/filter-players`

**Body:** `array` of strings, max 1000 items.

### `PUT /profile/v2/scores/maps/:mapName`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `score` | `number` (integer) | **required** |
| `isCoopHighscore` | `boolean` (default `false`) | optional |

### `POST /profile/v2/map-ended`

**Body:** `array` of objects (min 1):

| Field | Type | Required |
|-------|------|----------|
| `mapName` | `string` | **required** |
| `timestamp` | `number` | optional |
| `score` | `number` (integer) | **required** |
| `gameMode` | `"CLASSIC"` / `"KIDS"` / `"WDF"` | **required** |
| `nbPlayers` | `number` (integer) | optional |
| `jduEnabled` | `boolean` | optional |
| `position` | `number` | optional |

---

## Leaderboard v1

### `GET /leaderboard/v1/maps/:mapName/world`

**Query:**

| Field | Type | Required |
|-------|------|----------|
| `count` | `number` (0–10, default `5`) | optional |
| `platform` | `string` | optional |

### `GET /leaderboard/v1/maps/:mapName/countries/:countryId`

Same query as above.

### `POST /leaderboard/v1/maps/:mapName/friends`

**Query:** Same as above.  
**Body:** `array` of strings (min 0).

---

## Content Authorization v1

### `POST /content-authorization/v1/maps/:mapName` 

Deprecated. Please use songDb v2.

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `urls` | `map<string, string>` | **required** |

---

## Home v1

### `POST /home/v1/tiles`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `tileHistory` | `array` (default `[]`) | optional |
| `requestedTileCount` | `number` (1–20, default `5`) | optional |
| `timestampLastRequest` | `number` (default `0`) | optional |
| `timestampLastManualContent` | `number` (default `0`) | optional |
| `timestampLastMapContent` | `number` (default `0`) | optional |
| `timestampLastVideoContent` | `number` (default `0`) | optional |
| `timestampLastPlaylistContent` | `number` (default `0`) | optional |
| `timestampLastLocalTrack` | `number` (default `0`) | optional |
| `uplayConnected` | `boolean` (default `false`) | optional |

---

## PlaylistDB v1

### `POST /playlistdb/v1/playlists`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `id` | `string` | **required** |
| `ownerId` | `string` | **required** |
| `title` | `string` | **required** |
| `description` | `string` (allow empty) | optional |
| `songs` | `array` of song objects | **required** |
| `isPublic` | `boolean` | **required** |
| `updatedAt` | `string` (ISO date) | **required** |

Song object: `{ mapName, title, artist, coverUrl (uri) }`

### `PUT /playlistdb/v1/playlists/:playlistId`

Same fields as create, all optional.

### `POST /playlistdb/v1/users/:userId/sync`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `playlists` | `array` of playlist objects | **required** |

---

## Live v1

### `POST /live/v1/activities/playlogs`

**Query:**

| Field | Type | Required |
|-------|------|----------|
| `count` | `number` (1–100, default `20`) | optional |
| `skip` | `number` (min 0, default `0`) | optional |

**Body:** `array` of strings (min 0).

### `POST /live/v1/activities/feed`

**Query:**

| Field | Type | Required |
|-------|------|----------|
| `count` | `number` (1–200, default `50`) | optional |
| `skip` | `number` (min 0, default `0`) | optional |
| `types` | `string` (comma-separated) | optional |

**Body:** `array` of strings (min 0).

### `GET /live/v1/map-sessions`

**Query:**

| Field | Type | Required |
|-------|------|----------|
| `pid` | `string` (uuid) | optional |
| `userId` | `string` (uuid) | optional |

---

## UGC v2

### `POST /ugc/v2/ugcs`

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `mapName` | `string` | **required** |
| `type` | `"ad"` / `"st"` / `"dm"` / `"ch"` / `"cr"` | **required** |
| `content` | `map<string, object>` | optional |
| `coach` | `number` (integer, required when type=`"ch"`) | conditional |
| `device` | `number` (integer, required when type=`"ch"`) | conditional |
| `score` | `number` (integer, required when type=`"ch"`) | conditional |
| `moves` | `string` | optional |
| `contest` | `number` (integer, required when type=`"cr"`) | conditional |
| `sequence` | `number` (integer, required when type=`"cr"`) | conditional |

### `PUT /ugc/v2/ugcs/:ugcId/like`
### `DELETE /ugc/v2/ugcs/:ugcId/like`
### `POST /ugc/v2/ugcs/:ugcId/reports`
### `POST /ugc/v2/ugcs/:ugcId/views`
### `POST /ugc/v2/ugcs/:ugcId/confirmation`

All accept an empty body (`{}`, unknown allowed).

---

## Challenge Match v1

### `PUT /challenge-match/v1/matches/:matchType`

**Params:**

| Field | Type | Required |
|-------|------|----------|
| `matchType` | `"ranked"` / `"friendly"` | **required** |

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `ugcId` | `string` (uuid) | optional |
| `opponentPid` | `string` (uuid) | optional |

### `DELETE /challenge-match/v1/matches/:matchId`

**Params:**

| Field | Type | Required |
|-------|------|----------|
| `matchId` | `string` (uuid) | **required** |

### `POST /challenge-match/v1/matches/:matchId/start-round`

**Params:** `matchId` (uuid) required.  
**Body:** `{}` (unknown allowed).

### `POST /challenge-match/v1/matches/:matchId/finalize-round`

**Params:** `matchId` (uuid) required.  
**Body:**

| Field | Type | Required |
|-------|------|----------|
| `score` | `number` (integer) | **required** |
| `tauntId` | `number` (integer) | **required** |

### `GET /challenge-match/v1/challenge-by-map/:mapName`

**Params:**

| Field | Type | Required |
|-------|------|----------|
| `mapName` | `string` | **required** |
