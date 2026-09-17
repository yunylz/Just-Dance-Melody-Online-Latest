const { AUTH_TOKEN_MALFORMED, AUTH_TOKEN_INVALID } = require('../http-codes');
const logger = require("../logger").createLogger({ service: "auth-psn2" });

const parse = (req, res, next) => {
    const token = req.token;
    try {
        if (!token || typeof token !== "string") return next(AUTH_TOKEN_MALFORMED);

        const decoded = Buffer.from(token, "base64").toString("utf8");
        if (!decoded) return next(AUTH_TOKEN_MALFORMED);

        const params = Object.fromEntries(new URLSearchParams(decoded));

        if (!params.code || !params.issuerid) return next(AUTH_TOKEN_MALFORMED);
        if (params.issuerid !== "256") return next(AUTH_TOKEN_INVALID);

        if (!/^[A-Za-z0-9_-]+$/.test(params.code)) return next(AUTH_TOKEN_MALFORMED);

        if (params.clientid) {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.clientid)) {
                return next(AUTH_TOKEN_MALFORMED);
            }
        }

        req.payload = {
            code: params.code,
            issuerId: params.issuerid,
            clientId: params.clientid,
        };
        return next();
    } catch (error) {
        logger.warn({ message: "PSN 2.0 token verification failed", error: error.message });
        return next(AUTH_TOKEN_MALFORMED);
    }
};

const verify = (req, res, next) => {
    parse(req, res, (err) => {
        if (err) return next(err);

        // Sony does not expose a public API to verify the user identity at this
        // stage, so we trust the body-supplied values.
        req.idOnPlatform = req.body.idOnPlatform;
        req.nameOnPlatform = req.body.nameOnPlatform;
        req.platformType = "psn";
        req.ubiservicesSession = true;

        return next();
    });
};

module.exports = { parse, verify };