const hubHelper = require("../lib/hub-helper");

const { verifyAppByHeader, verifyUserAgent, verifyBuildId, verifyAuth } = require("../lib/middleware");
const { ticketRequired } = require("../lib/ticket-client");

const utils = require("../lib/utils");
const { handleSessions, handleSessionDeletion } = require("../lib/session-client");
const tracking = require("../lib/tracking");

/**
 * Profiles (v3)
 *
 * Session management for the v3 auth flow. Supports WiiU (Pretendo), PS4
 * (PSN 2.0), and Nintendo Switch (NX) platforms.  Uses `handleConsoleAuth`
 * to dispatch to the correct platform handler after `verifyAuth` has already
 * validated the raw platform token structure.
 *
 * Unlike v2, this endpoint also enforces Patreon-only access when
 * `config.PATREON_ONLY` is enabled, and triggers a uPlay account link via
 * `hubHelper.ensureUplayAccountLinked` on every new session.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    const version = 3;

    // ─── GET /v3/profiles ────────────────────────────────────────────────────

    /**
     * Search profiles across all Hub users. Supports filtering by
     * `profileId`, `idOnPlatform`, `nameOnPlatform`, and `platformType`.
     * At least one identifier (profileId, idOnPlatform, or nameOnPlatform)
     * must be supplied — `platformType` alone is not sufficient.
     */
    publicRouter.get(
        "/",
        verifyAppByHeader,
        verifyUserAgent,
        verifyBuildId,
        ticketRequired,
        async (req, res, next) => {
            try {
                let { idOnPlatform, nameOnPlatform, profileId, platformType } = req.query;

                // Normalise comma-separated query values to arrays
                if (idOnPlatform) {
                    idOnPlatform = idOnPlatform.split(",").map(v => v.trim()).filter(Boolean);
                }
                if (nameOnPlatform) {
                    nameOnPlatform = nameOnPlatform.split(",").map(v => v.trim()).filter(Boolean);
                }
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

    // ─── POST /v3/profiles/sessions ──────────────────────────────────────────

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

    // ─── DELETE /v3/profiles/sessions ────────────────────────────────────────

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

    // ─── POST /v3/profiles/me/events ─────────────────────────────────────────

    /**
     * Receive and acknowledge client telemetry events (game start, player
     * start, etc.). Persists each batch to MongoDB as an append-only log.
     *
     * Example payload:
     * ```json
     * {
     *   "events": [{ "type": "game.start", "seqId": 0, ... }],
     *   "gameSessionId": "...",
     *   "playerSessionId": "...",
     *   "spaceId": "..."
     * }
     * ```
     */
    publicRouter.post(
        "/me/events",
        verifyAppByHeader, verifyUserAgent, verifyBuildId, ticketRequired,
        async (req, res, next) => {
            try {
                const { events, gameSessionId, playerSessionId, spaceId } = req.body;

                if (!events || !Array.isArray(events) || events.length === 0) {
                    return res.status(400).json({ error: "events array is required" });
                }

                await tracking.storeEvents({
                    userId: req.userId,
                    profileId: req.profileId,
                    platform: req.platform,
                    gameSessionId,
                    playerSessionId,
                    spaceId: spaceId || req.spaceId,
                    events
                });

                return res.send({});
            } catch (err) {
                logger.error({ message: "Failed to store tracking events", error: err.message });
                return next(err);
            }
        }
    );

};