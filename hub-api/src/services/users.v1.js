const uuidv4 = require("uuid").v4;

const config = require("../config");
const harbour = require("../lib/harbour");
const { USER_NOT_FOUND, INTERNAL_SERVER_ERROR, PROFILE_IN_USE, USER_ALREADY_HAS_PLATFORM, PROFILE_NOT_FOUND, MISSING_USERNAME, MISSING_MAC_ADDRESS, MAC_ADDRESS_IN_USE, MAC_ADDRESS_BANNED, CODE_NOT_VERIFIED, CODE_NOT_ACCEPTED, USE_VERIFICATION_CODE_SYSTEM, BELONGS_TO_SOMEONE_ELSE, HIDDEN_USER } = require("../lib/http-codes");
const jmcs = require("../lib/jmcs");
const { tokenRequired, s2sTokenRequired, adminOnly } = require("../lib/session-client");

module.exports = (app, publicRouter, privateRouter, logger) => {

    const Users = require("../lib/users");
    const Notifications = require("../lib/notifications");

    /**
     * @route GET /
     * @description Gets list of users.
     * @description This route requires admin or S2S token.
     * @returns {Array} List of users.
     */
    publicRouter.get("/", tokenRequired, adminOnly, s2sTokenRequired, (req, res, next) => {
        Users.findUsers(req.query)
            .then(users => res.send(users))
            .catch(err => {
                logger.error({ err });
                next(INTERNAL_SERVER_ERROR);
            });
    });

    /**
     * @route POST /verify-code
     * @description Talks to Harbour to verify the existence of given verification code
     * for guest users to register their profile to Hub.
     * @description Requires a valid token.
     * @param {string} req.body.code Verification code
     * @returns {Object} Success object.
     */
    publicRouter.post("/verify-code", tokenRequired, async (req, res, next) => {
        const { code } = req.body;
        const userId = req.userId;

        try {
            const { success, session, usSession } = await harbour.checkVerificationCode(code);
            if (!success) {
                return next(CODE_NOT_VERIFIED)
            };

            const platform = session.platform;
            const profileId = usSession.profileId;

            // Check if the code's profileId is already in Hub
            const profileIsUsed = await Users.checkProfileIdInUse(platform, profileId);
            if (profileIsUsed) {
                logger.warn({
                    message: "Code verification failed, code profileId already belongs to an user",
                    details: {
                        code, platform, profileId, userId
                    }
                });
                return next(BELONGS_TO_SOMEONE_ELSE);
            };

            return res.send({
                sessionData: {
                    nameOnPlatform: usSession.nameOnPlatform,
                    platform: session.platform
                }
            });
        }
        catch (err) {
            return next(INTERNAL_SERVER_ERROR);
        };
    });

    /**
     * @route POST /accept-code
     * @description Adds given code's attached profileId to player's user.
     * @description Requires a valid token.
     * @param {string} req.body.code Verification code
     * @returns {Object} Success object.
     */
    publicRouter.post("/accept-code", tokenRequired, async (req, res, next) => {
        const { code } = req.body;
        const userId = req.userId;

        try {
            const { success, session, usSession } = await harbour.checkVerificationCode(code);
            if (!success) {
                return next(CODE_NOT_ACCEPTED)
            };

            const profileId = usSession.profileId;
            const platform = session.platform;
            const nameOnPlatform = usSession.nameOnPlatform;

            logger.info({
                message: "Verification code accepted, processing...",
                details: {
                    code, userId, platform, nameOnPlatform
                }
            });

            // Check if user already has a profile for this platform
            const userAlreadyHasPlatform = await Users.checkPlatformExists(userId, platform);

            // If they do, delete the profile
            if (userAlreadyHasPlatform) {
                await Users.removeProfile(userId, platform);
                logger.info({
                    message: "User already has profile for this platform! Removed it.",
                    details: {
                        code, userId, platform, nameOnPlatform
                    }
                });
            };

            // Check if username is already in use for this platform
            const profileIsUsed = await Users.checkProfileIdInUse(platform, profileId);

            if (profileIsUsed) {
                logger.warn({
                    message: "Profile already belongs to someone else",
                    details: {
                        code, userId, profileId, platform, nameOnPlatform
                    }
                });
                return next(PROFILE_IN_USE);
            };

            const profileData = {
                nameOnPlatform: nameOnPlatform,
                platformType: platform,
                profileId: profileId,
                userId: userId
            };

            // Find user and add profile
            const user = await Users.addProfile(userId, profileData);
            if (!user) return next(USER_NOT_FOUND);

            logger.info({
                message: "Profile linked with verification code",
                details: {
                    code, userId, profileId, platform, nameOnPlatform
                }
            });

            return res.send({
                success: true
            });
        }
        catch (err) {
            return next(INTERNAL_SERVER_ERROR);
        };
    });

    publicRouter.get("/explore", tokenRequired, async (req, res, next) => {
        const userId = req.userId;
        const exploreLimit = 5;
        const discoverableUsers = await Users.getDiscoverablePlayers(userId, exploreLimit);

        return res.json({
            users: discoverableUsers
        });
    });

    publicRouter.get("/search", tokenRequired, async (req, res, next) => {
        const userId = req.userId;
        const query = req.query.q || "";
        const searchResults = await Users.searchPlayers(userId, query, 20);

        return res.json({
            users: searchResults
        });
    });

    /**
     * @route GET /me/friends
     * @description Gets the current user's friends.
     * @description Requires a valid token.
     * @returns {Object} List of friends.
     */
    publicRouter.get("/me/friends", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            const friends = await Users.getMinifiedProfiles({ userId: { $in: user.friends } });
            return res.json({ friends });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    publicRouter.get("/me/friends/activities", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            const friendProfileIds = await Users.getAllProfileIdsOfUsers(user.friends);
            const activities = await jmcs.getActivitiesFeed(friendProfileIds);
            return res.json({ activities });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /me/friends/requests
     * @description Gets the current user's pending incoming and outgoing friend requests.
     * @description Requires a valid token.
     * @returns {Object} List of incoming and outgoing friend requests.
     */
    publicRouter.get("/me/friends/requests", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            const incoming = await Users.getMinifiedProfiles({ userId: { $in: user.friendRequestsReceived } });
            const outgoing = await Users.getMinifiedProfiles({ userId: { $in: user.friendRequestsSent } });

            return res.json({ incoming, outgoing });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/friends/requests
     * @description Sends a friend request to a user.
     * @description Requires a valid token.
     * @param {string} req.body.userId Target user's ID
     * @returns {Object} Success object.
     */
    publicRouter.post("/me/friends/requests", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const targetUserId = req.body.userId;

            const result = await Users.sendFriendRequest(userId, targetUserId);
            if (result.error) {
                const err = require("../lib/http-codes")[result.error];
                return next(err || INTERNAL_SERVER_ERROR);
            }

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/friends/requests/accept
     * @description Accepts an incoming friend request.
     * @description Requires a valid token.
     * @param {string} req.body.userId Target user's ID
     * @returns {Object} Success object.
     */
    publicRouter.post("/me/friends/requests/accept", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const targetUserId = req.body.userId;

            const result = await Users.acceptFriendRequest(userId, targetUserId);
            if (result.error) {
                const err = require("../lib/http-codes")[result.error];
                return next(err || INTERNAL_SERVER_ERROR);
            }

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/friends/requests/decline
     * @description Declines an incoming friend request.
     * @description Requires a valid token.
     * @param {string} req.body.userId Target user's ID
     * @returns {Object} Success object.
     */
    publicRouter.post("/me/friends/requests/decline", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const targetUserId = req.body.userId;

            const result = await Users.declineFriendRequest(userId, targetUserId);
            if (result.error) {
                const err = require("../lib/http-codes")[result.error];
                return next(err || INTERNAL_SERVER_ERROR);
            }

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/friends/requests/cancel
     * @description Cancels a sent friend request.
     * @description Requires a valid token.
     * @param {string} req.body.userId Target user's ID
     * @returns {Object} Success object.
     */
    publicRouter.post("/me/friends/requests/cancel", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const targetUserId = req.body.userId;

            const result = await Users.cancelFriendRequest(userId, targetUserId);
            if (result.error) {
                const err = require("../lib/http-codes")[result.error];
                return next(err || INTERNAL_SERVER_ERROR);
            }

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/friends/remove
     * @description Removes a friend.
     * @description Requires a valid token.
     * @param {string} req.body.userId Target user's ID
     * @returns {Object} Success object.
     */
    publicRouter.post("/me/friends/remove", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const targetUserId = req.body.userId;

            const result = await Users.removeFriend(userId, targetUserId);
            if (result.error) {
                const err = require("../lib/http-codes")[result.error];
                return next(err || INTERNAL_SERVER_ERROR);
            }

            return res.json({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });


    /**
     * @route GET /me
     * @description Gets the current user's profile.
     * @description Requires a valid token.
     * @returns {Object} User profile.
     */
    publicRouter.get("/me", tokenRequired, async (req, res, next) => {
        const userId = req.userId;
        try {
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            // Use getPublicProfile as base to ensure all sensitive fields are excluded
            const publicUser = await Users.getPublicProfile(userId);
            const userData = publicUser.toObject();

            // Add online status
            userData.isOnline = true;
            userData.lastSeen = new Date(); // Or fetch from UserStatus if preferred, but for "me" it's now

            // Add fields that only the owner should see
            userData.status.twoFactorEnabled = user.status.twoFactorEnabled;

            if (user.status.admin || user.status.moderator) {
                userData.status.jmcsEnv = user.status.jmcsEnv;
            }

            // Patreon subscription status
            userData.patreon = {
                isSubscribed: user.patreon?.isSubscribed || false,
                linked: !!(user.patreon?.id)
            };

            // Discord connection status (basic info)
            userData.discord = {
                connected: !!(user.discord?.id),
                username: user.discord?.username || null
            };

            res.send(userData);
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route PATCH /me
     * @description Updates the current user's profile.
     * @description Requires a valid token.
     * @returns {Object} Empty object on success.
     */
    publicRouter.patch("/me", tokenRequired, async (req, res, next) => {
        const userId = req.userId;
        const body = req.body || {};

        const user = await Users.updateMe(userId, body);

        if (!user) return next(USER_NOT_FOUND);

        logger.info({
            message: "User updated account",
            details: {
                userId, username: user.username, newData: body
            }
        })

        return res.status(200).json({});
    });

    /**
     * @route GET /me/profiles
     * @description Gets the current user's profiles.
     * @description Requires a valid token.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.get("/me/profiles", tokenRequired, async (req, res, next) => {
        const userId = req.userId;

        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        return res.send({
            profiles: user.profiles
        })
    });

    /**
     * @route POST /me/profiles
     * @description Adds a new profile for the current user.
     * @description Requires a valid token.
     * @param {string} platform - The platform.
     * @param {string} username - The username.
     * @param {string} macAddress - The MAC address.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.post("/me/profiles", tokenRequired, async (req, res, next) => {
        try {
            const verificationCodePlatforms = ["ps4", "nx", "switch"];
            const { platform, username, macAddress } = req.body;

            // We no longer accept profile creation through here for platforms in verificationCodePlatforms
            if (verificationCodePlatforms.includes(platform.toLowerCase())) {
                return next(USE_VERIFICATION_CODE_SYSTEM)
            };

            const userId = req.userId;
            const profileId = uuidv4();

            // Validate required fields based on platform
            if (platform === "wii") {
                if (!macAddress) return next(MISSING_MAC_ADDRESS);
            } else {
                if (!username) return next(MISSING_USERNAME);
            }

            // Check if user already has a profile for this platform
            const userAlreadyHasPlatform = await Users.checkPlatformExists(userId, platform);

            if (userAlreadyHasPlatform) {
                return next(USER_ALREADY_HAS_PLATFORM);
            }

            // Platform-specific validation and profile data preparation
            let profileData;

            if (platform === "wii") {
                // Normalize MAC address to lowercase with dashes for consistent comparison
                const normalizedMacAddress = macAddress.toLowerCase().replace(/[:.]/g, '-');

                // Check if MAC address is banned
                const isBanned = config.BANNED_MAC_ADDRESSES.some(bannedMac =>
                    bannedMac.toLowerCase() === normalizedMacAddress
                );

                if (isBanned) return next(MAC_ADDRESS_BANNED);

                // Check if MAC address is already in use
                const macAddrUsed = await Users.checkMacAddressInUse(platform, macAddress);

                if (macAddrUsed) return next(MAC_ADDRESS_IN_USE);

                profileData = {
                    platformType: platform,
                    profileId: profileId,
                    userId: userId,
                    macAddress: macAddress,
                };
            } else {
                // Check if username is already in use for this platform
                const profileIsUsed = await Users.checkProfileInUse(platform, username);

                if (profileIsUsed) return next(PROFILE_IN_USE);

                profileData = {
                    nameOnPlatform: username,
                    platformType: platform,
                    profileId: profileId,
                    userId: userId
                };
            }

            // Find user and add profile
            const user = await Users.addProfile(userId, profileData);
            if (!user) return next(USER_NOT_FOUND);

            return res.send({
                profiles: user.profiles
            });

        } catch (error) {
            return next(error);
        }
    });

    /**
     * @route GET /me/profiles/:platform
     * @description Gets the current user's profiles for a specific platform.
     * @description Requires a valid token.
     * @param {string} platform - The platform.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.get("/me/profiles/:platform", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const platform = req.params.platform;

            // Find user
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            return res.send({
                profiles: user.profiles.filter(profile => profile.platformType === platform)
            });

        } catch (error) {
            return next(error);
        }
    });

    /**
     * @deprecated This route is no longer is in use.
     * @route PATCH /me/profiles/:platform
     * @description Updates the current user's profile for a specific platform.
     * @description Requires a valid token.
     * @param {string} platform - The platform.
     * @param {Object} body - The profile data.
     * @returns {Object} Object with profiles array.
     */
    // publicRouter.patch("/me/profiles/:platform", tokenRequired, async (req, res, next) => {
    //     try {
    //         const userId = req.userId;
    //         const platform = req.params.platform;
    //         const body = req.body || {};

    //         const result = await Users.updateProfile(userId, platform, body);

    //         if (result.error === 'USER_NOT_FOUND') return next(USER_NOT_FOUND);
    //         if (result.error === 'PROFILE_NOT_FOUND') return next(PROFILE_NOT_FOUND);

    //         return res.send({
    //             profiles: result.user.profiles
    //         });

    //     } catch (error) {
    //         logger.error({ err: error });
    //         return next(INTERNAL_SERVER_ERROR);
    //     }
    // });

    /**
     * @route DELETE /me/profiles/:platform
     * @description Deletes the current user's profile for a specific platform.
     * @description Requires a valid token.
     * @param {string} platform - The platform.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.delete("/me/profiles/:platform", tokenRequired, async (req, res, next) => {
        const userId = req.userId;
        const platform = req.params.platform;

        const result = await Users.removeProfile(userId, platform);

        if (result.error === 'USER_NOT_FOUND') return next(USER_NOT_FOUND);
        if (result.error === 'PROFILE_NOT_FOUND') return next(PROFILE_NOT_FOUND);

        return res.send({
            profiles: result.user.profiles
        })
    });

    /**
     * @route GET /me/notifications
     * @description Gets the current user's notifications.
     * @description Requires a valid token.
     * @returns {Array} Array of notifications objects.
     */
    publicRouter.get("/me/notifications", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const notifications = await Notifications.getNotificationsForUser(userId);

            return res.send({
                notifications: notifications.map(n => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    time: n.time,
                    new: !n.read,
                    data: n.data
                }))
            });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/notifications/:id/read
     * @description Marks a specific notification as read.
     * @description Requires a valid token.
     */
    publicRouter.post("/me/notifications/:id/read", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            const notificationId = req.params.id;

            await Notifications.markAsRead(notificationId, userId);
            return res.send({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /me/notifications/read-all
     * @description Marks all notifications for a user as read.
     * @description Requires a valid token.
     */
    publicRouter.post("/me/notifications/read-all", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            await Notifications.markAllAsRead(userId);
            return res.send({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route DELETE /me/notifications
     * @description Deletes all notifications for a user except for news.
     * @description Requires a valid token.
     */
    publicRouter.delete("/me/notifications", tokenRequired, async (req, res, next) => {
        try {
            const userId = req.userId;
            await Notifications.clearNotifications(userId);
            return res.send({ success: true });
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /:userId/profiles
     * @description Adds a new profile for a specific user.
     * @description Requires a valid S2S token.
     * @param {string} userId - The user ID.
     * @param {Object} body - The profile data.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.post("/:userId/profiles", s2sTokenRequired, async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { platform, username, profileId, idOnPlatform } = req.body;

            if (!platform) return next(PROFILE_NOT_FOUND);
            if (platform == "wii") return res.status(400).send({ error: "Use the /me/profiles endpoint to add Wii profiles with MAC addresses" });

            // Find user by userId
            const user = await Users.getUserById(userId);
            if (!user) return next(USER_NOT_FOUND);

            // Check if user already has a profile for this platform
            const userAlreadyHasPlatform = user.profiles.some(profile => profile.platformType === platform);
            if (userAlreadyHasPlatform) {
                return next(USER_ALREADY_HAS_PLATFORM);
            }

            // Platform-specific validation and profile data preparation
            let profileData;

            if (!username) return next(MISSING_USERNAME);

            // Check if username is already in use for this platform
            const profileIsUsed = await Users.checkProfileInUse(platform, username);

            if (profileIsUsed) return next(PROFILE_IN_USE);

            profileData = {
                nameOnPlatform: username,
                platformType: platform,
                profileId: profileId || uuidv4(),
                userId: userId,
                idOnPlatform: idOnPlatform
            };

            // Add new profile to user's profiles array and save
            const updatedUser = await Users.addProfile(userId, profileData);

            return res.send({
                profiles: updatedUser.profiles
            });

        } catch (error) {
            logger.error({ err: error });
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route PATCH /:userId/profiles/:platform
     * @description Updates the profile of a specific user for a specific platform.
     * @description Requires a valid S2S token.
     * @param {string} userId - The user ID.
     * @param {string} platform - The platform.
     * @param {Object} body - The profile data.
     * @returns {Object} Object with profiles array.
     */
    publicRouter.patch("/:userId/profiles/:platform", s2sTokenRequired, async (req, res, next) => {
        try {
            const { userId, platform } = req.params;
            const body = req.body || {};

            const result = await Users.updateProfile(userId, platform, body);

            if (result.error === 'USER_NOT_FOUND') return next(USER_NOT_FOUND);
            if (result.error === 'PROFILE_NOT_FOUND') return next(PROFILE_NOT_FOUND);

            return res.send({
                profiles: result.user.profiles
            });

        } catch (error) {
            logger.error({ err: error });
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /:userId/profiles/:platform
     * @description Gets the profile of a specific user for a specific platform.
     * @description Requires a valid S2S token.
     * @param {string} userId - The user ID.
     * @param {string} platform - The platform.
     * @returns {Object} Object with the profile.
     */
    publicRouter.get("/:userId/profiles/:platform", s2sTokenRequired, async (req, res, next) => {
        const { userId, platform } = req.params;

        // Find user by userId
        const user = await Users.getUserById(userId);
        if (!user) return next(USER_NOT_FOUND);

        // Find the specific profile for this platform
        const profileIndex = user.profiles.findIndex(profile => profile.platformType === platform);
        if (profileIndex === -1) return next(PROFILE_NOT_FOUND);

        // Get profile
        const profile = user.profiles[profileIndex];

        return res.send(profile || {})
    });


    /**
     * @route GET /:userId
     * @description Gets a specific user's profile by userId.
     * @description This route requires a valid token.
     * @returns {Object} User profile.
     */
    publicRouter.get("/:userId", tokenRequired, async (req, res, next) => {
        const userId = req.params.userId;
        try {
            const user = await Users.getPublicProfile(userId);
            if (!user) return next(USER_NOT_FOUND);

            // Don't show info if user did not share their account.
            if (user.hubSettings.shareAccount === false) {
                return next(HIDDEN_USER);
            };

            const profileIds = user.profiles.map(profile => profile.profileId);
            const jmcsProfiles = await jmcs.getProfiles(profileIds);

            // Fetch proper online status from UserStatus
            const userData = user.toObject();
            const onlineStatus = await Users.getOnlineStatus(userId);
            const status = onlineStatus[userId];
            const strippedUser = {
                userId: userData.userId,
                username: userData.username,
                country: userData.country,
                avatarId: userData.avatarId,
                isOnline: status.isOnline,
                lastSeen: status.lastPingAt || userData.updatedAt || userData.dateCreated,
                friendsCount: userData.friends.length,
                profilesCount: jmcsProfiles.length,
                isAdmin: userData.status.admin,
                isModerator: userData.status.moderator,
                isPatreon: userData.patreon?.isSubscribed || false,
                isQA: userData.status.qa,
                jmcsProfiles: jmcsProfiles.map(profile => ({
                    nickname: profile.nickname,
                    avatar: profile.avatar,
                    country: profile.country,
                    alias: profile.alias,
                    portraitBorder: profile.portraitBorder,
                    platformType: user.profiles.find(p => p.profileId === profile.profileId)?.platformType || null,
                    stats: jmcs.computeProfileStats(profile)
                }))
            };

            return res.send(strippedUser);
        } catch (err) {
            logger.error({ err });
            next(INTERNAL_SERVER_ERROR);
        }
    });

};
