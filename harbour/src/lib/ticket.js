/**
 * @module ticket
 *
 * Harbour session ticket — a lightweight JWE (JSON Web Encryption) token
 * issued by the server after a successful platform authentication flow.
 *
 * A Harbour ticket is **not** the same as a platform credential:
 *   - Platform credentials (PSN NP tickets, Nintendo JWTs, WiiU tokens, …) are
 *     used **once** during login to prove the user's identity to the console
 *     manufacturer.  They are verified by `auth-handler.js` / `lib/auth/`.
 *   - A Harbour ticket is issued **by this server** after that check passes and
 *     must be included in every subsequent API request as
 *     `Authorization: Ubi_v1 t=<ticket>`.  It is verified by `ticket-client.js`.
 *
 * Token format: JWE Compact Serialization (dir + A256GCM)
 * `<header>.<encrypted_key>.<iv>.<ciphertext>.<auth_tag>`
 * Encryption algorithm: AES-256-GCM with `config.HARBOUR_TICKET.SECRET`.
 * Default lifetime: 3 hours.
 */

const crypto = require("crypto");
const config = require("../config");
const { TICKET_EXPIRED, UNAUTHORIZED } = require("./http-codes");
const logger = require("./logger").createLogger({ service: "token" });

/**
 * @typedef {Object} TicketClaims
 * @property {string}   uid         - Hub user UUID (absent on S2S tokens).
 * @property {string}   pid         - Hub profile UUID.
 * @property {string}   aid         - Application ID the session was created for.
 * @property {string}   sid         - Session UUID (stored in cache).
 * @property {string}   [productId] - Space / product UUID (non-S2S only).
 * @property {string}   [spid]      - Alias for productId used by some older tokens.
 * @property {string}   platform    - Platform ID (e.g. "nx", "ps4", "wiiu").
 * @property {string}   environment - Server environment (e.g. "Dev", "Prod").
 * @property {number}   exp         - Unix timestamp (seconds) when the token expires.
 * @property {boolean}  [isAdmin]   - Whether the user has admin privileges.
 * @property {boolean}  [isModerator] - Whether the user has moderator privileges.
 * @property {string}   [jmcsEnv]   - The target JMCS environment for this session.
 * @property {string}   genomeId    - Same as `aid`; included for client compatibility.
 * @property {string[]} [pids]      - Array containing `pid` (non-S2S only).
 * @property {boolean}  [s2s]       - Present and `true` on server-to-server tokens.
 */

/**
 * @typedef {Object} EncryptOptions
 * @property {Object}  profile            - Hub profile object.
 * @property {string}  profile.userId     - Hub user UUID.
 * @property {string}  profile.profileId  - Hub profile UUID.
 * @property {Object}  app                - Application object.
 * @property {string}  app.appId          - Application UUID.
 * @property {string}  [app.spaceId]      - Space UUID (falls back to `appId`).
 * @property {Object}  platform           - Platform definition object.
 * @property {string}  platform.id        - Platform ID string.
 * @property {number}  [expiration]       - Absolute expiry timestamp in **milliseconds**.
 *                                          Defaults to `now + 3 hours`.
 * @property {string}  sessionId          - Session UUID to embed in the ticket.
 * @property {boolean} [isAdmin=false]    - Admin status.
 * @property {boolean} [isModerator=false] - Moderator status.
 * @property {string}  [jmcsEnv="prod"]     - JMCS environment.
 * @property {boolean} [isS2s=false]      - Whether to issue a server-to-server token.
 */

/**
 * @typedef {Object} DecryptResult
 * @property {{ typ: string, alg: string }} header - Decoded JWT header.
 * @property {TicketClaims}                 claims  - Decoded and validated claims.
 */

class Ticket {
  constructor() {
    /** @type {string} Base64-encoded secret from config. */
    this.secret = config.HARBOUR_TICKET.SECRET;

    /** @type {number} Default token lifetime in seconds (3 hours). */
    this.expiration = 3 * 60 * 60;
  }

  get encryptionKey() {
    if (this._encryptionKey) return this._encryptionKey;
    const buf = Buffer.from(this.secret, "base64");
    this._encryptionKey = buf.length === 32 ? buf : crypto.createHash("sha256").update(buf).digest();
    return this._encryptionKey;
  }

  // ─── Encoding helpers ────────────────────────────────────────────────────

