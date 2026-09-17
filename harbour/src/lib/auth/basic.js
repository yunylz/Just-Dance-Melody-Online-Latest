const { v4: uuidv4 } = require("uuid");

const { UNKNOWN_HUB_ERROR, AUTH_TOKEN_MALFORMED } = require("../http-codes");
const hubHelper = require("../hub-helper");
const { createLogger } = require("../logger");
const logger = createLogger({ service: "auth-basic" });

const parse = (req, res, next) => {
    const token = req.token;
    try {
        if (!token || typeof token !== "string") {
            logger.warn({
                message: "Token is undefined or not a string"
            });
            return next(AUTH_TOKEN_MALFORMED);
        }

        // Strip "Basic " prefix if the caller forgot to strip it
        const base64Part = token.startsWith("Basic ") ? token.slice(6).trim() : token.trim();
        if (!base64Part) {
            logger.warn({
                message: "Missing base64 content in Basic token"
            });
            return next(AUTH_TOKEN_MALFORMED);
        };

        const decoded = Buffer.from(base64Part, "base64").toString("utf8");
        const colonIdx = decoded.indexOf(":");

        if (colonIdx === -1) {
            logger.warn({
                message: "Invalid Basic auth format — missing colon"
            });
            return next(AUTH_TOKEN_MALFORMED);
        }

        const username = decoded.slice(0, colonIdx);
        const password = decoded.slice(colonIdx + 1);

        if (!username || !password) {
            logger.warn({
                message: "Invalid Basic auth format"
            });
            return next(AUTH_TOKEN_MALFORMED);
        }

        req.payload = { username, password };

        return next();
    } catch (error) {
        logger.warn({
            message: "Basic token verification failed",
            error: error.message
        });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

const verify = (req, res, next) => {
    parse(req, res, async (err) => {
        if (err) return next(err);

        const { username, password } = req.payload;

        try {
            const loginData = await hubHelper.login(username, password);

            if (!loginData?.success) {
                logger.error({ message: "Hub login unsuccessful", details: { username, twoFactorRequired: loginData?.twoFactorRequired } });
                return next(UNKNOWN_HUB_ERROR);
            }

            if (!loginData.session) {
                logger.error({ message: "Hub login returned no session", details: { username, loginData } });
                return next(UNKNOWN_HUB_ERROR);
            }

            req.idOnPlatform = loginData.session.userId;
            req.nameOnPlatform = loginData.session.username;
            req.platformType = "uplay";
            req.platform = { id: "uplay" };
            req.ubiservicesSession = false;

            // Ensure the user has a uplay profile on the Hub — create one if missing
            const hubUser = await hubHelper.getUser({ userId: loginData.session.userId });
            let uplayProfile = hubUser?.profiles?.find(p => p.platformType === "uplay");

            if (!uplayProfile) {
                const profileId = uuidv4();

                logger.info({
                    message: "User has no uplay profile on Hub, creating one",
                    details: { userId: loginData.session.userId, username: loginData.session.username, profileId }
                });

                uplayProfile = await hubHelper.createUplayProfile(loginData.session.userId, {
                    username: loginData.session.username,
                    platform: "uplay",
                    idOnPlatform: loginData.session.userId,
                    profileId
                });

                if (uplayProfile) {
                    logger.info({
                        message: "Uplay profile created successfully",
                        details: { userId: loginData.session.userId, profileId }
                    });
                } else {
                    logger.warn({
                        message: "Failed to create uplay profile (non-fatal, session may still work)",
                        details: { userId: loginData.session.userId }
                    });
                }
            }

            return next();
        } catch (err) {
            logger.error({ message: "Hub login threw an exception", error: err.message, details: { username } });
            return next(UNKNOWN_HUB_ERROR);
        };
    });
};

module.exports = {
    parse, verify
};