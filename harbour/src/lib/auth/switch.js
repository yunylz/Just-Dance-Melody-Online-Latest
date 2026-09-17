const utils = require("../utils");
const { AUTH_TOKEN_MALFORMED, AUTH_TOKEN_EXPIRED, INVALID_SWITCH_TICKET } = require("../http-codes");
const logger = require("../logger").createLogger({ service: "auth-switch" });

const parse = (req, res, next) => {
    const token = req.token;
    try {
        if (!token || typeof token !== "string") return next(AUTH_TOKEN_MALFORMED);

        const [header, payload, signature] = token.split(".");
        if (!header || !payload || !signature) return next(AUTH_TOKEN_MALFORMED);

        const decodedHeader = Buffer.from(header, "base64").toString("utf8");
        const decodedPayload = Buffer.from(payload, "base64").toString("utf8");
        let headerObj, payloadObj;

        try {
            headerObj = JSON.parse(decodedHeader);
            payloadObj = JSON.parse(decodedPayload);
        } catch {
            return next(AUTH_TOKEN_MALFORMED);
        }

        if (!headerObj.alg || !headerObj.kid || !headerObj.jku) return next(AUTH_TOKEN_MALFORMED);
        if (!payloadObj.aud || !payloadObj.sub || !payloadObj.nintendo || !payloadObj.iss || !payloadObj.exp || !payloadObj.iat || !payloadObj.jti) {
            return next(AUTH_TOKEN_MALFORMED);
        }

        const now = Math.floor(Date.now() / 1000);
        if (payloadObj.exp < now && !utils.isDev()) {
            return next(AUTH_TOKEN_EXPIRED);
        }

        let jkuHost, issHost;
        try {
            jkuHost = new URL(headerObj.jku).hostname;
            issHost = new URL(payloadObj.iss).hostname;
        } catch {
            return next(AUTH_TOKEN_MALFORMED);
        }

        if (!jkuHost.endsWith("nintendo.com") || !issHost.endsWith("nintendo.com")) {
            return next(INVALID_SWITCH_TICKET);
        }

        req.payload = { header: headerObj, payload: payloadObj, rawToken: token };
        return next();
    } catch (error) {
        logger.warn({ message: "Switch token verification failed", error: error.message });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

const verify = (req, res, next) => {
    parse(req, res, (err) => {
        if (err) return next(err);

        // For Switch, we trust the ticket content
        req.idOnPlatform = req.body.idOnPlatform;
        req.nameOnPlatform = req.body.nameOnPlatform;
        req.platformType = "switch";
        req.ubiservicesSession = true;

        return next();
    });
};

module.exports = { parse, verify };
