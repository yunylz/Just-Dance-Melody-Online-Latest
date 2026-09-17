
const { SESSION_EXPIRED, USER_NOT_FOUND, INTERNAL_SERVER_ERROR, TAMPERED_TOKEN } = require("./http-codes");
const token = require("./token");
const utils = require("./utils");
const User = require("./models/user");

class Session {
    constructor() {
        this.sessionTTL = (1000 * 60 * 60) * 24; // 24 hours in ms
        this.sessionTTLRememberMe = (1000 * 60 * 60) * 24 * 30; // 30 days in ms
    }

    // Create a session for user + email
    createSession(user = {}, isTauri = false) {
        const issuedAt = Date.now();
        const expiration = issuedAt + this.sessionTTLRememberMe; // Always 30 days
        const payload = {
            uid: user.userId,
            u: user.username,
            c: user.country,
            e: user.email,
            t: isTauri ? 1 : 0,
            iat: issuedAt,
            exp: expiration
        };
        const sessionData = {
            username: user.username,
            token: token.generate(payload),
            userId: user.userId,
            isTauri,
            exp: expiration,
            expDate: new Date(expiration).toISOString(),
            serverTime: new Date(issuedAt).toISOString()
        };

        if (user.status && (user.status.admin || user.status.moderator)) {
            sessionData.jmcsEnv = user.status.jmcsEnv;
        }

        return sessionData;
    }

    // Verify + decrypt a session token
    verifySession(sessionToken) {
        const decoded = token.decrypt(sessionToken);
        if (!decoded) return {
            error: TAMPERED_TOKEN
        };

        // Check expiry
        if (!utils.isLocal() && Date.now() > decoded.exp) {
            return {
                error: SESSION_EXPIRED
            };
        };

        return {
            verified: true,
            payload: decoded
        };
    }
}

module.exports = new Session();
