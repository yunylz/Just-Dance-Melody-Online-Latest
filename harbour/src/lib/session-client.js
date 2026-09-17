const config = require("../config");

const UbiservicesSession = require("./models/us-session");

const hubHelper = require("./hub-helper");
const session = require("./session");
const ubiservices = require("./ubiservices");

const { createLogger } = require("./logger");
const logger = createLogger({ service: "session-client" });

const {
    USER_NOT_ON_HUB, PLATFORM_NOT_AVAILABLE, USER_DOESNT_HAVE_PLATFORM,
    INACTIVE_ACCOUNT, LOCKED_ACCOUNT, BANNED_ACCOUNT,
    UBISERVICES_ERROR,
    UBISERVICES_PSN_ERROR
} = require("./http-codes");

// Platforms that must go through Ubiservices for identity verification
const UBISERVICES_PLATFORMS = ["ps4", "nx", "uplay"];

// ─── Shared response builder ──────────────────────────────────────────────────

const sendSessionResponse = (res, {
    platformType, ticket, profileId, userId, nameOnPlatform, expiration, spaceId, clientIp, clientIpCountry, sessionId, isAdmin, isModerator, jmcsEnv, isGuest }
) => {
    return res.json({
        platformType,
        ticket,
        twoFactorAuthenticationTicket: null,
        profileId,
        userId,
        nameOnPlatform,
        environment: "Prod", // TODO: use config.ENV when compatible
        expiration,
        spaceId,
        clientIp,
        clientIpCountry,
        isAdmin,
        isModerator,
        jmcsEnv,
        isGuest,
        serverTime: new Date().toISOString(),
        sessionId,
        sessionKey: "tOUfMdjy38N7ORzNcsXofATeXCKDiwnIzNsfo7h2qhD3Z+WV9RWpQEYWUg0J+XtuXom+qOi04+5eS3CcCz/99w==",
        rememberMeTicket: null,
        // (for v2 sessions)
        token: null,
        accountIssues: null,
        hasAcceptedLegalOptins: true
    });
};

// ─── Store Ubiservices session ────────────────────────────────────────────────
// Non-fatal — if this fails the Harbour session is still valid.

const storeUbiservicesSession = async ({ harbourSessionId, usSessionId, usUserId, usProfileId, usTicket, usNameOnPlatform, expiration }) => {
    await UbiservicesSession.create({
        harbourSessionId,
        usSessionId,
        userId: usUserId,
        profileId: usProfileId,
        nameOnPlatform: usNameOnPlatform,
        ticket: usTicket,
        expiration: new Date(expiration)
    }).catch(err => logger.warn({
        message: "Failed to write Ubiservices session to MongoDB",
        details: { harbourSessionId, error: err.message }
    }));
};

// ─── Shared Hub user → session flow ──────────────────────────────────────────
// Called by both paths once they have a confirmed Hub user.
// All status checks, profile lookups, and session creation live here.
// usData is only present when called from handleUbiservicesSession.

