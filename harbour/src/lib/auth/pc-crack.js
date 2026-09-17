/**
 * @module auth/pc-crack
 *
 * PC crack ("uplaypc_v1") authentication handler.
 *
 * Handles tokens from cracked PC clients.  The authorisation header format is:
 * ```
 * uplaypc_v1 t=JDMO:<encrypted_ticket>
 * ```
 *
 * The `JDMO:` prefix identifies the ticket as a PC crack token.  The full
 * `JDMO:<encrypted_ticket>` value is forwarded to the Hub's
 * `/auth/v1/verify-ticket` endpoint, which decrypts it, validates the
 * embedded auth file password, checks expiry, and returns the user's
 * `UserId`, `Username`, and `Email` on success.
 *
 * On success sets:
 * - `req.idOnPlatform`       — Hub user UUID
 * - `req.nameOnPlatform`     — Hub username
 * - `req.platformType`       — `"uplay"`
 * - `req.platform`           — Overridden to `{ id: "uplay" }` so profile
 *                              lookups use the correct platform on the Hub.
 * - `req.ubiservicesSession` — `false`
 */

const { v4: uuidv4 } = require("uuid");

const { AUTH_TOKEN_MALFORMED, AUTH_VERIFICATION_FAILED } = require("../http-codes");
const hubHelper = require("../hub-helper");
const { createLogger } = require("../logger");
const logger = createLogger({ service: "auth-pc-crack" });

/**
 * Validates the presence of the `JDMO:` prefix and stores the full ticket
 * string for verification.
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

        // Must start with "JDMO:" — the PC crack magic prefix
        if (!token.startsWith("JDMO:")) {
            logger.warn({ message: "PC crack token missing JDMO: prefix" });
            return next(AUTH_TOKEN_MALFORMED);
        }

        req.payload = { ticket: token };
        return next();
    } catch (error) {
        logger.warn({ message: "PC crack token parsing failed", error: error.message });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

/**
 * Verifies the PC crack ticket by calling the Hub's `/auth/v1/verify-ticket`
 * endpoint, which decrypts the `JDMO:<encrypted>` payload, validates the
 * auth file password and expiry, and returns the verified user info.
 *
 * @type {import("express").RequestHandler}
 */
const verify = (req, res, next) => {
    parse(req, res, async (err) => {
        if (err) return next(err);

        const { ticket } = req.payload;

        try {
            const result = await hubHelper.verifyTicket(ticket);

            if (!result || !result.success) {
                logger.warn({ message: "PC crack ticket verification failed" });
                return next(AUTH_VERIFICATION_FAILED);
            }

            const { UserId, Username } = result.payload;

            req.nameOnPlatform = Username;
            req.platformType = "uplay";
            req.platform = { id: "uplay" };
            req.ubiservicesSession = false;

            // Ensure the user has a uplay profile on the Hub — create one if missing
            const hubUser = await hubHelper.getUser({ userId: UserId });
            let uplayProfile = hubUser?.profiles?.find(p => p.platformType === "uplay");

            if (!uplayProfile) {
                const profileId = uuidv4();

                logger.info({
                    message: "User has no uplay profile on Hub, creating one",
                    details: { userId: UserId, username: Username, profileId }
                });

                uplayProfile = await hubHelper.createUplayProfile(UserId, {
                    username: Username,
                    platform: "uplay",
                    idOnPlatform: profileId,
                    profileId
                });

                if (uplayProfile) {
                    logger.info({
                        message: "Uplay profile created successfully",
                        details: { userId: UserId, profileId }
                    });
                } else {
                    logger.warn({
                        message: "Failed to create Uplay profile (non-fatal, session may still work)",
                        details: { userId: UserId }
                    });
                }
            }

            // Use the profile ID (existing or newly created) as idOnPlatform
            req.idOnPlatform = uplayProfile?.profileId || uplayProfile?.idOnPlatform || UserId;

            logger.info({
                message: "PC crack ticket verified successfully",
                details: { userId: UserId, username: Username }
            });

            return next();
        } catch (err) {
            logger.error({
                message: "PC crack verification threw an exception",
                error: err.message
            });
            return next(AUTH_VERIFICATION_FAILED);
        }
    });
};

module.exports = { parse, verify };
