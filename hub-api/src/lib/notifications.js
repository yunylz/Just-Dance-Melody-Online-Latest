const Notification = require('./models/notification');
const { NOTIFICATION_TYPES } = require('./enums');
const push = require('./push');

class Notifications {
    /**
     * Creates and saves a new notification for a user.
     * Also sends a push notification to all their devices.
     * @param {string} userId - Recipient ID
     * @param {string} type - Notification type
     * @param {string} title - Display title
     * @param {string} body - Display body
     * @param {Object} data - Extra metadata
     * @returns {Promise<Object>}
     */
    static async createNotification(userId, type, title, body, data = {}) {
        const notification = new Notification({
            userId,
            type,
            title,
            body,
            data
        });

        // Fire-and-forget push notification — never block the response
        push.sendToUser(userId, { title, body }).catch(() => {});

        return notification.save();
    }

    /**
     * Retrieves the 50 most recent notifications for a user.
     * @param {string} userId 
     * @returns {Promise<Array>}
     */
    static async getNotificationsForUser(userId) {
        return Notification.find({
            userId,
            type: { $ne: 'news' } // Explicitly exclude any lingering news entries
        })
            .sort({ time: -1 })
            .limit(50);
    }

    /**
     * Marks a specific notification as read.
     * @param {string} notificationId 
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    static async markAsRead(notificationId, userId) {
        return Notification.findOneAndUpdate(
            { id: notificationId, userId },
            { read: true },
            { new: true }
        );
    }

    /**
     * Marks all notifications for a user as read.
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    static async markAllAsRead(userId) {
        return Notification.updateMany(
            { userId, read: false },
            { read: true }
        );
    }
    /**
     * Deletes all notifications for a user.
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    static async clearNotifications(userId) {
        return Notification.deleteMany({ userId });
    }
}

module.exports = Notifications;