const createLinkedSession = async (req, res, next, hubUser, usData = null) => {
    const { platform, platformType, idOnPlatform, nameOnPlatform, application } = req;
    const { spaceId } = req;

    const platformId = platform.id;
    const clientIp = req.clientIp || req.ip;
    const clientIpCountry = req.clientCountry || config.DEFAULT_COUNTRY;

    // Account status checks — edit here for all platforms
    const { status } = hubUser;
    if (status.inactiveAccount) return next(INACTIVE_ACCOUNT);
    if (status.locked) return next(LOCKED_ACCOUNT);
    if (status.banned) return next(BANNED_ACCOUNT);

    const isAdmin = status.admin;
    const isModerator = status.moderator;
    const isPatreon = hubUser.patreon && hubUser.patreon.isSubscribed && hubUser.patreon.isSubscribed == true;
    const isQA = status.qa;

    const jmcsEnv = status.jmcsEnv || "prod";

    const profile = await hubHelper.getProfile(hubUser.userId, platformId);
    if (!profile) {
        logger.warn({ message: "User has no profile for this platform", details: { nameOnPlatform, platformType } });
        return next(USER_DOESNT_HAVE_PLATFORM);
    }

    const { userId, profileId } = profile;

    // Keep idOnPlatform fresh on Hub (WiiU sends this; Ubiservices platforms already have it stored)
    if (idOnPlatform) {
        await hubHelper.updateProfile(hubUser.userId, platform.id, { idOnPlatform });
        logger.info({ message: "Updated idOnPlatform on Hub", details: { idOnPlatform, nameOnPlatform, platformType } });
    }

    const { ticket, expiration, sessionId } = await session.createSession({
        platform,
        platformType,
        profile,
        app: application,
        isAdmin: isAdmin,
        isModerator: isModerator,
        isPatreon: isPatreon,
        isQA: isQA,
        jmcsEnv: jmcsEnv,
        isGuest: false
    });

    // Store Ubiservices session if this came from the Ubiservices path
    if (usData) {
        await storeUbiservicesSession({
            harbourSessionId: sessionId,
            usSessionId: usData.usSessionId,
            usUserId: usData.usUserId,
            usProfileId: usData.usProfileId,
            usTicket: usData.usTicket,
            usNameOnPlatform: usData.usNameOnPlatform,
            expiration
        });
    }

    logger.info({
        message: `Created session for ${nameOnPlatform} on "${platform.id}"`,
        details: { authType: req.authType, userId, profileId, isAdmin, isModerator, isPatreon, isQA, jmcsEnv }
    });

    return sendSessionResponse(res, {
        platformType,
        ticket,
        profileId,
        userId,
        nameOnPlatform,
        expiration,
        spaceId,
        clientIp,
        clientIpCountry,
        sessionId,
        isAdmin: isAdmin,
        isModerator: isModerator,
        isPatreon: isPatreon,
        isQA: isQA,
        jmcsEnv: jmcsEnv,
        isGuest: false
    });
};

// ─── Ubiservices path (PS4 / NX) ─────────────────────────────────────────────

const handleUbiservicesSession = async (req, res, next) => {
    const { version, platform, platformType, nameOnPlatform, application } = req;
    const { appId, spaceId } = req;
    const clientIp = req.ip;
    const clientIpCountry = req.clientCountry || config.DEFAULT_COUNTRY;

    // Always verify identity through Ubiservices first
    let usSession;
    try {
        usSession = await ubiservices.createSession({
            version,
            appId,
            authorization: req.headers.authorization,
            body: req.body
        });
    } catch (err) {
        if (err?.response?.data?.errorCode === 3) {
            return next({
                ...UBISERVICES_PSN_ERROR,
                message: err.response.data.message,
                ubiservices: err.response.data
            });
        };

        logger.error({
            message: "Failed to create Ubiservices session",
            details: { platformId: platform.id, appId, error: err?.response?.data ?? err.message }
        });
        return next(UBISERVICES_ERROR);
    }

    const usTicket = usSession.ticket;
    const usUserId = usSession.userId;
    const usProfileId = usSession.profileId;
    const usSessionId = usSession.sessionId;
    const usNameOnPlatform = usSession.nameOnPlatform;

    // Some auth paths (e.g. official PC) don't have nameOnPlatform from
    // local token parsing — use the value Ubisoft returned instead.
    if (!req.nameOnPlatform) req.nameOnPlatform = usNameOnPlatform;

    const usData = { usTicket, usUserId, usProfileId, usSessionId, usNameOnPlatform };

    // Check if this Ubiservices profileId is linked to a Hub account
    const hubUser = await hubHelper.getUser({ "profiles.profileId": usProfileId });

    if (!hubUser) {
        // ── Guest path: not on Hub ────────────────────────────────────────────
        logger.info({
            message: "Ubiservices user not found on Hub, issuing guest session",
            details: { platformId: platform.id, appId, usProfileId, usUserId, usNameOnPlatform }
        });

        const { ticket, expiration, sessionId } = await session.createSession({
            platform,
            platformType,
            profile: { userId: usUserId, profileId: usProfileId },
            app: application,
            isAdmin: false,
            isModerator: false,
            isPatreon: false,
            isQA: false,
            jmcsEnv: "prod",
            isGuest: true
        });

        await storeUbiservicesSession({
            harbourSessionId: sessionId,
            usSessionId,
            usUserId,
            usProfileId,
            usTicket,
            usNameOnPlatform,
            expiration
        });

        logger.info({
            message: `Created guest session for ${nameOnPlatform} on "${platform.id}"`,
            details: { usProfileId, sessionId }
        });

        return sendSessionResponse(res, {
            platformType,
            ticket,
            profileId: usProfileId,
            userId: usUserId,
            nameOnPlatform,
            expiration,
            spaceId,
            clientIp,
            clientIpCountry,
            sessionId,
            isAdmin: false,
            isModerator: false,
            isPatreon: false,
            isQA: false,
            jmcsEnv: "prod",
            isGuest: true
        });
    }

    // ── Linked path: hand off to shared flow, passing usData along ────────────
    return createLinkedSession(req, res, next, hubUser, usData);
};

