const Mail = require("../lib/mail");

const {
    CANT_BAN_ACCOUNT_PRIVILIGED,
    USER_ALREADY_BANNED,
    USER_NOT_BANNED, USER_NOT_FOUND,
    CANT_DELETE_ACCOUNT_PRIVILIGED,
    CANT_UNLINK_ADMIN_PROFILES,
    PROFILE_NOT_FOUND,
    INTERNAL_SERVER_ERROR
} = require("../lib/http-codes");
const { adminOnly, tokenRequired } = require("../lib/session-client");

const Users = require("../lib/users");
const { logActivity } = require("../lib/activity-logger");
const jmcs = require("../lib/jmcs");

/**
 * Admin (v1)
 * 
 * This route is for Admin tokens only for managing users and other stuff on Hub.
 * @param {*} app 
 * @param {*} publicRouter 
 * @param {*} privateRouter 
 * @param {*} logger 
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * GET /activities
     * Returns list of admin activities.
     */
    publicRouter.get("/activities", tokenRequired, adminOnly, async (req, res, next) => {
        try {
            const ActivityLog = require("../lib/models/activity-log");
            const activities = await ActivityLog.find().sort({ timestamp: -1 }).limit(100);
            return res.send(activities);
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * GET /jmcs-activities
     * Returns list of all JMCS activities.
     */
    publicRouter.get("/jmcs-activities", tokenRequired, adminOnly, async (req, res, next) => {
        try {
            const { count, skip, types } = req.query;
            const activities = await jmcs.getActivitiesFeed(
                null,
                count,
                skip,
                types ? types.split(",") : [],
                true,
                true
            );
            return res.send(activities);
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * POST /ban-user
     * Bans given user from accessing Hub.
     */
    publicRouter.post("/ban-user", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId, reason, notifyUser } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        // Admin accounts can't be banned.
        if (user.status.admin || user.status.moderator) return next(CANT_BAN_ACCOUNT_PRIVILIGED);
        // Can't ban the banned already.
        if (user.status.banned) return next(USER_ALREADY_BANNED);

        await Users.banUser(userId, reason, {
            id: req.userId,
            username: req.username
        });

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "BAN_USER",
            targetId: userId,
            targetUsername: user.username,
            details: { reason, notifyUser },
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        if (notifyUser) {
            const mail = new Mail();
            await mail.sendNotification({
                to: user.email,
                type: "ban",
                data: {
                    reason: reason || "No reason provided."
                }
            });
        };

        logger.info(`Admin ${req.username} banned ${userId} with the reason '${reason}' and notifyUser was '${notifyUser}'.`);

        return res.send({
            message: "Banned user successfully."
        });
    });

    /**
     * POST /unban-user
     * Unbans given user from accessing Hub.
     */
    publicRouter.post("/unban-user", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId, reason, notifyUser } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        // Admin accounts cant be banned.
        if (user.status.admin || user.status.moderator) return next(CANT_BAN_ACCOUNT_PRIVILIGED);
        // Can't unban the unbanned already.
        if (!user.status.banned) return next(USER_NOT_BANNED);

        await Users.unbanUser(userId);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "UNBAN_USER",
            targetId: userId,
            targetUsername: user.username,
            details: { reason, notifyUser },
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        if (notifyUser) {
            const mail = new Mail();
            await mail.sendNotification({
                to: user.email,
                type: "unban",
                data: {}
            });
        };

        logger.info(`Admin ${req.username} unbanned ${userId} with reason '${reason}' notifyUser was '${notifyUser}'.`);

        return res.send({
            message: "Unbanned user successfully."
        });
    });

    /**
     * POST /delete-user
     * Deletes given user from Hub.
     */
    publicRouter.post("/delete-user", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId, reason, notifyUser } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        // Admin accounts cant be banned.
        if (user.status.admin || user.status.moderator) return next(CANT_DELETE_ACCOUNT_PRIVILIGED);

        if (notifyUser) {
            const mail = new Mail();
            await mail.sendNotification({
                to: user.email,
                type: "delete",
                data: {
                    reason: reason || "No reason provided."
                }
            });
        };

        await Users.deleteUser(user);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "DELETE_USER",
            targetId: userId,
            targetUsername: user.username,
            details: { reason, notifyUser },
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        logger.info(`Admin ${req.username} deleted ${userId} with the reason '${reason}'.`);

        return res.send({
            message: "Deleted user successfully."
        });
    });

    /**
     * POST /unlink-profile
     * Unlinks profile of a user from Hub.
     */
    publicRouter.post("/unlink-profile", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId, platform, reason, notifyUser } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        // Admin accounts cant be banned.
        if (user.status.admin || user.status.moderator) return next(CANT_UNLINK_ADMIN_PROFILES);

        const profileIndex = user.profiles.findIndex(profile => profile.platformType === platform);
        if (profileIndex === -1) return next(PROFILE_NOT_FOUND);

        await Users.removeProfile(userId, platform);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "UNLINK_PROFILE",
            targetId: userId,
            targetUsername: user.username,
            details: { platform, reason, notifyUser },
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        if (notifyUser) {
            const mail = new Mail();
            await mail.sendNotification({
                to: user.email,
                type: "unlink",
                data: {
                    reason: reason || "No reason provided."
                }
            });
        };

        logger.info(`Admin ${req.username} unlinked ${userId} from ${platform} with reason ${reason}.`);

        return res.send({
            message: "Unlinked profile successfully."
        });
    });

    /**
     * POST /add-to-qa
     * Adds user to QA group.
     */
    publicRouter.post("/add-to-qa", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        await Users.setQaStatus(userId, true);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "ADD_TO_QA",
            targetId: userId,
            targetUsername: user.username,
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        logger.info(`Admin ${req.username} made ${userId} QA.`);

        return res.send({
            message: "Made user QA successfully."
        });
    });

    /**
     * POST /remove-from-qa
     * Removes user from QA group.
     */
    publicRouter.post("/remove-from-qa", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId } = req.body;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        await Users.setQaStatus(userId, false);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "REMOVE_FROM_QA",
            targetId: userId,
            targetUsername: user.username,
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        logger.info(`Admin ${req.username} removed ${userId} from QA.`);

        return res.send({
            message: "Removed user from QA successfully."
        });
    });

    /**
     * GET /admins
     * Returns list of all admins and moderators.
     */
    publicRouter.get("/admins", tokenRequired, adminOnly, async (req, res, next) => {
        const admins = await Users.findUsers({
            $or: [
                { "status.admin": true },
                { "status.moderator": true }
            ]
        }, "userId username email status.admin status.moderator status.jmcsEnv");

        return res.send(admins);
    });

    /**
     * POST /set-jmcs-env
     * Changes the JMCS environment for a user.
     */
    publicRouter.post("/set-jmcs-env", tokenRequired, adminOnly, async (req, res, next) => {
        const { userId, env } = req.body;

        if (!["prod", "dev"].includes(env)) {
            return res.status(400).send({
                message: "Invalid environment. Must be 'prod' or 'dev'."
            });
        }

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        const oldEnv = user.status.jmcsEnv || "prod";
        await Users.setJmcsEnv(userId, env);

        await logActivity({
            adminId: req.userId,
            adminUsername: req.username,
            action: "SET_JMCS_ENV",
            targetId: userId,
            targetUsername: user.username,
            details: { oldEnv, newEnv: env },
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        logger.info(`Admin ${req.username} changed ${userId}'s JMCS env to '${env}'.`);

        return res.send({
            message: "Changed JMCS environment successfully."
        });
    });

};