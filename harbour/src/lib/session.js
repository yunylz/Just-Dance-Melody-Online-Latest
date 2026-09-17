const uuid = require("uuid");

const config = require("../config");

const SessionModel = require("./models/session");

const ticketLib = require("./ticket");
const cache = require("./cache");
const cacheKeys = require("./cache-keys");
const { generateVerifyCode } = require("./guest");

const { createLogger } = require("./logger");
const logger = createLogger({ service: "harbour-lib" });

class Session {
    constructor() {
        this.sessionTTL = config.HARBOUR_TICKET.SESSION_TTL;
        this.sessionTTLRememberMe = config.HARBOUR_TICKET.SESSION_TTL_REMEMBER_ME;
        this.sessionTTLS2s = config.HARBOUR_TICKET.SESSION_TTL_S2S;
    }

    getSessionKey(sessionId) {
        return `${cacheKeys.SESSION}:${sessionId}`;
    }

    async getSession(sessionId) {
        return await SessionModel.findOne({ sessionId });
    };

    /**
     * Creates a new session, issuing a signed Harbour ticket.
     * Writes to both Memcached (fast path) and MongoDB (dashboard / persistence).
     *
     * @param {Object}  options
     * @param {Object}  options.platform   - Platform definition object ({ id, ... })
     * @param {Object}  [options.profile]  - User profile (omit for S2S)
     * @param {Object}  options.app        - Application object
     * @param {number}  [options.expiration] - Custom expiry timestamp (ms)
     * @returns {Promise<{ ticket: string, sessionId: string, expiration: string }>}
     */
    async createSession({
        platform,
        platformType,
        profile,
        app,
        expiration,
        isAdmin = false,
        isModerator = false,
        isPatreon = false,
        isQA = false,
        jmcsEnv = null,
        isGuest = false
    }) {
        const sessionId = uuid.v4();
        const issuedAt = Date.now();

        const cacheKey = this.getSessionKey(sessionId);

        // Determine TTL
        const ttl = expiration ? (expiration - issuedAt) : this.sessionTTL;
        const finalExpiration = expiration || (issuedAt + ttl);

        // Generate a verification code if client is guest
        const verifyCode = isGuest ? await generateVerifyCode() : null;

        // Generate ticket
        const ticket = ticketLib.encrypt({
            profile,
            app,
            platform,
            platformType,
            sessionId,
            expiration: finalExpiration,
            isAdmin,
            isModerator,
            isPatreon,
            isQA,
            jmcsEnv,
            isGuest,
            verifyCode
        });

        const cachePayload = {
            env: config.ENV,
            date: issuedAt,
            sessionId,
            appId: app.appId,
            spaceId: app.spaceId,
            platform: platform.id,
            platformType,
            userId: profile.userId,
            profileId: profile.profileId,
            expiration: finalExpiration,
            isAdmin,
            isModerator,
            isPatreon,
            isQA,
            jmcsEnv,
            isGuest,
            verifyCode
        };

        // 1. Write to Memcached (primary fast path)
        await cache.set(cacheKey, cachePayload, Math.floor(ttl / 1000));

        // 2. Dual-write to MongoDB (dashboard / listing)
        try {
            await SessionModel.create(cachePayload);
        } catch (err) {
            // Non-fatal — Memcached write succeeded, session is still valid
            logger.warn({
                message: "Failed to write session to MongoDB",
                details: {
                    err: err.message,
                    ...cachePayload
                }
            });
        };

        return {
            ticket,
            sessionId,
            expiration: new Date(finalExpiration).toISOString()
        };
    };

    /**
     * Deletes a session from both Memcached and MongoDB.
     *
     * @param {string} sessionId
     * @returns {Promise<boolean>}
     */
    async deleteSession(sessionId) {
        const cacheKey = this.getSessionKey(sessionId);

        // Delete from Memcached
        try {
            await cache.delete(cacheKey);
        } catch (err) {
            logger.warn({
                message: "Failed to delete session from Memcached",
                details: {
                    err: err.message,
                    sessionId
                }
            });
        };

        // Delete from MongoDB
        try {
            await SessionModel.deleteOne({ sessionId });
        } catch (err) {
            logger.warn({
                message: "Failed to delete session from MongoDB",
                details: {
                    err: err.message,
                    sessionId
                }
            });
        };

        return true;
    };

    /**
     * Checks whether a session is still valid (via Memcached).
     *
     * @param {string} sessionId
     * @returns {Promise<boolean>}
     */
    async sessionExists(sessionId) {
        const cacheKey = this.getSessionKey(sessionId);
        try {
            const session = await cache.get(cacheKey);
            if (!session) return false;

            // This function will auto delete sessions that expired.
            // const isExpired = Date.now() > session.expiration;
            // if (isExpired) {
            //     logger.info({
            //         message: "sessionExists is now deleting an expired session",
            //         details: { sessionId, sessionExpiration: session.expiration }
            //     });
            //     await this.deleteSession(sessionId);
            //     return false;
            // };

            return true;
        } catch {
            return false;
        }
    };

    /**
     * Lists all currently active sessions from MongoDB, newest first.
     * Used by the admin dashboard.
     *
     * @returns {Promise<Object[]>}
     */
    async listSessions() {
        return SessionModel.find({ expiration: { $gt: new Date() } })
            .sort({ expiration: -1 })
            .lean();
    };

    async getVerifyCode(sessionId) {
        const session = await SessionModel.findOne(
            { sessionId, isGuest: true, expiration: { $gt: new Date() } },
            { verifyCode: 1 }
        );
        return session?.verifyCode || null;
    };
};

module.exports = new Session();