// ─── Standard path (WiiU / others) ───────────────────────────────────────────

const handleStandardSession = async (req, res, next) => {
    const { platform, nameOnPlatform } = req;
    const platformId = platform.id;

    const hubUser = await hubHelper.getUser({ "profiles.nameOnPlatform": nameOnPlatform });
    if (!hubUser) {
        logger.warn({ message: "User not found on Hub", details: { nameOnPlatform, platformId } });
        return next(USER_NOT_ON_HUB);
    }

    // Hand off to shared flow — no usData since this is a local auth path
    return createLinkedSession(req, res, next, hubUser);
};

// ─── Entry point ──────────────────────────────────────────────────────────────

const handleSessions = async (req, res, next) => {
    const platformId = req.platform.id;

    logger.info({
        message: "Creating session",
        details: {
            application: { name: req.application?.name, appId: req.appId, platformId },
            authType: req.authType,
            platformType: req.platformType,
            idOnPlatform: req.idOnPlatform,
            nameOnPlatform: req.nameOnPlatform,
            version: req.version
        }
    });

    try {
        if (UBISERVICES_PLATFORMS.includes(platformId) && req.ubiservicesSession) {
            return await handleUbiservicesSession(req, res, next);
        }
        return await handleStandardSession(req, res, next);
    } catch (err) {
        logger.error({ message: "Unhandled session creation error", error: err.message });
        return next(err);
    }
};

const handleSessionDeletion = async (req, res, next) => {
    if (!req.sessionId) return next(UNAUTHORIZED);

    const exists = await session.sessionExists(req.sessionId);
    if (!exists) return next(SESSION_NOT_FOUND);

    // If a Ubiservices session is linked, delete it there too
    const usSession = await UbiservicesSession.findOne({ harbourSessionId: req.sessionId });
    if (usSession) {
        await ubiservices.deleteSession({
            version: req.version,
            appId: req.appId,
            usSessionId: usSession.usSessionId,
            usTicket: usSession.ticket
        }).catch(err => logger.warn({
            message: "Failed to delete Ubiservices session (non-fatal)",
            details: { harbourSessionId: req.sessionId, usSessionId: usSession.usSessionId, error: err.message }
        }));

        await UbiservicesSession.deleteOne({ harbourSessionId: req.sessionId })
            .catch(err => logger.warn({
                message: "Failed to delete UbiservicesSession document (non-fatal)",
                details: { harbourSessionId: req.sessionId, error: err.message }
            }));

        logger.info({
            message: "Session deleted from Ubiservices",
            details: {
                harbourSessionId: req.sessionId,
                usSessionId: usSession.usSessionId
            }
        });
    }

    await session.deleteSession(req.sessionId);

    logger.info({
        message: "Session deleted from Harbour",
        details: {
            harbourSessionId: req.sessionId
        }
    });

    return res.json({});
};

module.exports = { handleSessions, handleSessionDeletion };