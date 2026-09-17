const crypto = require("node:crypto");
const { parseString } = require("xml2js");

const config = require("../../config");
const {
    PLATFORM_ID_MISMATCH, USERNAME_MISMATCH, PRETENDO_ERROR, BANNED_DEVICE,
    AUTH_TOKEN_MALFORMED, AUTH_TOKEN_INVALID
} = require("../http-codes");
const Pretendo = require("../pretendo");
const bannedDevices = require("../../data/banned-devices");
const logger = require("../logger").createLogger({ service: "auth-wiiu" });

const parse = (req, res, next) => {
    const token = req.token;
    try {
        if (!token || typeof token !== "string") throw new Error("Invalid token format");

        const key = Buffer.from(config.PRETENDO.SECRET_KEY, "hex");
        const iv = Buffer.from(config.PRETENDO.IV, "hex");

        const cleanBase64 = token.replace(/[^A-Za-z0-9+/=]/g, "");
        if (!cleanBase64) throw new Error("No valid base64 content in token");

        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(Buffer.from(cleanBase64, "base64"), undefined, "utf8");
        decrypted += decipher.final("utf8");

        const parsed = JSON.parse(decrypted);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid decrypted data structure");

        // Basic structural checks
        for (const field of ["deviceType", "deviceId", "serial", "titleId"]) {
            if (!parsed[field]) return next(AUTH_TOKEN_INVALID);
        }

        // Timestamp check
        if (parsed.timestamp) {
            const tokenTime = new Date(parsed.timestamp * 1000);
            const now = new Date();
            if (isNaN(tokenTime.getTime()) || Math.abs(now - tokenTime) > 24 * 60 * 60 * 1000) {
                return next(AUTH_TOKEN_INVALID);
            }
        }

        req.payload = parsed;
        return next();
    } catch (error) {
        logger.warn({ message: "WiiU token decryption failed", error: error.message });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

const verify = async (req, res, next) => {
    parse(req, res, async (err) => {
        if (err) return next(err);

        const idOnPlatform = req.body.idOnPlatform;
        const nameOnPlatform = req.body.nameOnPlatform;

        // Note: The original implementation seemed to expect clientId/clientSecret in payload,
        // but they are not in the decrypted token. They might be from config or passed elsewhere.
        // For now, keeping the user's logic but it might need adjustment if clientId is missing.
        const pretendo = new Pretendo({
            clientId: req.payload.clientId,
            clientSecret: req.payload.clientSecret,
            bearerToken: req.payload.authorization
        });

        try {
            const me = await pretendo.getMe();

            parseString(me, async (err, profile) => {
                if (err || !profile?.person) return next(PRETENDO_ERROR);

                const username = String(profile.person.user_id[0]);
                const playerId = String(profile.person.pid[0]);
                const platformId = String(idOnPlatform);

                if (platformId !== playerId) return next(PLATFORM_ID_MISMATCH);
                if (String(nameOnPlatform) !== username) return next(USERNAME_MISMATCH);
                if (bannedDevices.wiiu.includes(platformId)) return next(BANNED_DEVICE);

                req.idOnPlatform = playerId;
                req.nameOnPlatform = username;
                req.platformType = "wiiu";
                req.ubiservicesSession = false;

                return next();
            });
        } catch (error) {
            logger.error({ message: "WiiU Pretendo /me request failed", error: error.message });
            return next(PRETENDO_ERROR);
        }
    });
};

module.exports = { parse, verify };