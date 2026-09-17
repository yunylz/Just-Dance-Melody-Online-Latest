/**
 * @module tracking
 *
 * Telemetry/analytics event store.
 *
 * Clients (JD games) periodically POST batches of tracking events as they
 * play.  Each batch is persisted to MongoDB as an append-only log so that:
 *
 *  1. The Hub API can poll a user's **latest** tracking data to display
 *     their in-game activity (e.g. Discord RPC status).
 *  2. Future analytics/telemetry pipelines can replay historical events.
 *
 * @see /v3/profiles/me/events — POST endpoint that feeds into this module.
 */

const Tracking = require("./models/tracking");
const { createLogger } = require("./logger");

const logger = createLogger({ service: "tracking" });

/**
 * Store a batch of tracking events for a given user.
 *
 * @param {object} params
 * @param {string} params.userId      - Hub user UUID (from ticket).
 * @param {string} params.profileId   - Hub profile UUID (from ticket).
 * @param {string} [params.platform]  - Platform ID (e.g. "nx", "ps4").
 * @param {string} [params.gameSessionId]
 * @param {string} [params.playerSessionId]
 * @param {string} [params.spaceId]
 * @param {Array}  params.events     - Array of event objects from the client.
 * @returns {Promise<object>} The persisted document.
 */
async function storeEvents({ userId, profileId, platform, gameSessionId, playerSessionId, spaceId, events }) {
    if (!events || events.length === 0) {
        logger.debug({ message: "No events to store", details: { userId } });
        return null;
    }

    // Sort events by seqId so the stored order matches client sequence
    const sorted = [...events].sort((a, b) => (a.seqId ?? 0) - (b.seqId ?? 0));

    const doc = await Tracking.create({
        userId,
        profileId,
        platform: platform || null,
        gameSessionId: gameSessionId || null,
        playerSessionId: playerSessionId || null,
        spaceId: spaceId || null,
        events: sorted
    });

    logger.debug({
        message: `Stored ${events.length} tracking event(s)`,
        details: { userId, profileId, eventTypes: events.map(e => e.type) }
    });

    return doc;
}

/**
 * Retrieve the most recent tracking batch for a user.
 *
 * This is the primary query used by the Hub API to determine a player's
 * current in-game activity for Discord RPC / status displays.
 *
 * @param {string} userId - Hub user UUID.
 * @returns {Promise<object|null>} The latest tracking document, or `null`.
 */
async function getLatestByUser(userId) {
    return Tracking.findOne({ userId }).sort({ createdAt: -1 }).lean().exec();
}

/**
 * Retrieve the most recent tracking batch for a user + space combination.
 *
 * Useful when a user may be playing different games (different spaceIds)
 * and you want the latest activity per game.
 *
 * @param {string} userId  - Hub user UUID.
 * @param {string} spaceId - Space/product UUID.
 * @returns {Promise<object|null>} The latest matching document, or `null`.
 */
async function getLatestByUserAndSpace(userId, spaceId) {
    return Tracking.findOne({ userId, spaceId }).sort({ createdAt: -1 }).lean().exec();
}

/**
 * Retrieve tracking history (paginated) for a user.
 *
 * @param {string} userId - Hub user UUID.
 * @param {number} [limit=20]
 * @param {number} [skip=0]
 * @returns {Promise<Array>}
 */
async function getHistory(userId, limit = 20, skip = 0) {
    return Tracking.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
}

module.exports = {
    storeEvents,
    getLatestByUser,
    getLatestByUserAndSpace,
    getHistory
};
