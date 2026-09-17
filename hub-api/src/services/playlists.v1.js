const Playlist = require("../lib/models/playlist");
const User = require("../lib/models/user");
const Notification = require("../lib/models/notification");
const Notifications = require("../lib/notifications");
const jmcs = require("../lib/jmcs");
const { tokenRequired } = require("../lib/session-client");
const { 
    INVALID_BODY, 
    PLAYLIST_NOT_FOUND, 
    PLAYLIST_NOT_OWNED, 
    USER_NOT_FOUND, 
    NOT_FRIENDS,
    INTERNAL_SERVER_ERROR 
} = require("../lib/http-codes");
const { NOTIFICATION_TYPES } = require("../lib/enums");
const uuid = require("uuid");

module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * @route GET /playlists/v1/me
     * @description Get playlists owned by the authenticated user.
     */
    publicRouter.get("/me", tokenRequired, async (req, res, next) => {
        try {
            const playlists = await Playlist.find({ ownerId: req.userId }).sort({ createdAt: -1 });
            return res.send({ playlists });
        } catch (error) {
            logger.error("Error fetching user playlists:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /playlists/v1/shared
     * @description Get playlists shared with the authenticated user.
     */
    publicRouter.get("/shared", tokenRequired, async (req, res, next) => {
        try {
            const playlists = await Playlist.find({ sharedWith: req.userId }).sort({ updatedAt: -1 });
            return res.send({ playlists });
        } catch (error) {
            logger.error("Error fetching shared playlists:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /playlists/v1/
     * @description Create a new playlist.
     */
    publicRouter.post("/", tokenRequired, async (req, res, next) => {
        const { title, description, songs, isPublic } = req.body;

        if (!title || !songs || !Array.isArray(songs)) {
            return next(INVALID_BODY);
        }

        try {
            const playlist = new Playlist({
                ownerId: req.userId,
                title,
                description,
                songs,
                isPublic: !!isPublic
            });

            await playlist.save();

            // Notify JMCS (Placeholder)
            await jmcs.createPlaylist(req.userId, playlist);

            return res.status(201).send({ playlist });
        } catch (error) {
            logger.error("Error creating playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /playlists/v1/friends
     * @description Get public playlists created by the user's friends.
     */
    publicRouter.get("/friends", tokenRequired, async (req, res, next) => {
        try {
            const user = await User.findOne({ userId: req.userId });
            if (!user) return next(USER_NOT_FOUND);

            if (!user.friends || user.friends.length === 0) {
                return res.send({ playlists: [] });
            }

            const playlists = await Playlist.find({
                ownerId: { $in: user.friends },
                isPublic: true
            }).sort({ createdAt: -1 });

            return res.send({ playlists });
        } catch (error) {
            logger.error("Error fetching friends playlists:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /playlists/v1/public
     * @description Get public playlists for discovery.
     */
    publicRouter.get("/public", async (req, res, next) => {
        const { sort = "latest" } = req.query;

        try {
            let query = Playlist.find({ isPublic: true });

            if (sort === "most-added") {
                query = query.sort({ "stats.clones": -1 });
            } else {
                query = query.sort({ createdAt: -1 });
            }

            const playlists = await query.limit(20);
            return res.send({ playlists });
        } catch (error) {
            logger.error("Error fetching public playlists:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /playlists/v1/:id
     * @description Get playlist details.
     */
    publicRouter.get("/:id", tokenRequired, async (req, res, next) => {
        try {
            const playlist = await Playlist.findOne({ id: req.params.id });

            if (!playlist) {
                return next(PLAYLIST_NOT_FOUND);
            }

            // Check access: owner, shared with, or public
            const isOwner = playlist.ownerId === req.userId;
            const isShared = playlist.sharedWith.includes(req.userId);
            
            if (!playlist.isPublic && !isOwner && !isShared) {
                return next(PLAYLIST_NOT_OWNED);
            }

            return res.send({ playlist });
        } catch (error) {
            logger.error("Error fetching playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route PUT /playlists/v1/:id
     * @description Update an existing playlist.
     */
    publicRouter.put("/:id", tokenRequired, async (req, res, next) => {
        try {
            const playlist = await Playlist.findOne({ id: req.params.id });

            if (!playlist) {
                return next(PLAYLIST_NOT_FOUND);
            }

            if (playlist.ownerId !== req.userId) {
                return next(PLAYLIST_NOT_OWNED);
            }

            const { title, description, songs, isPublic } = req.body;

            if (title) playlist.title = title;
            if (description !== undefined) playlist.description = description;
            if (songs && Array.isArray(songs)) playlist.songs = songs;
            if (isPublic !== undefined) playlist.isPublic = !!isPublic;

            await playlist.save();

            // Notify JMCS (Placeholder)
            await jmcs.updatePlaylist(playlist.id, playlist);

            return res.send({ playlist });
        } catch (error) {
            logger.error("Error updating playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route DELETE /playlists/v1/:id
     * @description Delete a playlist.
     */
    publicRouter.delete("/:id", tokenRequired, async (req, res, next) => {
        try {
            const playlist = await Playlist.findOne({ id: req.params.id });

            if (!playlist) {
                return next(PLAYLIST_NOT_FOUND);
            }

            if (playlist.ownerId !== req.userId) {
                return next(PLAYLIST_NOT_OWNED);
            }

            await Playlist.deleteOne({ id: req.params.id });

            // Notify JMCS (Placeholder)
            await jmcs.deletePlaylist(req.params.id);

            return res.status(204).send();
        } catch (error) {
            logger.error("Error deleting playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /playlists/v1/:id/share
     * @description Send a playlist share request to a friend.
     */
    publicRouter.post("/:id/share", tokenRequired, async (req, res, next) => {
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return next(INVALID_BODY);
        }

        try {
            const playlist = await Playlist.findOne({ id: req.params.id });
            if (!playlist) return next(PLAYLIST_NOT_FOUND);
            if (playlist.ownerId !== req.userId) return next(PLAYLIST_NOT_OWNED);

            const user = await User.findOne({ userId: req.userId });
            const targetUser = await User.findOne({ userId: targetUserId });

            if (!targetUser) return next(USER_NOT_FOUND);

            // Check if they are friends
            if (!user.friends.includes(targetUserId)) {
                return next(NOT_FRIENDS);
            }

            // Send notification
            await Notifications.createNotification(
                targetUserId,
                NOTIFICATION_TYPES.PLAYLIST_SHARE_REQUEST,
                "New Playlist Shared",
                `${user.username} wants to share the playlist "${playlist.title}" with you!`,
                {
                    senderId: req.userId,
                    senderUsername: user.username,
                    playlistId: playlist.id,
                    playlistTitle: playlist.title
                }
            );

            return res.send({ success: true, message: "Share request sent." });
        } catch (error) {
            logger.error("Error sharing playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /playlists/v1/share-requests/:notificationId/accept
     * @description Accept a playlist share request.
     */
    publicRouter.post("/share-requests/:notificationId/accept", tokenRequired, async (req, res, next) => {
        try {
            const notification = await Notification.findOne({ id: req.params.notificationId, userId: req.userId });

            if (!notification || notification.type !== NOTIFICATION_TYPES.PLAYLIST_SHARE_REQUEST) {
                return res.status(404).send({ message: "Request not found." });
            }

            const { playlistId, senderId } = notification.data;
            const playlist = await Playlist.findOne({ id: playlistId });

            if (!playlist) {
                return next(PLAYLIST_NOT_FOUND);
            }

            // Add user to sharedWith if not already there
            if (!playlist.sharedWith.includes(req.userId)) {
                playlist.sharedWith.push(req.userId);
                await playlist.save();
            }

            // Notify sender
            await Notifications.createNotification(
                senderId,
                NOTIFICATION_TYPES.PLAYLIST_SHARE_ACCEPTED,
                "Playlist Share Accepted",
                `${req.username} accepted your shared playlist "${playlist.title}".`,
                {
                    accepterId: req.userId,
                    accepterUsername: req.username,
                    playlistId: playlist.id
                }
            );

            // Mark notification as read
            notification.read = true;
            await notification.save();

            // Notify JMCS (Placeholder - ensure it appears in-game for this user)
            await jmcs.createPlaylist(req.userId, playlist);

            return res.send({ success: true, playlist });
        } catch (error) {
            logger.error("Error accepting share request:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /playlists/v1/share-requests/:notificationId/reject
     * @description Reject a playlist share request.
     */
    publicRouter.post("/share-requests/:notificationId/reject", tokenRequired, async (req, res, next) => {
        try {
            const notification = await Notification.findOne({ id: req.params.notificationId, userId: req.userId });

            if (!notification || notification.type !== NOTIFICATION_TYPES.PLAYLIST_SHARE_REQUEST) {
                return res.status(404).send({ message: "Request not found." });
            }

            // Mark notification as read (or delete it)
            notification.read = true;
            await notification.save();

            return res.send({ success: true });
        } catch (error) {
            logger.error("Error rejecting share request:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /playlists/v1/:id/clone
     * @description Clone a public playlist to the user's collection.
     */
    publicRouter.post("/:id/clone", tokenRequired, async (req, res, next) => {
        try {
            const originalPlaylist = await Playlist.findOne({ id: req.params.id });

            if (!originalPlaylist) {
                return next(PLAYLIST_NOT_FOUND);
            }

            if (!originalPlaylist.isPublic && originalPlaylist.ownerId !== req.userId && !originalPlaylist.sharedWith.includes(req.userId)) {
                return next(PLAYLIST_NOT_OWNED);
            }

            const clonedPlaylist = new Playlist({
                ownerId: req.userId,
                title: `${originalPlaylist.title} (Clone)`,
                description: originalPlaylist.description,
                songs: originalPlaylist.songs,
                isPublic: false,
                clonedFrom: originalPlaylist.id
            });

            await clonedPlaylist.save();

            // Update stats on original
            originalPlaylist.stats.clones += 1;
            await originalPlaylist.save();

            // Notify JMCS (Placeholder)
            await jmcs.createPlaylist(req.userId, clonedPlaylist);

            return res.status(201).send({ playlist: clonedPlaylist });
        } catch (error) {
            logger.error("Error cloning playlist:", error);
            return next(INTERNAL_SERVER_ERROR);
        }
    });
};
