const User = require("./models/user");
const UserStatus = require("./models/user-status");
const Notifications = require("./notifications");
const { NOTIFICATION_TYPES } = require("./enums");

const PUBLIC_PROFILE_EXCLUDES = '-hashedPassword -__v -_id -discord -patreon -status.emailVerificationToken -status.emailChangeInCooldown -status.emailVerificationSentDate -status.jmcsEnv -status.twoFactorSecret -status.twoFactorEnabled -status.passwordUpdateToken -status.authFilePassword -status.passwordChangedAt'
const ADMIN_PROFILE_EXCLUDES = "-hashedPassword -__v -_id -status.emailVerificationToken -status.twoFactorSecret -status.passwordUpdateToken -status.authFilePassword"

class Users {
    // -----------------------------------------------------
    // Queries
    // -----------------------------------------------------

    /**
     * Gets list of users for admin, parsing array fields into $in queries.
     * @param {Object} queryObj 
     * @param {string} projection
     * @returns {Promise<Array>} List of users
     */
    static async findUsers(queryObj, projection = ADMIN_PROFILE_EXCLUDES) {
        const query = { ...queryObj };
        // Convert array fields to $in
        ["idOnPlatform", "nameOnPlatform", "platformType"].forEach(field => {
            if (Array.isArray(query[field])) {
                query[field] = { $in: query[field] };
            }
        });
        return User.find(query, projection);
    }

    /**
     * Gets a user's public profile (without sensitive fields).
     * @param {string} userId 
     * @returns {Promise<Object>} User document
     */
    static async getPublicProfile(userId) {
        return User.findOne({ userId }, PUBLIC_PROFILE_EXCLUDES);
    }

    /**
     * Gets a user's public profile including online status.
     * @param {string} userId 
     * @returns {Promise<Object>} User object with online status
     */
    static async getPublicProfileWithStatus(userId) {
        const user = await this.getPublicProfile(userId);
        if (!user) return null;

        const minified = await this.minifyUsers([user]);
        return minified[0];
    }

    /**
     * Gets public profiles (without sensitive fields).
     * @param {string} query Query for mongoDb 
     * @returns {Promise<Object>} User document
     */
    static async getPublicProfiles(query = {}) {
        return User.find(query, PUBLIC_PROFILE_EXCLUDES);
    }

    /**
     * Gets a full user document by userId.
     * @param {string} userId 
     * @returns {Promise<Object>} User document
     */
    static async getUserById(userId) {
        return User.findOne({ userId });
    }

    /**
     * Gets a full user document by email.
     * @param {string} email 
     * @returns {Promise<Object>} User document
     */
    static async getUserByEmail(email) {
        return User.findOne({ email });
    }

    /**
     * Gets a full user document by profile ID.
     * @param {string} profileId 
     * @returns {Promise<Object>} User document
     */
    static async getUserByProfileId(profileId) {
        return User.findOne({ "profiles.profileId": profileId });
    }

    static async getMultipleProfiles(profileIds = []) {
        // should return [{ userId, profileId, platformType }, ...]
        const users = await User.find({
            "profiles.profileId": { $in: profileIds }
        },
            '-hashedPassword -__v -_id -status.emailVerificationToken -status.emailChangeInCooldown -status.emailVerificationSentDate -status.jmcsEnv -status.twoFactorSecret -status.twoFactorEnabled');

        return profileIds.map(profileId => {
            const user = users.find(u => u.profiles.some(p => p.profileId === profileId));
            if (!user) return undefined;
            const profile = user.profiles.find(p => p.profileId === profileId);
            return {
                userId: user.userId,
                username: user.username,
                avatarId: user.avatarId,
                country: user.country,
                profileId: profile.profileId,
                platformType: profile.platformType
            };
        });
    }

    static async getAllProfileIdsOfUser(userId) {
        const user = await User.findOne({ userId });
        if (!user) return [];
        return user.profiles.map(p => p.profileId);
    };

