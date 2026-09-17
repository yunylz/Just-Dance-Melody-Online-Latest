/**
 * @module auth/pc
 *
 * Official Uplay PC ("uplaypc_v1") authentication handler.
 *
 * Handles tokens from legitimate (non-cracked) Uplay PC clients.
 * The authorisation header format is:
 * ```
 * uplaypc_v1 t=<token>
 * ```
 *
 * Unlike crack tokens (which start with `JDMO:`), official tokens are
 * forwarded to the Hub for verification without any prefix.
 *
 * On success sets:
 * - `req.idOnPlatform`       — Hub user UUID
 * - `req.nameOnPlatform`     — Hub username
 * - `req.platformType`       — `"uplay"`
 * - `req.platform`           — Overridden to `{ id: "uplay" }`
 * - `req.ubiservicesSession` — `false`
 */

const ubiservices = require("../ubiservices");

const { AUTH_TOKEN_MALFORMED, AUTH_VERIFICATION_FAILED } = require("../http-codes");
const { createLogger } = require("../logger");
const logger = createLogger({ service: "auth-pc" });

/**
 * Parses the official Uplay PC token.
 *
 * @type {import("express").RequestHandler}
 */
const parse = (req, res, next) => {
    const token = req.token;
    try {
        if (!token || typeof token !== "string") {
            logger.warn({ message: "Token is undefined or not a string" });
            return next(AUTH_TOKEN_MALFORMED);
        }

        req.payload = { token };
        return next();
    } catch (error) {
        logger.warn({ message: "PC token parsing failed", error: error.message });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

/**
 * Verifies the official Uplay PC token against Ubisoft's servers.
 *
 * Delegates identity verification to `ubiservices.createSession()`, just
 * like the PS4 and NX auth paths.  The actual Hub profile lookup and
 * session creation happen later in `handleUbiservicesSession`.
 *
 * On success sets:
 * - `req.ubiservicesSession` — `true` (signals session-client to use
 *   the Ubiservices session flow)
 * - `req.payload` — the parsed token (for logging/debugging)
 *
 * @type {import("express").RequestHandler}
 */
const verify = (req, res, next) => {
    parse(req, res, async (err) => {
        if (err) return next(err);

        // Mark this as a Ubiservices-backed session — the actual
        // `ubiservices.createSession()` call happens in
        // session-client's handleUbiservicesSession, just like PS4/NX.
        req.ubiservicesSession = true;

        logger.info({
            message: "Official Uplay PC token accepted, forwarding to Ubiservices",
            details: { platform: req.platform?.id, appId: req.appId }
        });

        return next();
    });
};

module.exports = { parse, verify };
