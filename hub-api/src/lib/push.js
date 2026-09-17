const webpush = require("web-push");
const config = require("../config");
const PushSubscription = require("./models/push-subscription");
const User = require("./models/user");
const logger = require("./logger").createLogger({ service: "push" });

/**
 * Initializes web-push with VAPID keys.
 * Call once at server startup.
 */
function init() {
    const pub = config.PUSH.VAPID_PUBLIC_KEY;
    const priv = config.PUSH.VAPID_PRIVATE_KEY;

    if (!pub || !priv) {
        logger.warn("Push notifications disabled: VAPID keys not configured");
        return false;
    }

    webpush.setVapidDetails(
        "mailto:push@c0llydoll.dev",
        pub,
        priv
    );

    logger.info("Push notifications initialized");
    return true;
}

/**
 * Stores a new push subscription for a user.
 * @param {string} userId
 * @param {Object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {string} [userAgent]
 * @returns {Promise<Object>} The saved subscription
 */
async function subscribe(userId, subscription, userAgent) {
    const doc = {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null
    };

    // Upsert — update existing endpoint or create new
    const sub = await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { $set: doc },
        { upsert: true, new: true }
    );

    // Ensure the user's notification setting is enabled
    await User.updateOne(
        { userId },
        { $set: { "hubSettings.pushNotifications": true } }
    );

    return sub;
}

/**
 * Removes a push subscription by endpoint.
 * @param {string} endpoint
 * @returns {Promise<Object|null>} The deleted subscription
 */
async function unsubscribe(endpoint) {
    const sub = await PushSubscription.findOneAndDelete({ endpoint });
    if (!sub) return null;

    // If they have no more subscriptions, disable the notification setting
    const remaining = await PushSubscription.countDocuments({ userId: sub.userId });
    if (remaining === 0) {
        await User.updateOne(
            { userId: sub.userId },
            { $set: { "hubSettings.pushNotifications": false } }
        );
    }

    return sub;
}

/**
 * Sends a push notification to a specific user across all their devices.
 * Invalid/expired subscriptions (410 Gone, 404) are automatically cleaned up.
 * @param {string} userId
 * @param {Object} payload - JSON-serializable object (title, body, etc.)
 * @returns {Promise<{ sent: number, cleaned: number }>}
 */
async function sendToUser(userId, payload) {
    const subs = await PushSubscription.find({ userId });
    let sent = 0;
    let cleaned = 0;

    for (const sub of subs) {
        try {
            const subscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            const data = typeof payload === "string" ? payload : JSON.stringify(payload);
            await webpush.sendNotification(subscription, data);
            sent++;
        } catch (err) {
            const status = err.statusCode || (err.response?.statusCode);
            if (status === 410 || status === 404) {
                // Subscription expired or gone — remove it
                await PushSubscription.findOneAndDelete({ endpoint: sub.endpoint });
                cleaned++;
                logger.info({ userId, endpoint: sub.endpoint.slice(0, 40) }, "Removed dead push subscription");
            } else {
                logger.error({ err: err.message, userId, endpoint: sub.endpoint.slice(0, 40) }, "Push notification failed");
            }
        }
    }

    return { sent, cleaned };
}

module.exports = { init, subscribe, unsubscribe, sendToUser };
