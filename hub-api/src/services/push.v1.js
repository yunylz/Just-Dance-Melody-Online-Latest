const { INVALID_BODY, INTERNAL_SERVER_ERROR } = require("../lib/http-codes");
const { tokenRequired } = require("../lib/session-client");
const push = require("../lib/push");

/**
 * Push (v1)
 *
 * Endpoints for managing Web Push notification subscriptions.
 *
 * @param {*} app
 * @param {*} publicRouter
 * @param {*} privateRouter
 * @param {*} logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * @route POST /push/v1/subscribe
     * @description Stores a push subscription for the authenticated user.
     * @param {Object} req.body - Push subscription object from the browser
     * @param {string} req.body.endpoint - Push endpoint URL
     * @param {Object} req.body.keys - Encryption keys
     * @param {string} req.body.keys.p256dh - P-256 diffie-hellman key
     * @param {string} req.body.keys.auth - Auth secret
     * @returns {Object} JSON with success status
     */
    publicRouter.post("/subscribe", tokenRequired, async (req, res, next) => {
        try {
            const { endpoint, keys } = req.body;

            if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
                return next(INVALID_BODY);
            }

            await push.subscribe(req.userId, { endpoint, keys }, req.get("User-Agent"));

            logger.info({
                message: "User subscribed to push notifications",
                details: { userId: req.userId }
            });

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err: err.message, userId: req.userId }, "Push subscribe failed");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route DELETE /push/v1/subscribe
     * @description Removes a push subscription by endpoint.
     * @param {Object} req.body - Request body
     * @param {string} req.body.endpoint - The endpoint URL to remove
     * @returns {Object} JSON with success status
     */
    publicRouter.delete("/subscribe", tokenRequired, async (req, res, next) => {
        try {
            const { endpoint } = req.body;

            if (!endpoint) {
                return next(INVALID_BODY);
            }

            await push.unsubscribe(endpoint);

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err: err.message }, "Push unsubscribe failed");
            return next(INTERNAL_SERVER_ERROR);
        }
    });
};