    static async getAllProfileIdsOfUsers(userIds = []) {
        const users = await User.find({ userId: { $in: userIds } });
        return users.map(u => u.profiles.map(p => p.profileId)).flat();
    };

    /**
     * Gets a full user document by username or email.
     * @param {string} username 
     * @param {string} email 
     * @returns {Promise<Object>} User document
     */
    static async getUserByUsernameOrEmail(username, email) {
        return User.findOne({ $or: [{ username }, { email }] });
    }

    /**
     * Gets a user by their linked Discord ID.
     * @param {string} discordId 
     * @returns {Promise<Object>} User document
     */
    static async getUserByDiscordId(discordId) {
        return User.findOne({ "discord.id": discordId });
    }

    /**
     * Checks if a user has a profile for a specific platform.
     * @param {string} userId 
     * @param {string} platform 
     * @returns {Promise<Object>} User document if found
     */
    static async checkPlatformExists(userId, platform) {
        return User.findOne({
            userId: userId,
            "profiles.platformType": platform
        });
    }

    /**
     * Checks if a MAC address is used by any profile on a platform.
     * @param {string} platform 
     * @param {string} macAddress 
     * @returns {Promise<Object>} User document if found
     */
    static async checkMacAddressInUse(platform, macAddress) {
        return User.findOne({
            "profiles.platformType": platform,
            "profiles.macAddress": macAddress
        });
    }

    /**
     * Checks if a MAC address is used by another user on a platform.
     * @param {string} userId 
     * @param {string} platform 
     * @param {string} macAddress 
     * @returns {Promise<Object>} User document if found
     */
    static async getOtherUserByMacAddress(userId, platform, macAddress) {
        return User.findOne({
            userId: { $ne: userId },
            "profiles.platformType": platform,
            "profiles.macAddress": macAddress
        });
    }

    /**
     * Checks if a profile username is used on a platform.
     * @param {string} platform 
     * @param {string} username 
     * @returns {Promise<Object>} User document if found
     */
    static async checkProfileInUse(platform, username) {
        return User.findOne({
            "profiles.platformType": platform,
            "profiles.nameOnPlatform": username
        });
    }

    /**
     * Checks if a profile ID is used on a platform.
     * @param {string} platform 
     * @param {string} profileId 
     * @returns {Promise<Object>} User document if found
     */
    static async checkProfileIdInUse(platform, profileId) {
        return User.findOne({
            "profiles.platformType": platform,
            "profiles.profileId": profileId
        });
    }

    // -----------------------------------------------------
    // Mutations
    // -----------------------------------------------------

    /**
     * Creates and saves a new user.
     * @param {Object} userData 
     * @returns {Promise<Object>} The saved user document
     */
    static async createUser(userData) {
        const user = new User(userData);
        return user.save();
    }

    /**
     * Saves changes to an existing user document.
     * @param {Object} userDoc Mongoose document
     * @returns {Promise<Object>} The saved user document
     */
    static async saveUser(userDoc) {
        return userDoc.save();
    }

    /**
     * Deletes a user document.
     * @param {Object} userDoc Mongoose document
     * @returns {Promise<Object>} The deleted user document
     */
    static async deleteUser(userDoc) {
        return userDoc.deleteOne();
    }

    /**
     * Updates the current user's general profile fields.
     * @param {string} userId 
     * @param {Object} updates 
     * @returns {Promise<Object>} The updated user document
     */
    static async updateMe(userId, updates) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        if (updates.username) user.username = updates.username;
        if (updates.email) user.email = updates.email;
        if (updates.dateOfBirth) user.dateOfBirth = updates.dateOfBirth;
        if (updates.avatarId) user.avatarId = updates.avatarId;
        if (updates.hubSettings) user.hubSettings = updates.hubSettings;

