const axios = require("axios");
const {
    USER_NOT_FOUND,
    INTERNAL_SERVER_ERROR,
    INVALID_REQUEST,
    PATREON_ALREADY_LINKED,
    PATREON_NOT_FOUND,
    USER_NOT_ON_SERVER,
    USER_DISCORD_NOT_CONNECTED
} = require("../lib/http-codes");
const { tokenRequired } = require("../lib/session-client");
const config = require("../config");
const User = require("../lib/models/user");
const Users = require("../lib/users");
const DiscordOAuth = require("../lib/oauth/discord");

/**
 * Backoffice (v1)
 *
 * Test and utility routes for internal/development use.
 * All routes use the privateRouter — only accessible when PRIVATE_ROUTES is enabled.
 *
 * @param {*} app
 * @param {*} publicRouter
 * @param {*} privateRouter
 * @param {*} logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * @route POST /backoffice/v1/patreon/sync
     * @description Manually triggers the Patreon membership sync worker.
     * @returns {Object} JSON with sync result
     */
    privateRouter.post("/patreon/sync", async (req, res, next) => {
        try {
            const patreonSync = require("../lib/workers/patreonSync");
            await patreonSync.sync();
            return res.json({ success: true, message: "Patreon sync completed." });
        } catch (err) {
            logger.error({ err: err.message }, "Manual Patreon sync failed");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/user/:userId
     * @description Returns the Patreon subscription status for a specific user.
     * @param {string} req.params.userId - User ID to look up
     * @returns {Object} JSON with patreon status
     */
    privateRouter.get("/patreon/user/:userId", async (req, res, next) => {
        try {
            const user = await Users.getUserById(req.params.userId);
            if (!user) return next(USER_NOT_FOUND);

            return res.json({
                userId: user.userId,
                username: user.username,
                patreon: user.patreon || null
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch Patreon user status");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /backoffice/v1/patreon/link
     * @description Manually links a Patreon account to a Hub user (for testing).
     * @param {Object} req.body - Link data
     * @param {string} req.body.userId - Hub user ID
     * @param {string} req.body.patreonId - Patreon user ID
     * @param {string} [req.body.email] - Patreon email
     * @param {string} [req.body.fullName] - Patreon full name
     * @returns {Object} JSON with result
     */
    privateRouter.post("/patreon/link", async (req, res, next) => {
        try {
            const { userId, patreonId, email, fullName } = req.body;
            if (!userId || !patreonId) return next(INVALID_REQUEST);

            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            // Discord must be connected
            if (!user.discord || !user.discord.id) {
                return next(USER_DISCORD_NOT_CONNECTED);
            }

            // User must be a member of the Discord server
            const guildId = config.PATREON.DISCORD_SERVER_ID;
            const botToken = config.PATREON.DISCORD_BOT_TOKEN;
            if (guildId && botToken) {
                const isMember = await DiscordOAuth.isMemberOfGuild(user.discord.id, guildId, botToken);
                if (!isMember) {
                    return next(USER_NOT_ON_SERVER);
                }
            }

            // Check if Patreon ID is already linked to another user
            const existing = await Users.getUserByPatreonId(patreonId);
            if (existing && existing.userId !== userId) {
                return next(PATREON_ALREADY_LINKED);
            }

            await Users.linkPatreonAccount(userId, {
                id: patreonId,
                email: email || null,
                fullName: fullName || null,
                imageUrl: null,
                vanity: null
            });

            logger.info({
                message: "Backoffice: Manually linked Patreon account",
                details: { userId, patreonId, linkedBy: req.userId }
            });

            return res.json({ success: true, message: "Patreon account linked." });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to link Patreon account");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /backoffice/v1/patreon/unlink/:userId
     * @description Manually unlinks a Patreon account from a Hub user (for testing).
     * @param {string} req.params.userId - Hub user ID
     * @returns {Object} JSON with result
     */
    privateRouter.post("/patreon/unlink/:userId", async (req, res, next) => {
        try {
            const user = await Users.getUserById(req.params.userId);
            if (!user) return next(USER_NOT_FOUND);
            if (!user.patreon || !user.patreon.id) return next(PATREON_NOT_FOUND);

            await Users.unlinkPatreonAccount(req.params.userId);

            logger.info({
                message: "Backoffice: Manually unlinked Patreon account",
                details: { userId: req.params.userId, unlinkedBy: req.userId }
            });

            return res.json({ success: true, message: "Patreon account unlinked." });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to unlink Patreon account");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/subscribers
     * @description Lists all Hub users whose Patreon subscription is active (isSubscribed: true).
     * @returns {Object} JSON with list of subscribed users
     */
    privateRouter.get("/patreon/subscribers", async (req, res, next) => {
        try {
            const users = await User.find(
                { "patreon.isSubscribed": true },
                "userId username email patreon"
            );

            return res.json({
                count: users.length,
                lastCheckedAt: users.length > 0 ? users[0].patreon.lastCheckedAt : null,
                users: users.map(u => ({
                    userId: u.userId,
                    username: u.username,
                    email: u.email,
                    patreonId: u.patreon.id,
                    patreonEmail: u.patreon.email,
                    patreonFullName: u.patreon.fullName,
                    isSubscribed: u.patreon.isSubscribed,
                    lastCheckedAt: u.patreon.lastCheckedAt
                }))
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch Patreon subscribers");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/linked
     * @description Lists all Hub users who have a Patreon account linked (regardless of subscription status).
     * @returns {Object} JSON with list of linked users
     */
    privateRouter.get("/patreon/linked", async (req, res, next) => {
        try {
            const users = await User.find(
                { "patreon.id": { $ne: null } },
                "userId username email patreon"
            );

            return res.json({
                count: users.length,
                users: users.map(u => ({
                    userId: u.userId,
                    username: u.username,
                    email: u.email,
                    patreonId: u.patreon.id,
                    patreonEmail: u.patreon.email,
                    patreonFullName: u.patreon.fullName,
                    isSubscribed: u.patreon.isSubscribed,
                    lastCheckedAt: u.patreon.lastCheckedAt,
                    linkedAt: u.patreon.linkedAt
                }))
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch linked Patreon users");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/campaign/members
     * @description Fetches all campaign members directly from the Patreon API (raw).
     *              Useful for debugging what Patreon returns.
     * @param {string} [req.query.limit] - Max members per page (default 25)
     * @returns {Object} JSON with raw Patreon API response
     */
    privateRouter.get("/patreon/campaign/members", async (req, res, next) => {
        try {
            const campaignId = config.PATREON.CAMPAIGN_ID;
            const accessToken = config.PATREON.ACCESS_TOKEN;

            if (!campaignId || !accessToken) {
                return res.status(400).json({ error: "Patreon CAMPAIGN_ID or ACCESS_TOKEN not configured" });
            }

            const limit = req.query.limit || 25;
            const url = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members` +
                `?include=user` +
                `&fields[member]=patron_status,last_charge_status,currently_entitled_amount_cents` +
                `&fields[user]=email,full_name,image_url,vanity` +
                `&page[count]=${limit}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const { data, included, links, meta } = response.data;

            // Build a cleaner summary from the raw response
            const includedMap = new Map();
            if (included) {
                for (const resource of included) {
                    includedMap.set(resource.id, resource);
                }
            }

            const members = data.map(member => {
                const userId = member.relationships?.user?.data?.id;
                const userResource = userId ? includedMap.get(userId) : null;
                return {
                    memberId: member.id,
                    patron_status: member.attributes.patron_status,
                    last_charge_status: member.attributes.last_charge_status,
                    currently_entitled_amount_cents: member.attributes.currently_entitled_amount_cents,
                    patreonUser: userResource ? {
                        id: userResource.id,
                        email: userResource.attributes?.email,
                        full_name: userResource.attributes?.full_name,
                        image_url: userResource.attributes?.image_url,
                        vanity: userResource.attributes?.vanity
                    } : null
                };
            });

            return res.json({
                total: data.length,
                hasMore: !!links?.next,
                members
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch Patreon campaign members");
            return res.status(500).json({ error: err.message });
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/campaign/subscribers
     * @description Iterates through ALL pages of Patreon campaign members and returns
     *              only those who are actively subscribed (patron_status === "active_patron"
     *              AND last_charge_status === "Paid").
     * @returns {Object} JSON with all subscribed members aggregated across all pages
     */
    privateRouter.get("/patreon/campaign/subscribers", async (req, res, next) => {
        try {
            const campaignId = config.PATREON.CAMPAIGN_ID;
            const accessToken = config.PATREON.ACCESS_TOKEN;

            if (!campaignId || !accessToken) {
                return res.status(400).json({ error: "Patreon CAMPAIGN_ID or ACCESS_TOKEN not configured" });
            }

            const allSubscribed = [];
            let url = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members` +
                `?include=user` +
                `&fields[member]=patron_status,last_charge_status,currently_entitled_amount_cents` +
                `&fields[user]=email,full_name,image_url,vanity` +
                `&page[count]=100`;
            let pageCount = 0;

            while (url) {
                pageCount++;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const { data, included, links } = response.data;

                // Build lookup map for included user resources
                const includedMap = new Map();
                if (included) {
                    for (const resource of included) {
                        includedMap.set(resource.id, resource);
                    }
                }

                for (const member of data) {
                    const patronStatus = member.attributes.patron_status;
                    const chargeStatus = member.attributes.last_charge_status;

                    if (patronStatus === "active_patron" && (chargeStatus === "Paid" || chargeStatus === null)) {
                        const patreonUserId = member.relationships?.user?.data?.id;
                        const userResource = patreonUserId ? includedMap.get(patreonUserId) : null;

                        allSubscribed.push({
                            memberId: member.id,
                            patron_status: patronStatus,
                            last_charge_status: chargeStatus,
                            currently_entitled_amount_cents: member.attributes.currently_entitled_amount_cents,
                            patreonUser: userResource ? {
                                id: userResource.id,
                                email: userResource.attributes?.email,
                                full_name: userResource.attributes?.full_name,
                                image_url: userResource.attributes?.image_url,
                                vanity: userResource.attributes?.vanity
                            } : null
                        });
                    }
                }

                url = links?.next || null;
            }

            return res.json({
                totalMembers: allSubscribed.length,
                pagesFetched: pageCount,
                subscribers: allSubscribed
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch all Patreon subscribers");
            return res.status(500).json({ error: err.message });
        }
    });

    /**
     * @route GET /backoffice/v1/patreon/campaign/member/:patreonUserId
     * @description Fetches a specific member from the Patreon API by their Patreon user ID.
     * @param {string} req.params.patreonUserId - The Patreon user ID
     * @returns {Object} JSON with the member's Patreon data
     */
    privateRouter.get("/patreon/campaign/member/:patreonUserId", async (req, res, next) => {
        try {
            const campaignId = config.PATREON.CAMPAIGN_ID;
            const accessToken = config.PATREON.ACCESS_TOKEN;

            if (!campaignId || !accessToken) {
                return res.status(400).json({ error: "Patreon CAMPAIGN_ID or ACCESS_TOKEN not configured" });
            }

            const url = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members` +
                `?include=user` +
                `&fields[member]=patron_status,last_charge_status,currently_entitled_amount_cents,last_charge_date` +
                `&fields[user]=email,full_name,image_url,thumb_url,url,vanity` +
                `&filter[user_id]=${req.params.patreonUserId}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const { data, included } = response.data;

            if (data.length === 0) {
                return res.json({ found: false, message: "No membership found for this Patreon user ID." });
            }

            const member = data[0];
            const includedMap = new Map();
            if (included) {
                for (const resource of included) {
                    includedMap.set(resource.id, resource);
                }
            }

            const userId = member.relationships?.user?.data?.id;
            const userResource = userId ? includedMap.get(userId) : null;

            return res.json({
                found: true,
                member: {
                    memberId: member.id,
                    patron_status: member.attributes.patron_status,
                    last_charge_status: member.attributes.last_charge_status,
                    last_charge_date: member.attributes.last_charge_date,
                    currently_entitled_amount_cents: member.attributes.currently_entitled_amount_cents,
                    isSubscribed: member.attributes.patron_status === "active_patron" &&
                                 (member.attributes.last_charge_status === "Paid" || member.attributes.last_charge_status === null)
                },
                patreonUser: userResource ? {
                    id: userResource.id,
                    email: userResource.attributes?.email,
                    full_name: userResource.attributes?.full_name,
                    image_url: userResource.attributes?.image_url,
                    vanity: userResource.attributes?.vanity
                } : null
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to fetch Patreon member");
            return res.status(500).json({ error: err.message });
        }
    });

    /**
     * @route POST /backoffice/v1/push
     * @description Sends a test push notification to a user.
     * @param {Object} req.body - Notification data
     * @param {string} req.body.userId - Target Hub user ID
     * @param {string} [req.body.title] - Notification title (default: "JDMO Hub")
     * @param {string} [req.body.body] - Notification body
     * @returns {Object} JSON with send results
     */
    privateRouter.post("/push", async (req, res, next) => {
        try {
            const { userId, title, body } = req.body;
            if (!userId) return next(INVALID_REQUEST);

            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            const push = require("../lib/push");
            const result = await push.sendToUser(userId, {
                title: title || "JDMO Hub",
                body: body || "This is a test push notification from the backoffice."
            });

            logger.info({
                message: "Backoffice: Sent test push notification",
                details: { userId, sent: result.sent, cleaned: result.cleaned, sentBy: req.userId }
            });

            return res.json({
                success: true,
                sent: result.sent,
                cleaned: result.cleaned
            });
        } catch (err) {
            logger.error({ err: err.message }, "Failed to send push notification");
            return next(INTERNAL_SERVER_ERROR);
        }
    });
};
