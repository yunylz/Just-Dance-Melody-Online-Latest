const ActivityLog = require("./models/activity-log");
const logger = require("./logger").createLogger({ service: "activity-logger" });

/**
 * Logs an admin/mod activity to the database.
 * @param {Object} data Activity data
 * @param {string} data.adminId ID of the admin performing the action
 * @param {string} data.adminUsername Username of the admin
 * @param {string} data.action Description of the action (e.g. "SET_JMCS_ENV")
 * @param {string} [data.targetId] ID of the target user/resource
 * @param {string} [data.targetUsername] Username of the target user
 * @param {Object} [data.details] Additional structured data about the action
 * @param {string} [data.ip] IP address of the admin
 * @param {string} [data.userAgent] User agent of the admin
 */
const logActivity = async (data) => {
    try {
        const log = new ActivityLog(data);
        await log.save();
        logger.info(`Activity Logged: ${data.adminUsername} -> ${data.action} on ${data.targetUsername || "N/A"}`);
    } catch (err) {
        logger.error("Failed to save activity log", err);
    }
};

module.exports = { logActivity };
