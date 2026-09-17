const { SESSION_NOT_FOUND } = require("../lib/http-codes");
const SessionModel = require("../lib/models/session");
const UbiservicesSessionModel = require("../lib/models/us-session");
const Tracking = require("../lib/models/tracking");

const { backOfficeTokenRequired } = require("../lib/ticket-client");

/**
 * Backoffice (v1)
 *
 * Provides access for S2S to have more Harbour content.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    publicRouter.use(backOfficeTokenRequired);
    privateRouter.use(backOfficeTokenRequired);

    /**
     * Returns the list of active sessions
     * GET /sessions
     */
    publicRouter.get("/sessions", async (req, res) => {
        const sessions = await SessionModel.find({});
        const usSessions = await UbiservicesSessionModel.find({});

        return res.json({
            sessions,
            usSessions
        });
    });

    /**
     * Check if given verification code has a valid session
     * GET /verify-code
     */
    publicRouter.get("/verify-code", async (req, res, next) => {
        const code = req.query.code;

        const session = await SessionModel.findOne({
            verifyCode: code
        });
        if (!session) {
            logger.warn({
                message: "Guest verification code not found.",
                details: { code }
            });
            return next(SESSION_NOT_FOUND);
        };

        const usSession = await UbiservicesSessionModel.findOne({
            harbourSessionId: session.sessionId
        });
        if (!usSession) {
            logger.warn({
                message: "Harbour session was found but Ubiservices session was not.",
                details: { code, session: session }
            });
            return next(SESSION_NOT_FOUND);
        };

        // For privacy reasons and not to be like Ovosimpatico...
        const usSessionObj = usSession.toObject();
        delete usSessionObj.ticket;

        return res.json({
            session: session.toObject(),
            usSession: usSessionObj
        });
    });

    // ─── POST /v1/backoffice/events ──────────────────────────────────────────

    /**
     * Manually insert a tracking batch for a user (testing purposes).
     *
     * Body:
     *   - userId (required)
     *   - profileId (required)
     *   - events (required) — array of event objects
     *   - gameSessionId, playerSessionId, spaceId, platform (optional)
     */
    publicRouter.post("/events", async (req, res, next) => {
        try {
            const { profileId, platform, gameSessionId, playerSessionId, spaceId, events } = req.body;
            const { userId } = req.query;

            const resolvedProfileId = profileId || `backoffice-${userId}`;

            const doc = await Tracking.create({
                userId,
                profileId: resolvedProfileId,
                platform: platform || null,
                gameSessionId: gameSessionId || null,
                playerSessionId: playerSessionId || null,
                spaceId: spaceId || null,
                events
            });

            logger.info({
                message: "Manually created tracking batch",
                details: { userId, profileId: resolvedProfileId, eventCount: events.length }
            });

            return res.status(201).json(doc);
        } catch (err) {
            logger.error({ message: "Failed to create tracking batch", error: err.message });
            return next(err);
        }
    });

    // ─── GET /v1/backoffice/events/latest ────────────────────────────────────

    /**
     * Retrieve the latest tracking batch for a user.
     *
     * Query params:
     *   - userId (required) — the Hub user UUID to look up.
     *   - spaceId (optional) — narrow to a specific game.
     */
    publicRouter.get("/events/latest", async (req, res, next) => {
        try {
            const { userId, spaceId } = req.query;

            const doc = spaceId
                ? await Tracking.findOne({ userId, spaceId }).sort({ createdAt: -1 }).lean().exec()
                : await Tracking.findOne({ userId }).sort({ createdAt: -1 }).lean().exec();

            if (!doc) {
                return res.status(404).json({ error: "No tracking data found for this user" });
            }

            // Ensure events are sorted by seqId for deterministic client-order
            if (doc.events) {
                doc.events.sort((a, b) => (a.seqId ?? 0) - (b.seqId ?? 0));
            }

            return res.json(doc);
        } catch (err) {
            logger.error({ message: "Failed to get latest tracking", error: err.message });
            return next(err);
        }
    });

    // ─── GET /v1/backoffice/events ───────────────────────────────────────────

    /**
     * Retrieve all tracking batches for a user (paginated).
     *
     * Returns tracking documents sorted by createdAt descending (newest first).
     *
     * Query params:
     *   - userId (required) — the Hub user UUID to look up.
     *   - spaceId (optional) — narrow to a specific game.
     *   - limit  (optional, default 20) — max documents to return.
     *   - skip   (optional, default 0)  — documents to skip for pagination.
     */
    publicRouter.get("/events", async (req, res, next) => {
        try {
            const { userId, spaceId, limit, skip } = req.query;

            const filter = { userId };
            if (spaceId) filter.spaceId = spaceId;

            const docs = await Tracking.find(filter)
                .sort({ createdAt: -1 })
                .skip(parseInt(skip) || 0)
                .limit(Math.min(parseInt(limit) || 20, 100))
                .lean()
                .exec();

            const total = await Tracking.countDocuments(filter);

            return res.json({ total, documents: docs });
        } catch (err) {
            logger.error({ message: "Failed to get tracking history", error: err.message });
            return next(err);
        }
    });

    // ─── GET /v1/backoffice/events/latest-event ──────────────────────────────

    /**
     * Retrieve the single most recent event for a user.
     *
     * Finds the latest tracking batch, then returns only the event with the
     * highest seqId — useful for Discord RPC or quick status checks.
     *
     * Query params:
     *   - userId (required) — the Hub user UUID to look up.
     *   - spaceId (optional) — narrow to a specific game.
     */
    publicRouter.get("/events/latest-event", async (req, res, next) => {
        try {
            const { userId, spaceId } = req.query;

            const doc = spaceId
                ? await Tracking.findOne({ userId, spaceId }).sort({ createdAt: -1 }).lean().exec()
                : await Tracking.findOne({ userId }).sort({ createdAt: -1 }).lean().exec();

            if (!doc) {
                return res.status(404).json({ error: "No tracking data found for this user" });
            }

            // Find the event with the highest seqId
            const latest = doc.events?.reduce((max, ev) =>
                (ev.seqId ?? 0) > (max.seqId ?? -1) ? ev : max
            , { seqId: -1 });

            if (!latest || latest.seqId === -1) {
                return res.status(404).json({ error: "No events found for this user" });
            }

            return res.json(latest);
        } catch (err) {
            logger.error({ message: "Failed to get latest event", error: err.message });
            return next(err);
        }
    });

};