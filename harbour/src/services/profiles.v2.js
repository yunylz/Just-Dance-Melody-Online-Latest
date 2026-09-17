const config = require("../config");

const hubHelper = require("../lib/hub-helper");
const session = require("../lib/session");
const platforms = require("../data/platforms");

const { verifyAppByHeader, verifyUserAgent, verifyBuildId, verifyAuth } = require("../lib/middleware");
const {
    USER_NOT_ON_HUB, PLATFORM_NOT_AVAILABLE, USER_DOESNT_HAVE_PLATFORM,
    UNAUTHORIZED, SESSION_NOT_FOUND, INVALID_QUERY,
    INACTIVE_ACCOUNT, LOCKED_ACCOUNT, BANNED_ACCOUNT, UNKNOWN_HUB_ERROR,
    REQUESTED_PLATFORM_TYPE_REQUIRED
} = require("../lib/http-codes");
const { ticketRequired } = require("../lib/ticket-client");

const utils = require("../lib/utils");
const { handleSessions, handleSessionDeletion } = require("../lib/session-client");

/**
 * Looks up a platform definition object by its `id` field.
 * Returns `undefined` if no match is found.
 *
 * @param {string} id - Platform ID (e.g. "nx", "ps4", "wiiu").
 * @returns {Object|undefined}
 */
const resolvePlatform = (id) => Object.values(platforms).find(p => p.id === id);

/**
 * Profiles (v2)
 *
 * Handles session creation/deletion and profile search.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    const version = 2;

    // ─── GET /v2/profiles ────────────────────────────────────────────────────

    /**
     * Search profiles across all Hub users. Supports filtering by
     * `profileId`, `idOnPlatform`, `nameOnPlatform`, and `platformType`.
     * At least one identifier (profileId, idOnPlatform, or nameOnPlatform)
     * must be supplied.
     */
    publicRouter.get(
        "/",
        verifyAppByHeader, verifyUserAgent, verifyBuildId, ticketRequired,
        async (req, res, next) => {
            try {
                let { idOnPlatform, nameOnPlatform, profileId, platformType } = req.query;

                // Normalise comma-separated query values to arrays
                if (idOnPlatform) idOnPlatform = idOnPlatform.split(",").map(v => v.trim()).filter(Boolean);
                if (nameOnPlatform) nameOnPlatform = nameOnPlatform.split(",").map(v => v.trim()).filter(Boolean);
                if (profileId && typeof profileId === "string") {
                    profileId = profileId.includes(",")
                        ? profileId.split(",").map(v => v.trim()).filter(Boolean)
                        : [profileId];
                }

                // At least one real identifier is required
                const hasIdentifier =
                    (profileId && profileId.length > 0) ||
                    (idOnPlatform && idOnPlatform.length > 0) ||
                    (nameOnPlatform && nameOnPlatform.length > 0);
                if (!hasIdentifier) return next(INVALID_QUERY);

                // Normalise platform aliases
                if (platformType === "psn") platformType = "ps3";
                if (platformType === "xbl") platformType = "x360";

                const users = await hubHelper.getUsers({}) || [];

                const resultProfiles = users.flatMap(u =>
                    (u.profiles || []).filter(p => {
                        if (platformType && p.platformType !== platformType) return false;
                        if (profileId && profileId.length > 0 && !profileId.includes(p.profileId)) return false;
                        if (idOnPlatform && idOnPlatform.length > 0 && !idOnPlatform.includes(p.idOnPlatform)) return false;
                        if (nameOnPlatform && nameOnPlatform.length > 0 && !nameOnPlatform.includes(p.nameOnPlatform)) return false;
                        return true;
                    })
                );

                return res.json({
                    profiles: resultProfiles.map(p => ({ ...p, platformType: utils.getPlatformType(p.platformType) }))
                });
            } catch (err) {
                logger.error({ message: "Failed to get profiles", error: err.message });
                return next(err);
            }
        }
    );

    // ─── POST /v2/profiles/sessions ──────────────────────────────────────────

    /**
     * Create a new session for the authenticated user.
     */
    publicRouter.post(
        "/sessions",
        verifyAppByHeader, verifyUserAgent, verifyBuildId, verifyAuth,
        (req, res, next) => {
            req.version = version;
            return next();
        },
        handleSessions,
    );

    // ─── DELETE /v2/profiles/sessions ────────────────────────────────────────

    /**
     * Invalidate (delete) an existing session.
     * Requires a valid Harbour ticket containing the session ID.
     */
    publicRouter.delete(
        "/sessions",
        verifyAppByHeader, verifyUserAgent, verifyBuildId, ticketRequired,
        (req, res, next) => { req.version = version; return next(); },
        handleSessionDeletion
    );

};