        return user.save();
    }

    /**
     * Updates the last ping timestamp for a user.
     * @param {string} userId 
     * @returns {Promise<Object>} Update result
     */
    static async updateLastPing(userId) {
        return UserStatus.updateOne({ userId }, { lastPingAt: new Date() }, { upsert: true });
    }

    /**
     * Adds a new profile to a user.
     * @param {string} userId 
     * @param {Object} profileData 
     * @returns {Promise<Object>} The updated user document
     */
    static async addProfile(userId, profileData) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.profiles.push(profileData);
        return user.save();
    }

    /**
     * Updates a specific profile on a user.
     * @param {string} userId 
     * @param {string} platform 
     * @param {Object} updates 
     * @returns {Promise<Object>} The updated user document
     */
    static async updateProfile(userId, platform, updates) {
        const user = await User.findOne({ userId });
        if (!user) return { error: 'USER_NOT_FOUND' };

        const profile = user.profiles.find(p => p.platformType === platform);
        if (!profile) return { error: 'PROFILE_NOT_FOUND' };

        if (updates.idOnPlatform) profile.idOnPlatform = updates.idOnPlatform;
        await user.save();

        return { user };
    }

    /**
     * Removes a profile from a user.
     * @param {string} userId 
     * @param {string} platform 
     * @returns {Promise<Object>} Object containing user or error
     */
    static async removeProfile(userId, platform) {
        const user = await User.findOne({ userId });
        if (!user) return { error: 'USER_NOT_FOUND' };

        const profileIndex = user.profiles.findIndex(profile => profile.platformType === platform);
        if (profileIndex === -1) return { error: 'PROFILE_NOT_FOUND' };

        user.profiles.splice(profileIndex, 1);
        await user.save();

        return { user };
    }

    /**
     * Resets a user's password.
     * @param {string} email 
     * @param {string} newHashedPassword 
     * @returns {Promise<Object>} The updated user document
     */
    static async resetPassword(email, newHashedPassword) {
        const user = await User.findOne({ email });
        if (!user) return null;

        user.hashedPassword = newHashedPassword;
        user.status.passwordUpdateToken = null;
        user.status.passwordUpdateRequired = false;
        user.status.passwordChangedAt = new Date();
        user.status.authFilePassword = Users.generateAuthFilePassword();
        return user.save();
    }

    /**
     * Marks a user's email as verified.
     * @param {Object} user Mongoose document
     * @returns {Promise<Object>} The updated user document
     */
    static async verifyEmail(user) {
        user.status.emailVerified = true;
        user.status.emailVerificationToken = null;
        user.status.emailChangeInCooldown = null;
        user.status.emailVerificationSentDate = null;
        return user.save();
    }

    /**
     * Changes a user's password.
     * @param {string} email 
     * @param {string} newHashedPassword 
     * @returns {Promise<Object>} The updated user document
     */
    static async changePassword(email, newHashedPassword) {
        const user = await User.findOne({ email });
        if (!user) return null;

        user.hashedPassword = newHashedPassword;
        user.status.passwordChangedAt = new Date();
        user.status.authFilePassword = Users.generateAuthFilePassword();
        return user.save();
    }

    /**
     * Generates a new UUID-based auth file password.
     * @returns {string} UUID v4 string
     */
    static generateAuthFilePassword() {
        const { v4: uuidv4 } = require("uuid");
        return uuidv4();
    }

    /**
     * Links a Discord account to a user.
     * @param {string} userId 
     * @param {Object} discordData { id, username }
     * @returns {Promise<Object>} The updated user document
     */
    static async linkDiscordAccount(userId, discordData) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.discord = {
            id: discordData.id,
            username: discordData.username,
            linkedAt: new Date()
        };
        return user.save();
    }

    /**
     * Unlinks a Discord account from a user.
     * @param {string} userId 
     * @returns {Promise<Object>} The updated user document
     */
    static async unlinkDiscordAccount(userId) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.discord = {
            id: null,
            username: null,
            linkedAt: null
        };
        return user.save();
    }

    /**
     * Gets a user by their linked Patreon ID.
     * @param {string} patreonId
     * @returns {Promise<Object>} User document
     */
    static async getUserByPatreonId(patreonId) {
        return User.findOne({ "patreon.id": patreonId });
    }

    /**
     * Links a Patreon account to a user.
     * @param {string} userId
     * @param {Object} patreonData { id, email, fullName, imageUrl, vanity }
     * @returns {Promise<Object>} The updated user document
     */
    static async linkPatreonAccount(userId, patreonData) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.patreon = {
            id: patreonData.id,
            email: patreonData.email || null,
            fullName: patreonData.fullName || null,
            imageUrl: patreonData.imageUrl || null,
            vanity: patreonData.vanity || null,
            linkedAt: new Date()
        };
        return user.save();
    }

    /**
     * Unlinks a Patreon account from a user.
     * @param {string} userId
     * @returns {Promise<Object>} The updated user document
     */
    static async unlinkPatreonAccount(userId) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.patreon = {
            id: null,
            email: null,
            fullName: null,
            imageUrl: null,
            vanity: null,
            linkedAt: null,
            isSubscribed: false,
            lastCheckedAt: null
        };
        return user.save();
    }

    /**
     * Bans a user.
     * @param {string} userId 
     * @param {string} reason 
     * @param {Object} bannedBy { id, username }
     * @returns {Promise<Object>} The updated user document
     */
    static async banUser(userId, reason, bannedBy) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.status.banned = true;
        user.status.bannedReason = reason;
        user.status.bannedBy = bannedBy;
        return user.save();
    }

    /**
     * Unbans a user.
     * @param {string} userId 
     * @returns {Promise<Object>} The updated user document
     */
    static async unbanUser(userId) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.status.banned = false;
        user.status.bannedBy = null;
        user.status.bannedReason = null;
        return user.save();
    }

    /**
     * Sets a user's QA status.
     * @param {string} userId 
     * @param {boolean} isQa 
     * @returns {Promise<Object>} The updated user document
     */
    static async setQaStatus(userId, isQa) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.status.qa = isQa;
        return user.save();
    }

    /**
     * Sets a user's JMCS environment.
     * @param {string} userId 
     * @param {string} env 
     * @returns {Promise<Object>} The updated user document
     */
    static async setJmcsEnv(userId, env) {
        const user = await User.findOne({ userId });
        if (!user) return null;

        user.status.jmcsEnv = env;
        return user.save();
    }

    /**
     * Gets online status for one or more users.
     * @param {string|string[]} userIds Single userId or array of userIds
     * @returns {Promise<Object>} Map of userId -> { isOnline, lastPingAt }
     */
    static async getOnlineStatus(userIds) {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const now = new Date();
        const onlineThreshold = 5 * 60 * 1000; // 5 minutes

        const statuses = await UserStatus.find({ userId: { $in: ids } });
        const result = {};
        for (const s of statuses) {
            result[s.userId] = {
                isOnline: (now - new Date(s.lastPingAt)) < onlineThreshold,
                lastPingAt: s.lastPingAt
            };
        }
        // Users without a UserStatus document default to offline
        for (const id of ids) {
            if (!result[id]) {
                result[id] = { isOnline: false, lastPingAt: null };
            }
        }
        return result;
    }

    /**
     * Minifies a list of users for public display, including online status.
     */
    static async minifyUsers(users) {
        const userIds = users.map(u => u.userId);
        const onlineStatuses = await this.getOnlineStatus(userIds);

        return users.map((u) => {
            const status = onlineStatuses[u.userId];
            const lastSeen = status.lastPingAt || u.updatedAt || u.dateCreated;

            return {
                userId: u.userId,
                username: u.username,
                avatarId: u.avatarId,
                country: u.country,
                isOnline: status.isOnline,
                lastSeen: lastSeen,
                platforms: u.profiles.map((p) => ({
                    platformType: p.platformType,
                    nameOnPlatform: p.nameOnPlatform
                }))
            };
        });
    }

    /**
     * Gets minified profiles based on query.
     */
    static async getMinifiedProfiles(query = {}, limit = 0) {
        let dbQuery = User.find(query);
        if (limit > 0) dbQuery = dbQuery.limit(limit);
        const users = await dbQuery;
        return await this.minifyUsers(users);
    }

    /**
     * Searches discoverable players by username or platform name.
     */
    static async searchPlayers(currentUserId = "", query = "", limit = 20) {
        const regex = new RegExp(query, 'i');
        const users = await User.find({
            "status.banned": false,
            "status.locked": false,
            //"status.emailVerified": true,
            "userId": {
                $ne: currentUserId
            },
            "hubSettings.shareAccount": true,
            $or: [
                { "username": { $regex: regex } },
                { "profiles.nameOnPlatform": { $regex: regex } }
            ]
        }).limit(limit);

        return await this.minifyUsers(users);
    }

    /**
     * Returns a list of discoverable users for the Hub's discover users page.
     */
    static async getDiscoverablePlayers(currentUserId = "", limit = 5) {
        const user = await User.findOne({ userId: currentUserId });
        const friendsList = user ? user.friends : [];

        const users = await User.find({
            "status.banned": false,
            "status.locked": false,
            "status.emailVerified": true,
            "userId": {
                $ne: currentUserId,
                $nin: friendsList
            },
            "hubSettings.shareAccount": true
        }).limit(limit);

        return await this.minifyUsers(users);
    }

    /**
     * Sends a friend request.
     * @param {string} userId
     * @param {string} targetUserId
     */
    static async sendFriendRequest(userId, targetUserId) {
        if (userId === targetUserId) return { error: 'CANNOT_ADD_SELF' };

        const user = await User.findOne({ userId });
        const targetUser = await User.findOne({ userId: targetUserId });

        if (!user || !targetUser) return { error: 'USER_NOT_FOUND' };
        if (user.friends.includes(targetUserId)) return { error: 'USER_ALREADY_FRIEND' };
        if (user.friendRequestsSent.includes(targetUserId) || targetUser.friendRequestsReceived.includes(userId)) {
            return { error: 'FRIEND_REQUEST_ALREADY_SENT' };
        }

        // If they already sent a request to us, we can auto-accept it, but let's keep it simple for now
        // and just let them accept it normally, or maybe we auto-accept?
        // Wait, if target user already sent request to user, they should just accept it.
        if (user.friendRequestsReceived.includes(targetUserId)) {
            return this.acceptFriendRequest(userId, targetUserId);
        }

        // Use updateOne with $push to avoid triggering Mongoose timestamps,
        // which would incorrectly update the target user's updatedAt/lastSeen.
        await User.updateOne({ userId }, { $push: { friendRequestsSent: targetUserId } });
        await User.updateOne({ userId: targetUserId }, { $push: { friendRequestsReceived: userId } });

        await Notifications.createNotification(
            targetUserId,
            NOTIFICATION_TYPES.FRIEND_REQUEST,
            'New Friend Request',
            `${user.username} sent you a friend request.`,
            { fromUserId: userId }
        );

        return { success: true };
    }

    /**
     * Accepts a friend request.
     * @param {string} userId
     * @param {string} targetUserId
     */
    static async acceptFriendRequest(userId, targetUserId) {
        const user = await User.findOne({ userId });
        const targetUser = await User.findOne({ userId: targetUserId });

        if (!user || !targetUser) return { error: 'USER_NOT_FOUND' };

        if (!user.friendRequestsReceived.includes(targetUserId)) {
            return { error: 'FRIEND_REQUEST_NOT_FOUND' };
        }

        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== targetUserId);
        targetUser.friendRequestsSent = targetUser.friendRequestsSent.filter(id => id !== userId);

        if (!user.friends.includes(targetUserId)) user.friends.push(targetUserId);
        if (!targetUser.friends.includes(userId)) targetUser.friends.push(userId);

        await user.save();
        await targetUser.save();

        await Notifications.createNotification(
            targetUserId,
            NOTIFICATION_TYPES.FRIEND_ACCEPTED,
            'Friend Request Accepted',
            `${user.username} accepted your friend request.`,
            { fromUserId: userId }
        );

        return { success: true };
    }

    /**
     * Declines a friend request.
     * @param {string} userId
     * @param {string} targetUserId
     */
    static async declineFriendRequest(userId, targetUserId) {
        const user = await User.findOne({ userId });
        const targetUser = await User.findOne({ userId: targetUserId });

        if (!user || !targetUser) return { error: 'USER_NOT_FOUND' };

        if (!user.friendRequestsReceived.includes(targetUserId)) {
            return { error: 'FRIEND_REQUEST_NOT_FOUND' };
        }

        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== targetUserId);
        targetUser.friendRequestsSent = targetUser.friendRequestsSent.filter(id => id !== userId);

        await user.save();
        await targetUser.save();

        return { success: true };
    }

    /**
     * Cancels a sent friend request.
     * @param {string} userId
     * @param {string} targetUserId
     */
    static async cancelFriendRequest(userId, targetUserId) {
        const user = await User.findOne({ userId });
        const targetUser = await User.findOne({ userId: targetUserId });

        if (!user || !targetUser) return { error: 'USER_NOT_FOUND' };

        if (!user.friendRequestsSent.includes(targetUserId)) {
            return { error: 'FRIEND_REQUEST_NOT_FOUND' };
        }

        user.friendRequestsSent = user.friendRequestsSent.filter(id => id !== targetUserId);
        targetUser.friendRequestsReceived = targetUser.friendRequestsReceived.filter(id => id !== userId);

        await user.save();
        await targetUser.save();

        return { success: true };
    }

    /**
     * Removes a friend.
     * @param {string} userId
     * @param {string} targetUserId
     */
    static async removeFriend(userId, targetUserId) {
        const user = await User.findOne({ userId });
        const targetUser = await User.findOne({ userId: targetUserId });

        if (!user || !targetUser) return { error: 'USER_NOT_FOUND' };

        user.friends = user.friends.filter(id => id !== targetUserId);
        targetUser.friends = targetUser.friends.filter(id => id !== userId);

        // Clean up any lingering requests just in case
        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== targetUserId);
        user.friendRequestsSent = user.friendRequestsSent.filter(id => id !== targetUserId);
        targetUser.friendRequestsReceived = targetUser.friendRequestsReceived.filter(id => id !== userId);
        targetUser.friendRequestsSent = targetUser.friendRequestsSent.filter(id => id !== userId);

        await user.save();
        await targetUser.save();

        return { success: true };
    }

    /**
     * Returns all users with their profiles flattened, for spotlight computation.
     * Only returns the fields needed for scoring — no sensitive data.
     * @returns {Promise<Array>} Flat list of { userId, username, avatarId, country, profileId, platformType }
     */
    static async getAllRegisteredProfiles() {
        const allUsers = await User.find(
            { "profiles.0": { $exists: true } }, // only users that have at least one profile
            { userId: 1, username: 1, avatarId: 1, country: 1, profiles: 1, hubSettings: 1, _id: 0 }
        ).lean();

        // Flatten profiles — one entry per profile
        const flat = [];
        for (const user of allUsers) {
            for (const profile of user.profiles) {
                if (!profile.profileId) continue;
                flat.push({
                    userId: user.userId,
                    username: user.username,
                    avatarId: user.avatarId,
                    country: user.country,
                    profileId: profile.profileId,
                    platformType: profile.platformType,
                    hubSettings: user.hubSettings
                });
            }
        }
        return flat;
    }
}

module.exports = Users;
