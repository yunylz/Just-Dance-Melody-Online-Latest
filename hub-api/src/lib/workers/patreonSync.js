const axios = require("axios");
const cron = require("node-cron");
const config = require("../../config");
const User = require("../models/user");
const SyncTimestamp = require("../models/sync-timestamp");
const utils = require("../utils");
const logger = require("../logger").createLogger({ service: "patreon-sync" });

const SYNC_NAME = "patreon";

const PATREON_API = "https://www.patreon.com/api/oauth2/v2";

/**
 * Fetches all members of the Patreon campaign by paginating through every page.
 * @param {string} campaignId
 * @param {string} accessToken
 * @returns {Promise<Map<string, Object>>} Map of pajutreonUserId → member attributes
 */
async function fetchAllMembers(campaignId, accessToken) {
    const members = new Map();
    let url = `${PATREON_API}/campaigns/${campaignId}/members` +
        "?include=user" +
        "&fields[member]=patron_status,last_charge_status" +
        "&page[count]=1000";

    while (url) {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { data, included, links } = response.data;

        // Build a lookup map: included resource id → resource data
        const includedMap = new Map();
        if (included) {
            for (const resource of included) {
                includedMap.set(resource.id, resource);
            }
        }

        // Process each member on this page.
        // A user can have multiple memberships on the same campaign (e.g. old lapsed + new active).
        // Prefer the one where patron_status === "active_patron" so we don't miss active subs.
        for (const member of data) {
            const userId = member.relationships?.user?.data?.id;
            if (!userId) continue;

            const existing = members.get(userId);
            const isActive = member.attributes.patron_status === "active_patron";

            // Keep existing if it's already active_patron, otherwise take the new one
            // (or overwrite if the new one is active_patron)
            if (!existing || (isActive && existing.patron_status !== "active_patron")) {
                members.set(userId, {
                    memberId: member.id,
                    patron_status: member.attributes.patron_status,
                    last_charge_status: member.attributes.last_charge_status
                });
            }
        }

        url = links?.next || null;
    }

    return members;
}

/**
 * Runs one full Patreon membership sync cycle.
 * Fetches all campaign members, determines who is actively subscribed,
 * and bulk-updates the User collection accordingly.
 */
async function sync() {
    const start = Date.now();
    logger.info("Patreon sync started");

    try {
        const campaignId = config.PATREON.CAMPAIGN_ID;
        const accessToken = config.PATREON.ACCESS_TOKEN;

        if (!campaignId || !accessToken) {
            logger.warn("Patreon sync skipped: CAMPAIGN_ID or ACCESS_TOKEN not configured");
            return;
        }

        // Fetch all members (paginated)
        const allMembers = await fetchAllMembers(campaignId, accessToken);
        const totalMembers = allMembers.size;
        logger.info(`Fetched ${totalMembers} total members from Patreon campaign`);

        // Determine which Patreon user IDs are actively subscribed
        const subscribed = [];      // { patreonUserId, memberId }
        const unsubscribed = [];    // { patreonUserId }

        for (const [patreonUserId, attrs] of allMembers) {
            if (attrs.patron_status === "active_patron" && (attrs.last_charge_status === "Paid" || attrs.last_charge_status === null)) {
                subscribed.push({ patreonUserId, memberId: attrs.memberId });
            } else {
                unsubscribed.push({ patreonUserId });
            }
        }

        const subscribedPatreonIds = subscribed.map(s => s.patreonUserId);

        logger.info(
            `Active subscribers: ${subscribed.length}, ` +
            `Inactive members: ${unsubscribed.length}`
        );

        const now = new Date();

        // Run both bulk updates in parallel using raw MongoDB driver
        // to avoid Mongoose's timestamps middleware touching `updatedAt`.
        const [resultActive, resultInactive] = await Promise.all([
            // Mark subscribed users — also store memberId for direct API lookups
            subscribed.length > 0
                ? User.collection.updateMany(
                    { "patreon.id": { $in: subscribedPatreonIds } },
                    { $set: { "patreon.isSubscribed": true, "patreon.lastCheckedAt": now } }
                )
                : Promise.resolve({ modifiedCount: 0 }),

            // Mark users who have a patreon.id but aren't in the active set
            // Use $and to avoid the duplicate-key overwrite bug
            User.collection.updateMany(
                {
                    $and: [
                        { "patreon.id": { $ne: null } },
                        { "patreon.id": { $nin: subscribedPatreonIds } }
                    ]
                },
                { $set: { "patreon.isSubscribed": false, "patreon.lastCheckedAt": now } }
            )
        ]);

        // Store memberId for each subscribed user (separate pass to keep queries clean)
        if (subscribed.length > 0) {
            const bulkOps = subscribed.map(s => ({
                updateMany: {
                    filter: { "patreon.id": s.patreonUserId },
                    update: { $set: { "patreon.memberId": s.memberId } }
                }
            }));
            await User.collection.bulkWrite(bulkOps);
        }

        const duration = Date.now() - start;
        logger.info(
            `Patreon sync completed in ${duration}ms | ` +
            `Set subscribed: ${resultActive.modifiedCount || 0}, ` +
            `Set unsubscribed: ${resultInactive.modifiedCount || 0}`
        );

        // Remember when this sync ran
        await SyncTimestamp.updateOne(
            { name: SYNC_NAME },
            { $set: { lastSyncAt: now } },
            { upsert: true }
        );
    } catch (err) {
        logger.error({ err: err.message, stack: err.stack }, "Patreon sync failed");
    }
}

/**
 * Returns the sync window (in ms) based on environment.
 * - Local: 1 hour (primary sync mechanism)
 * - Production: 24 hours (fallback reconciliation; webhooks handle real-time)
 */
function getSyncWindow() {
    return utils.isLocal() ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

/**
 * Returns the cron expression based on environment.
 * - Local: every hour
 * - Production: every 24 hours at midnight
 */
function getCronExpression() {
    return utils.isLocal() ? "0 * * * *" : "0 0 * * *";
}

function getSyncLabel() {
    return utils.isLocal() ? "every hour" : "every 24 hours (fallback)";
}

/**
 * Checks whether a sync has been performed within the sync window.
 * @returns {Promise<boolean>}
 */
async function isSyncWithinWindow() {
    try {
        const record = await SyncTimestamp.findOne({ name: SYNC_NAME });
        if (!record || !record.lastSyncAt) return false;

        const elapsed = Date.now() - new Date(record.lastSyncAt).getTime();
        return elapsed < getSyncWindow();
    } catch {
        return false;
    }
}

/**
 * Starts the Patreon sync scheduler.
 * - Local: runs immediately, then every hour (primary sync).
 * - Production: runs immediately (if outside window), then every 24h at midnight
 *   as a fallback reconciliation pass (webhooks handle real-time updates).
 */
async function start() {
    // Skip immediate sync if one was done within the sync window (e.g. server restart)
    const alreadySynced = await isSyncWithinWindow();
    if (alreadySynced) {
        logger.info("Patreon sync skipped on startup: last sync was less than the sync window ago");
    } else {
        sync();
    }

    // Schedule recurring sync
    cron.schedule(getCronExpression(), () => {
        sync();
    });

    logger.info(`Patreon sync scheduled: ${getSyncLabel()}`);
}

module.exports = { start, sync };