  /**
   * Encodes a string or Buffer to URL-safe base64 (no padding).
   *
   * @param {string | Buffer} input
   * @returns {string} Base64URL-encoded string.
   */
  base64url(input) {
    return Buffer.from(input)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  /**
   * Decodes a URL-safe base64 string back to a UTF-8 string.
   * Re-adds stripped padding before decoding.
   *
   * @param {string} input - Base64URL-encoded string.
   * @returns {string} Decoded UTF-8 string.
   */
  base64urlDecode(input) {
    let padded = input;
    while (padded.length % 4) {
      padded += "=";
    }
    padded = padded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64").toString("utf8");
  }

  /**
   * Decodes a URL-safe base64 string back to a Buffer.
   *
   * @param {string} input - Base64URL-encoded string.
   * @returns {Buffer} Decoded Buffer.
   */
  base64urlDecodeToBuffer(input) {
    let padded = input;
    while (padded.length % 4) {
      padded += "=";
    }
    padded = padded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64");
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Issues a signed Harbour ticket (JWT-style: `header.claims.signature`).
   *
   * @param {EncryptOptions} options
   * @returns {string | null} The signed ticket string, or `null` if signing failed.
   */
  encrypt({
    profile,
    app,
    platform,
    platformType,
    expiration,
    sessionId,
    isAdmin,
    isModerator,
    isPatreon,
    isQA,
    jmcsEnv,
    isGuest,
    verifyCode
  }) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const exp = expiration ? Math.floor(expiration / 1000) : now + this.expiration;

      /** @type {TicketClaims} */
      let claimsObj = {
        uid: profile.userId,
        pid: profile.profileId,
        aid: app.appId,
        sid: sessionId,
        platform: platform.id,
        platformType: platformType,
        environment: config.ENV,
        exp: exp,
        admin: isAdmin || false,
        mod: isModerator || false,
        patreon: isPatreon || false,
        qa: isQA || false,
        jmcsEnv: jmcsEnv || "prod",
        guest: isGuest,
        vfc: verifyCode
      };

      // Encryption with JWE
      const headerObj = { alg: "dir", enc: "A256GCM" };
      const headerB64 = this.base64url(JSON.stringify(headerObj));

      const iv = crypto.randomBytes(12);
      const key = this.encryptionKey;

      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(headerB64, "ascii"));

      const plaintext = JSON.stringify(claimsObj);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();

      return `${headerB64}..${this.base64url(iv)}.${this.base64url(ciphertext)}.${this.base64url(tag)}`;
    } catch (err) {
      logger.error({
        message: "Failed to generate Harbour ticket",
        details: {
          err: err.message,
          sessionId,
          isGuest,
          verifyCode
        }
      });
      return null;
    }
  }

  /**
   * Verifies the signature of a Harbour ticket and decodes its claims.
   *
   * Returns `{ error, result: null }` on any failure so callers never have to
   * catch exceptions — the same contract used by `auth-handler.js`.
   *
   * @param {string} token - A Harbour ticket string (`header.claims.signature`).
   * @returns {{ error: Object|null, result: DecryptResult|null }}
   */
  decrypt(token) {
    try {
      const parts = token.split(".");

      if (parts.length !== 5) {
        return { error: UNAUTHORIZED };
      }

      const [headerB64, encryptedKeyB64, ivB64, ciphertextB64, tagB64] = parts;

      if (!headerB64 || !ivB64 || !ciphertextB64 || !tagB64) {
        return { error: UNAUTHORIZED };
      }

      const header = JSON.parse(this.base64urlDecode(headerB64));
      if (header.alg !== "dir" || header.enc !== "A256GCM") {
        return { error: UNAUTHORIZED };
      }

      const key = this.encryptionKey;
      const iv = this.base64urlDecodeToBuffer(ivB64);
      const ciphertext = this.base64urlDecodeToBuffer(ciphertextB64);
      const tag = this.base64urlDecodeToBuffer(tagB64);

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(headerB64, "ascii"));

      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const claims = JSON.parse(plaintext.toString("utf8"));

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp && claims.exp < now) {
        return { error: TICKET_EXPIRED };
      }

      return { result: { header, claims }, error: null };
    } catch (err) {
      logger.error({
        message: "Invalid or tampered token",
        details: {
          token: `${token.slice(0, 10)}...`,
          error: err.message,
        }
      });
      return { error: UNAUTHORIZED, result: null };
    }
  }

  /**
   * Convenience wrapper — returns the decoded claims object or `null`.
   *
   * @param {string} token - A Harbour ticket string.
   * @returns {TicketClaims | null}
   */
  getClaims(token) {
    const { result } = this.decrypt(token);
    return result ? result.claims : null;
  }

  /**
   * Convenience wrapper — returns `true` if the ticket has a valid signature
   * and has not expired.
   *
   * @param {string} token - A Harbour ticket string.
   * @returns {boolean}
   */
  isValid(token) {
    const { result } = this.decrypt(token);
    return result !== null;
  }
};

module.exports = new Ticket();