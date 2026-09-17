const jmcs = require("../lib/jmcs");
const { tokenRequired, adminOnly } = require("../lib/session-client");

module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * @route GET /constants
     * @description Fetches game constants from JMCS.
     * @returns {Object} Game constants including modes, difficulties, etc.
     */
    publicRouter.get("/constants", tokenRequired, async (req, res) => {
        const constants = await jmcs.getConstants();

        return res.send({
            constants
        });
    });

    /**
     * @route GET /songdb
     * @description Fetches song database from JMCS.
     * @returns {Array} List of songs.
     */
    publicRouter.get("/songdb", async (req, res) => {
        const songs = await jmcs.getCachedHubSongDb();

        return res.send({
            songs
        });
    });

    /**
     * @route GET /games
     * @description Fetches available games from JMCS.
     * @returns {Array} List of games.
     */
    publicRouter.get("/games", tokenRequired, async (req, res) => {
        const games = await jmcs.getCachedGames();

        return res.send({
            games
        });
    });

    /**
     * @route GET /playlists
     * @description Fetches available playlists from JMCS.
     * @returns {Array} List of playlists.
     */
    publicRouter.get("/playlists", tokenRequired, async (req, res) => {
        const playlists = await jmcs.getCachedPlaylists();

        return res.send({
            playlists
        });
    });

    /**
     * @route GET /aliases
     * @description Fetches available aliases from JMCS.
     * @returns {Array} List of aliases.
     */
    publicRouter.get("/aliases", tokenRequired, async (req, res) => {
        const aliases = await jmcs.getCachedAliases();

        return res.send({
            aliases
        });
    });

    /**
     * @route GET /items
     * @description Fetches customizable items from JMCS.
     * @returns {Object} Contains avatars, skins, and portrait borders.
     */
    publicRouter.get("/items", async (req, res) => {
        const { avatars, skins, portraitBorders } = await jmcs.getCachedCustomizableItems();

        return res.send({
            avatars,
            skins,
            portraitBorders
        });
    });

    /**
     * @route GET /leaderboard
     * @description Fetches leaderboard for a specific map and platform.
     * @param {string} mapName - The map name.
     * @param {string} platform - The platform.
     * @returns {Object} Leaderboard data.
     */
    publicRouter.get("/leaderboard", tokenRequired, async (req, res) => {
        const { mapName, platform } = req.query;
        const profileId = req.profileId ? req.profileId : null;
        const leaderboard = await jmcs.getLeaderboard(mapName, platform, profileId);

        return res.send({
            leaderboard
        });
    });

    /**
     * @route GET /spotlight
     * @description Returns the cached top-100 spotlight leaderboard.
     * Never blocks the request — returns cached data immediately and refreshes in background if stale.
     */
    publicRouter.get("/spotlight", tokenRequired, async (req, res) => {
        const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

        const cache = await jmcs.getSpotlightCache();

        if (!cache) {
            // Fire background compute, tell the user to retry
            jmcs.computeSpotlight().catch(err => {
                logger.error(`Background spotlight bootstrap failed: ${err.message}`);
            });
            return res.status(202).send({
                message: "Spotlight is being computed for the first time. Please retry in a moment.",
                players: [],
                total: 0,
                computedAt: null
            });
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            jmcs.computeSpotlight().catch(err => {
                logger.error(`Background spotlight refresh failed: ${err.message}`);
            });
        }

        return res.send({
            players: cache.players,
            total: cache.total,
            computedAt: cache.computedAt
        });
    });

    /**
     * @route POST /spotlight/refresh
     * @description Triggers a full recomputation of the spotlight leaderboard and updates the MongoDB cache.
     * This is an expensive operation — restrict to admins only.
     */
    publicRouter.post("/spotlight/refresh", tokenRequired, adminOnly, async (req, res) => {
        const { players, total, computedAt } = await jmcs.computeSpotlight();

        return res.send({
            message: "Spotlight cache refreshed.",
            players,
            total,
            computedAt
        });
    });


    /**
     * @route GET /dotw
     * @description Fetches Dancer of the Week for a specific map.
     * @param {string} mapName - The map name.
     * @returns {Object} Dancer of the Week data.
     */
    publicRouter.get("/dotw", tokenRequired, async (req, res) => {
        const { mapName } = req.query;
        const dotw = await jmcs.getDancerOfTheWeek(mapName);

        return res.send({
            dotw
        });
    });

    /**
     * @route GET /stats
     * @description Fetches JMCS stats.
     * @returns {Object} JMCS stats.
     */
    publicRouter.get("/stats", async (req, res) => {
        const stats = await jmcs.getJmcsStats();
        const randomNumber = Math.floor(Math.random() * 4) + 100

        return res.send({
            stats: {
                ...stats,
                // If live player is 0, give a random number for optics
                livePlayers: stats?.livePlayers == 0 ? randomNumber : stats?.livePlayers
            }
        });
    })

    /**
     * @route GET /wdf/rooms
     * @description Fetches available Dance Fever rooms.
     * @returns {Array} List of Dance Fever rooms.
     */
    publicRouter.get("/wdf/rooms", tokenRequired, async (req, res) => {
        const rooms = jmcs.getWdfRooms();

        return res.send({
            rooms: rooms.filter(r => r.enabled).map(r => ({
                room: r.roomName,
                name: r.name,
                seasonsEnabled: r.seasonsEnabled
            }))
        });
    });

    /**
     * @route GET /wdf/status
     * @description Fetches status for a specific Dance Fever room.
     * @param {string} room - The room name.
     * @returns {Object} Room status data.
     */
    publicRouter.get("/wdf/status", tokenRequired, async (req, res) => {
        const { room } = req.query;
        const status = await jmcs.getWdfStatus(room);

        return res.send({
            status: status
        });
    });

    /**
     * @route GET /wdf/ccu
     * @description Fetches current players in a specific Dance Fever room.
     * @param {string} room - The room name.
     * @returns {Object} CCU data.
     */
    publicRouter.get("/wdf/ccu", tokenRequired, async (req, res) => {
        const { room } = req.query;
        const ccu = await jmcs.getWdfCCU(room);

        return res.send({
            ccu
        });
    });

    /**
     * @route GET /wdf/live-scores
     * @description Fetches live scores for a specific Dance Fever room.
     * @param {string} room - The room name.
     * @returns {Object} Live scores data.
     */
    publicRouter.get("/wdf/live-scores", tokenRequired, async (req, res) => {
        const { room } = req.query;
        const scores = await jmcs.getWdfLiveScores(room);

        return res.send({
            scores
        });
    });
};