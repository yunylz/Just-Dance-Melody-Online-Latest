const axios = require("axios");

const config = require('../config');
const utils = require("./utils");

const localWdfConfig = require("../data/wdf");
const { HOME_TILE_TYPES } = require("./enums");
const fs = require("node:fs");
const users = require("./users");
const SpotlightCache = require("./models/spotlight-cache");
const SongDBCache = require("./models/songdb-cache");
const PlaylistCache = require("./models/playlist-cache");
const ItemCache = require("./models/item-cache");
const GameCache = require("./models/game-cache");
const AliasCache = require("./models/alias-cache");
const logger = require("./logger").createLogger({ service: "jmcs" });

class JeanMich {
    /**
     * Initializes the JeanMich class with configuration values from the environment variables or defaults.
     */
    constructor() {
        this.FQDN = config.JMCS.FQDN;
        this.TOKEN = config.JMCS.S2S_TOKEN;
        this.USER_AGENT = config.JMCS.USER_AGENT;
        this.LEGACY_SKUID = "jd2018-nx-all";
        this.SKUID = "jd2022-nx-all";
    };

    /**
     * Creates a JMCS request with the appropriate headers and error handling.
     * @param {Object} param0 
     * @param {string} param0.method - HTTP method (default: "GET")
     * @param {string} param0.route - API route (default: "/songdb/v1/songs")
     * @param {Object} param0.headers - Additional headers to include in the request
     * @param {Object} param0.data - Data to send in the request body (for POST/PUT requests)
     * @returns 
     */
    async request({
        method = "GET",
        route = "/songdb/v1/songs",
        headers = {},
        data = {},
        query = {}
    } = {}) {
        try {
            const response = await axios({
                method,
                url: `${this.FQDN}${route}`,
                headers: {
                    "x-skuid": this.SKUID,
                    ...headers,
                    "User-Agent": this.USER_AGENT,
                    "Authorization": `Bearer ${this.TOKEN}`
                },
                data,
                params: query
            });
            return response.data;
        } catch (error) {
            logger.error(`Error requesting from ${this.FQDN}: ${error.message}`);
            logger.debug(error)
            throw error;
        }
    };

    /**
     * Returns the entire song database from JMCS.
     * @returns {Object}
     */
    async getSongDb() {
        return this.request({
            method: "GET",
            route: "/songdb/v1/songs"
        });
    };

    /**
     * Formats JMCS songDb into Hub format.
     * @returns {Array}
     */
    async getHubSongDb() {
        const songDb = await this.getSongDb();
        const hubSongDb = [];

        // Format JMCS songDb into Hub format.
        for (const [mapName, songDesc] of Object.entries(songDb)) {
            const tags = songDesc.tags.map(t => t.toLowerCase());
            hubSongDb.push({
                mapName: songDesc.mapName,
                assets: {
                    cover: songDesc.assets.phoneCoverImageUrl,
                    audioPreview: songDesc.urls[`jmcs://jd-contents/${mapName}/${mapName}_AudioPreview.ogg`]
                },
                title: songDesc.title,
                artist: songDesc.artist,
                jdVersion: songDesc.originalJDVersion,
                coachCount: songDesc.coachCount,
                credits: songDesc.credits,
                duration: songDesc.mapLength,
                difficulty: songDesc.difficulty,
                sweatDifficulty: songDesc.sweatDifficulty,
                tags: songDesc.tags,
                // TODO: do this check better, maybe? -yunyl
                isAlternative: tags.includes("alternate"),
                isMashup: tags.includes("mashup") || mapName.toLowerCase().endsWith("mu"),
                isFanmade: tags.includes("fanmade") || mapName.toLowerCase().endsWith("fan") || mapName.toLowerCase().endsWith("vip"),
                isKids: tags.includes("kids") || mapName.toLowerCase().endsWith("kids") || mapName.toLowerCase().startsWith("kids"),
                isPatreon: songDesc.isPatreon || false
            });
        };

        // Sort by title alphabetically
        hubSongDb.sort((a, b) => a.title.localeCompare(b.title));

        return hubSongDb;
    };

    /**
     * Fetches the song database from JMCS and caches it in MongoDB.
     * Uses a stale-while-revalidate pattern (TTL = 1 hour).
     *
     * Cache behaviour:
     *   - MISSING  → fetch from JMCS synchronously (first-time bootstrap), cache & return
     *   - STALE    → return stale data immediately, refresh cache in background
     *   - FRESH    → return instantly
     * @returns {Promise<Array>}
     */
    async getCachedHubSongDb() {
        const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

        const cache = await SongDBCache.findOne({ cacheId: 'songdb' });

        if (!cache) {
            // No cache — bootstrap synchronously on first request
            const songs = await this.getHubSongDb();
            await SongDBCache.findOneAndUpdate(
                { cacheId: 'songdb' },
                { cacheId: 'songdb', songs, computedAt: new Date() },
                { upsert: true, new: true }
            );
            return songs;
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            // Return stale data immediately, recompute in background
            this.refreshHubSongDb().catch(err => {
                logger.error(`Background songdb refresh failed: ${err.message}`);
            });
        }

        return cache.songs;
    };

    /**
     * Refreshes the song database cache by fetching from JMCS and persisting to MongoDB.
     * This runs in the background when the cache is stale.
     * @returns {Promise<void>}
     */
    async refreshHubSongDb() {
        const songs = await this.getHubSongDb();
        await SongDBCache.findOneAndUpdate(
            { cacheId: 'songdb' },
            { cacheId: 'songdb', songs, computedAt: new Date() },
            { upsert: true, new: true }
        );
    };

    /**
     * Fetches constants from JMCS.
     * @returns {Object}
     */
    async getConstants() {
        return this.request({
            method: "GET",
            route: "/constant-provider/v1/sku-constants"
        });
    }

    async getSkus() {
        return this.request({
            method: "GET",
            route: "/status/v1/skus"
        });
    };

    /**
     * Fetches local games and JMCS games, combines them in one.
     * @returns {Array}
     */
    async getGames() {
        const localGames = require("../data/games");
        const constants = await this.getConstants();
        const overrides = constants.JDVersion.Override;
        const jmcsGames = Object.entries(overrides).map(([version, name]) => {
            return {
                name: `Just Dance ${name}`,
                jdVersion: version,
                isAvailable: true,
                isSupportedByJdmo: false,
                platforms: []
            }
        });

        jmcsGames.sort((a, b) => a.name.localeCompare(b.name));

        // Merge local and JMCS games
        return [
            ...localGames,
            ...jmcsGames
        ]
    };

    /**
     * Fetches games from JMCS and caches them in MongoDB.
     * Uses a stale-while-revalidate pattern (TTL = 1 hour).
     *
     * Cache behaviour:
     *   - MISSING  → fetch from JMCS synchronously (first-time bootstrap), cache & return
     *   - STALE    → return stale data immediately, refresh cache in background
     *   - FRESH    → return instantly
     * @returns {Promise<Array>}
     */
    async getCachedGames() {
        const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

        const cache = await GameCache.findOne({ cacheId: 'games' });

        if (!cache) {
            const games = await this.getGames();
            await GameCache.findOneAndUpdate(
                { cacheId: 'games' },
                { cacheId: 'games', games, computedAt: new Date() },
                { upsert: true, new: true }
            );
            return games;
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            this.refreshGames().catch(err => {
                logger.error(`Background games refresh failed: ${err.message}`);
            });
        }

        return cache.games;
    };

    /**
     * Refreshes the games cache by fetching from JMCS and persisting to MongoDB.
     * Runs in the background when the cache is stale.
     * @returns {Promise<void>}
     */
    async refreshGames() {
        const games = await this.getGames();
        await GameCache.findOneAndUpdate(
            { cacheId: 'games' },
            { cacheId: 'games', games, computedAt: new Date() },
            { upsert: true, new: true }
        );
    };

    /**
     * Fetches JMCS playlists.
     * @returns {Array}
     */
    async getPlaylists() {
        const playlists = await this.request({
            method: "GET",
            route: "/playlistdb/v1/playlists"
        });

        const db = playlists.db;

        // Format JMCS playlists into Hub format.
        const hubPlaylists = [];
        for (const [playlistId, data] of Object.entries(db)) {
            hubPlaylists.push({
                playlistId,
                songs: data.maps,
                title: data.title,
                description: data.description,
                cover: data.coverURL,
                fallback: data.fallback,
                colors: data.colors ? {
                    baseColor: data.colors.base_color,
                    gradColor: data.colors.grad_color,
                } : {}
            });
        };

        // Sort by title alphabetically
        hubPlaylists.sort((a, b) => a.title.localeCompare(b.title));

        return hubPlaylists.filter(p => p.songs.length > 0 && !p.fallback);
    };

    /**
     * Fetches playlists from JMCS and caches them in MongoDB.
     * Uses a stale-while-revalidate pattern (TTL = 1 hour).
     *
     * Cache behaviour:
     *   - MISSING  → fetch from JMCS synchronously (first-time bootstrap), cache & return
     *   - STALE    → return stale data immediately, refresh cache in background
     *   - FRESH    → return instantly
     * @returns {Promise<Array>}
     */
    async getCachedPlaylists() {
        const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

        const cache = await PlaylistCache.findOne({ cacheId: 'playlists' });

        if (!cache) {
            const playlists = await this.getPlaylists();
            await PlaylistCache.findOneAndUpdate(
                { cacheId: 'playlists' },
                { cacheId: 'playlists', playlists, computedAt: new Date() },
                { upsert: true, new: true }
            );
            return playlists;
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            this.refreshPlaylists().catch(err => {
                logger.error(`Background playlists refresh failed: ${err.message}`);
            });
        }

        return cache.playlists;
    };

    /**
     * Refreshes the playlists cache by fetching from JMCS and persisting to MongoDB.
     * Runs in the background when the cache is stale.
     * @returns {Promise<void>}
     */
    async refreshPlaylists() {
        const playlists = await this.getPlaylists();
        await PlaylistCache.findOneAndUpdate(
            { cacheId: 'playlists' },
            { cacheId: 'playlists', playlists, computedAt: new Date() },
            { upsert: true, new: true }
        );
    };

    /**
     * Resolves a JMCS entry against the Hub user database.
     * Returns the entry overlaid with hub username/avatar/country, or null if the player isn't registered on Hub.
     * @param {{ profileId: string, avatar: number, country: number }} jmcsEntry
     * @returns {Promise<{ username: string, avatar: number, country: number } | null>}
     */
    async _resolveHubOverlay(jmcsEntry) {
        const [hubProfile] = await users.getMultipleProfiles([jmcsEntry.profileId]);
        if (!hubProfile) return null;

        return {
            username: hubProfile.username,
            avatar: hubProfile.avatarId ?? jmcsEntry.avatar,
            country: (hubProfile.country ? utils.getCountryByCode(hubProfile.country)?.id : null)
                ?? utils.getCountryById(jmcsEntry.country)
                ?? utils.getDefaultCountry(),
        };
    };

    /**
     * Fetches a leaderboard for a given map and platform.
     * @param {string} mapName Map name
     * @param {string} platform Platform to check, can be "all" for all platforms. If you're not sure see config.PLATFORMS for available platforms.
     * @param {string} currentProfileId 
     * @returns {Array}
     */
    async getLeaderboard(mapName = "ExampleMap", platform = "all", currentProfileId = null) {
        let entries = [];

        if (platform === "all") {
            // fetch all platforms
            const results = await Promise.all(
                config.PLATFORMS.map(async (p) => {
                    try {
                        const res = await this.request({
                            method: "GET",
                            route: `/leaderboard/v1/maps/${mapName}/world?platform=${p}`,
                            headers: {
                                "x-skuid": this.LEGACY_SKUID
                            }
                        });

                        // attach platform to each entry
                        return res.entries.map(e => ({
                            ...e,
                            platform: p
                        }));
                    } catch (error) {
                        logger.error(`Failed to fetch leaderboard for platform ${p}: ${error.message}`);
                        return [];
                    }
                })
            );

            // flatten all entries
            entries = results.flat();
        } else {
            // fix platforms for jdmo
            if (platform == "ps4") platform = "psn";
            if (platform == "pc") platform = "uplay";
            if (platform == "nx") platform = "switch";

            const leaderboard = await this.request({
                method: "GET",
                route: `/leaderboard/v1/maps/${mapName}/world?platform=${platform}`,
                headers: {
                    "x-skuid": this.LEGACY_SKUID
                }
            });

            entries = leaderboard.entries.map(e => ({
                ...e,
                platform
            }));
        }

        // recompute rank globally
        entries.sort((a, b) => b.score - a.score);

        // remove profileid duplicates
        entries = entries.filter((e, i, arr) => i === arr.findIndex(e2 => e2.profileId === e.profileId));

        // resolve all entries against Hub — drop guests / unregistered players
        const overlays = await Promise.all(entries.map(e => this._resolveHubOverlay(e)));
        const resolved = entries
            .map((entry, i) => ({ entry, overlay: overlays[i] }))
            .filter(({ overlay }) => overlay !== null);

        // this is to fix a hub bug that im lazy to fix -yunyl
        const fixBackPlatform = (platform) => {
            if (platform === "psn") return "ps4";
            if (platform === "uplay") return "pc";
            if (platform === "switch") return "nx";
            return platform;
        };

        // format + assign new rank, overlaying hub profile data
        const hubLeaderboard = resolved.map(({ entry, overlay }, index) => ({
            rank: index + 1,
            score: entry.score,
            username: overlay.username,
            country: overlay.country,
            avatar: overlay.avatar,
            alias: entry.alias,
            aliasGender: entry.aliasGender,
            jdPoints: entry.jdPoints,
            portraitBorder: entry.portraitBorder,
            platform: fixBackPlatform(entry.platform),
            isCurrentUser: entry.profileId === currentProfileId,
        }));

        return hubLeaderboard;
    }

    /**
     * Fetches customizable items from JMCS.
     * @returns {Object} avatars, items and portrait borders
     */
    async getCustomizableItems() {
        const items = await this.request({
            method: "GET",
            route: "/customizable-itemdb/v1/items"
        });

        // visiblity must be 1 to be visible
        const avatars = Object.entries(items.avatars).map(([id, data]) => ({
            id,
            url: data.url,
        }));
        const skins = Object.entries(items.skins).map(([id, data]) => ({
            id,
            url: data.url
        }));
        const portraitBorders = Object.entries(items.portraitBorders).map(([id, data]) => ({
            id,
            backgroundUrl: data.backgroundUrl,
            foregroundUrl: data.foregroundUrl
        }));

        // Sort all by id
        avatars.sort((a, b) => a.id - b.id);
        skins.sort((a, b) => a.id - b.id);
        portraitBorders.sort((a, b) => a.id - b.id);

        return {
            avatars,
            skins,
            portraitBorders
        }
    };

    /**
     * Fetches customizable items from JMCS and caches them in MongoDB.
     * Uses a stale-while-revalidate pattern (TTL = 1 hour).
     *
     * Cache behaviour:
     *   - MISSING  → fetch from JMCS synchronously (first-time bootstrap), cache & return
     *   - STALE    → return stale data immediately, refresh cache in background
     *   - FRESH    → return instantly
     * @returns {Promise<{ avatars: Array, skins: Array, portraitBorders: Array }>}
     */
    async getCachedCustomizableItems() {
        const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

        const cache = await ItemCache.findOne({ cacheId: 'items' });

        if (!cache) {
            const items = await this.getCustomizableItems();
            await ItemCache.findOneAndUpdate(
                { cacheId: 'items' },
                { cacheId: 'items', items, computedAt: new Date() },
                { upsert: true, new: true }
            );
            return items;
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            this.refreshCustomizableItems().catch(err => {
                logger.error(`Background customizable items refresh failed: ${err.message}`);
            });
        }

        return cache.items;
    };

    /**
     * Refreshes the customizable items cache by fetching from JMCS and persisting to MongoDB.
     * Runs in the background when the cache is stale.
     * @returns {Promise<void>}
     */
    async refreshCustomizableItems() {
        const items = await this.getCustomizableItems();
        await ItemCache.findOneAndUpdate(
            { cacheId: 'items' },
            { cacheId: 'items', items, computedAt: new Date() },
            { upsert: true, new: true }
        );
    };

    /**
     * Fetches the Dancer of the Week for a given map.
     * @param {string} mapName Map name
     * @returns {Object} DOTW data
     */
    async getDancerOfTheWeek(mapName = "ExampleMap") {
        const dancerOfTheWeek = await this.request({
            method: "GET",
            route: `/leaderboard/v1/maps/${mapName}/dancer-of-the-week`,
            headers: {
                "x-skuid": this.SKUID
            }
        });

        if (!dancerOfTheWeek.name || !dancerOfTheWeek.rank || !dancerOfTheWeek.score) {
            return {};
        };

        // Only show dancer if they are registered on Hub
        const overlay = await this._resolveHubOverlay(dancerOfTheWeek);
        if (!overlay) return {};

        return {
            score: dancerOfTheWeek.score,
            username: overlay.username,
            country: overlay.country,
            avatar: overlay.avatar,
            alias: dancerOfTheWeek.alias,
            aliasGender: dancerOfTheWeek.aliasGender,
            jdPoints: dancerOfTheWeek.jdPoints,
            portraitBorder: dancerOfTheWeek.portraitBorder,
            rank: dancerOfTheWeek.rank,
            platform: dancerOfTheWeek.platform,
        };
    };

    /**
     * Fetches the WDF rooms from local config.
     * @returns {Array} WDF rooms
     */
    getWdfRooms() {
        return localWdfConfig.ROOMS;
    };

    /**
     * Fetches live status for a given WDF room.
     * @param {String} room Room name
     * @returns {Object} WDF data
     */
    async getWdfStatus(room = "MainJDMO") {
        const roomConfig = this.getWdfRooms().find(r => r.roomName === room);
        const skuId = "jd2022-nx-all";
        const epoch = Math.floor(Date.now() / 1000);

        const screens = await this.request({
            method: "POST",
            route: `/wdf/v1/rooms/${room}/screens`,
            data: {
                startTime: epoch
            },
            headers: {
                "x-skuid": skuId
            }
        });

        const ccu = await this.request({
            method: "GET",
            route: `/wdf/v1/rooms/${room}/ccu`,
            headers: {
                "x-skuid": skuId
            }
        });

        const onlineRankWidget = await this.request({
            method: "GET",
            route: `/wdf/v1/rooms/${room}/online-rank-widget`,
            headers: {
                "x-skuid": skuId
            }
        });

        let previousSeasonWinner = {}
        if (onlineRankWidget.previousSeasonWinner) {
            previousSeasonWinner = {
                wdfPoints: onlineRankWidget.previousSeasonWinner.wdfPoints,
                dancer: {
                    username: onlineRankWidget.previousSeasonWinner.dc.name,
                    avatar: onlineRankWidget.previousSeasonWinner.dc.avatar,
                    skin: onlineRankWidget.previousSeasonWinner.dc.skin,
                    jdPoints: onlineRankWidget.previousSeasonWinner.dc.jdPoints,
                    alias: onlineRankWidget.previousSeasonWinner.dc.alias,
                    aliasGender: onlineRankWidget.previousSeasonWinner.dc.aliasGender,
                    country: onlineRankWidget.previousSeasonWinner.dc.country,
                    portraitBorder: onlineRankWidget.previousSeasonWinner.dc.portraitBorder,
                    platform: onlineRankWidget.previousSeasonWinner.dc.platform,
                    tournamentBadge: onlineRankWidget.previousSeasonWinner.dc.tournamentBadge,
                }
            }
        }

        const excludeTypes = [
            "boss-intro",
            "boss-lobby",

            "vote-lobby",
            "map-lobby",
            "waiting-screen",

            "spotlight-intro",
            "spotlight-lobby",

            "teambattle-intro",
            "teambattle-lobby",

            "tournament-lobby",

            "side-selection",
            "sidevsside-lobby",
            "sidevsside-recap"
        ];

        return {
            screens: screens.screens.filter(s => !excludeTypes.includes(s.type)).map(s => {
                let object = {
                    type: s.type,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    theme: s.theme,
                }
                if (s.mapName) object.mapName = s.mapName;
                if (s.voteInfo) {
                    object.voteInfo = {
                        voteOptions: s.voteInfo.voteOptions,
                        voteStartTime: s.voteInfo.voteStartTime,
                        voteResultFetchTime: s.voteInfo.voteResultFetchTime,
                    }
                }
                return object;
            }),
            playerCount: ccu,
            season: roomConfig.seasonsEnabled ? {
                currentSeasonEndTime: onlineRankWidget.currentSeasonEndTime,
                seasonNumber: onlineRankWidget.seasonNumber,
                currentSeasonDancerCount: onlineRankWidget.currentSeasonDancerCount,
                previousSeasonWinner
            } : {}
        }
    };

    async getWdfCCU(room = "MainJDMO") {
        const skuId = "jd2022-nx-all";
        const ccu = await this.request({
            method: "GET",
            route: `/wdf/v1/rooms/${room}/ccu`,
            headers: {
                "x-skuid": skuId
            }
        });

        return ccu;
    }

    async getWdfLiveScores(room = "MainJDMO") {
        const skuId = "jd2022-nx-all";
        const scores = await this.request({
            method: "GET",
            route: `/wdf/v1/rooms/${room}/live-scores`,
            headers: {
                "x-skuid": skuId
            }
        });

        const scoresArray = scores.scores;

        const formattedScores = scoresArray.map(user => {
            return {
                rank: user.rank,
                score: utils.fixScore(user.score),
                username: user.dc.name,
                avatar: user.dc.avatar,
                country: user.dc.country,
                portraitBorder: user.dc.portraitBorder,
                skin: user.dc.skin,
                jdPoints: user.dc.jdPoints,
                platform: user.dc.platform,
                tournamentBadge: user.dc.tournamentBadge,
            };
        });

        return formattedScores;
    }

    async getHomeTiles() {
        const tiles = await this.request({
            method: "POST",
            route: "/home/v1/tiles"
        });

        const tileList = tiles.tileList;

        const formattedTiles = tileList.map(tile => {
            let data = {
                type: tile.type,
                locked: tile.locked,
                new: tile.new,
            };

            if (tile.type === HOME_TILE_TYPES.MAP) {
                data.mapTileInfo = {
                    mapName: tile.mapTileInfo.mapName,
                    type: tile.mapTileInfo.type,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.PLAYLIST) {
                data.playlistTileInfo = {
                    playlistID: tile.playlistTileInfo.playlistID,
                    type: tile.playlistTileInfo.type,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.NEWS) {
                data.newsTileInfo = {
                    type: tile.newsTileInfo.type,
                    title: tile.newsTileInfo.title,
                    text: tile.newsTileInfo.text,
                    imageUrl: tile.newsTileInfo.imageUrl,
                    winnerPid: tile.newsTileInfo.winnerPid,
                    winnerPlatform: tile.newsTileInfo.winnerPlatform,
                    winnerName: tile.newsTileInfo.winnerName,
                    winnerNameSuffix: tile.newsTileInfo.winnerNameSuffix,
                    winnerCountry: tile.newsTileInfo.winnerCountry,
                    winnerAvatar: tile.newsTileInfo.winnerAvatar,
                    winnerAlias: tile.newsTileInfo.winnerAlias,
                    trackingTag: tile.newsTileInfo.trackingTag,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.VIDEO) {
                data.videoTileInfo = {
                    type: tile.videoTileInfo.type,
                    description: tile.videoTileInfo.description,
                    streaming: tile.videoTileInfo.streaming,
                    metadataUrl: tile.videoTileInfo.metadataUrl,
                    thumbnailUrl: tile.videoTileInfo.thumbnailUrl,
                    trackingTag: tile.videoTileInfo.trackingTag,
                    dancerPid: tile.videoTileInfo.dancerPid,
                    dancerPlatform: tile.videoTileInfo.dancerPlatform,
                    dancerName: tile.videoTileInfo.dancerName,
                    dancerNameSuffix: tile.videoTileInfo.dancerNameSuffix,
                    dancerCountry: tile.videoTileInfo.dancerCountry,
                    dancerAvatar: tile.videoTileInfo.dancerAvatar,
                    dancerAlias: tile.videoTileInfo.dancerAlias,
                    dancerAliasGender: tile.videoTileInfo.dancerAliasGender,
                    dancerPortraitBorder: tile.videoTileInfo.dancerPortraitBorder,
                    dancerJDPoints: tile.videoTileInfo.dancerJDPoints,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.FEEDBACK) {
                data.feedbackTileInfo = {
                    title: tile.feedbackTileInfo.title,
                    text: tile.feedbackTileInfo.text,
                    feedbackQuestionID: tile.feedbackTileInfo.feedbackQuestionID,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.UPLAY) {
                data.uplayTileInfo = {
                    type: tile.uplayTileInfo.type,
                    name: tile.uplayTileInfo.name,
                    cost: tile.uplayTileInfo.cost,
                    imageUrl: tile.uplayTileInfo.imageUrl,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.OFFLINEGENERATION) {
                data.offlineGenTileInfo = {
                    targetType: tile.offlineGenTileInfo.targetType,
                    targetSubtype: tile.offlineGenTileInfo.targetSubtype,
                };
            }
            else if (tile.type === HOME_TILE_TYPES.CUSTOMIZABLEITEM) {
                data.customizableItemTileInfo = {
                    type: tile.customizableItemTileInfo.type,
                    customizableItemId: tile.customizableItemTileInfo.customizableItemId,
                };
            }

            return data;
        });

        return formattedTiles;
    }
    /**
     * Creates a playlist in JMCS.
     * @param {string} userId 
     * @param {Object} playlistData 
     * @returns {Promise<Object>}
     */
    async createPlaylist(userId, playlistData) {
        return this.request({
            method: "POST",
            route: "/playlistdb/v1/playlists",
            data: {
                id: playlistData.id,
                ownerId: userId,
                title: playlistData.title,
                description: playlistData.description || "",
                songs: playlistData.songs.map(s => ({
                    mapName: s.mapName,
                    title: s.title,
                    artist: s.artist,
                    coverUrl: s.coverUrl
                })),
                isPublic: playlistData.isPublic,
                updatedAt: new Date(playlistData.updatedAt).toISOString()
            }
        });
    }

    /**
     * Updates a playlist in JMCS.
     * @param {string} playlistId 
     * @param {Object} playlistData 
     * @returns {Promise<Object>}
     */
    async updatePlaylist(playlistId, playlistData) {
        return this.request({
            method: "PUT",
            route: `/playlistdb/v1/playlists/${playlistId}`,
            data: {
                title: playlistData.title,
                description: playlistData.description,
                songs: playlistData.songs ? playlistData.songs.map(s => ({
                    mapName: s.mapName,
                    title: s.title,
                    artist: s.artist,
                    coverUrl: s.coverUrl
                })) : undefined,
                isPublic: playlistData.isPublic,
                updatedAt: new Date(playlistData.updatedAt).toISOString()
            }
        });
    }

    /**
     * Deletes a playlist in JMCS.
     * @param {string} playlistId 
     * @returns {Promise<Object>}
     */
    async deletePlaylist(playlistId) {
        return this.request({
            method: "DELETE",
            route: `/playlistdb/v1/playlists/${playlistId}`
        });
    }

    /**
     * Syncs user playlists to JMCS.
     * @param {string} userId 
     * @param {Array} playlists 
     * @returns {Promise<Object>}
     */
    async syncUserPlaylists(userId, playlists) {
        return this.request({
            method: "POST",
            route: `/playlistdb/v1/users/${userId}/sync`,
            data: {
                playlists: playlists.map(p => ({
                    id: p.id,
                    ownerId: p.ownerId,
                    title: p.title,
                    description: p.description || "",
                    songs: p.songs.map(s => ({
                        mapName: s.mapName,
                        title: s.title,
                        artist: s.artist,
                        coverUrl: s.coverUrl
                    })),
                    isPublic: p.isPublic,
                    updatedAt: new Date(p.updatedAt).toISOString()
                }))
            }
        });
    };

    /**
     * Fetches all profiles from JMCS in batches to avoid overwhelming the server.
     * Uses pagination (500 per page) and concatenates results.
     * @returns {Promise<Array>}
     */
    async getAllProfiles() {
        const BATCH_SIZE = 500;
        let allProfiles = [];
        let skip = 0;
        let batch;

        do {
            batch = await this.request({
                method: "GET",
                route: "/backoffice/v1/profiles",
                query: { skip, limit: BATCH_SIZE }
            });
            allProfiles = allProfiles.concat(batch);
            skip += BATCH_SIZE;
            logger.info(`Fetched ${allProfiles.length} JMCS profiles so far...`);
        } while (batch.length === BATCH_SIZE);

        return allProfiles;
    };

    /**
     * Computes the spotlight leaderboard and persists the top 100 to MongoDB.
     * Fetches all registered hub profiles first, then only scores jmcs profiles
     * that belong to a registered user — avoids processing 13k guests.
     * @returns {Promise<Object>} { players, total, computedAt }
     */
    async computeSpotlight() {
        const startTime = Date.now();
        logger.info("Spotlight computation started");

        if (utils.isLocal()) {
            logger.warn("Spotlight computation skipped in local environment");
            return {
                players: [],
                total: 0,
                computedAt: new Date()
            };
        }

        // Fetch jmcs profiles and registered hub profiles in parallel
        const [allJmcsProfiles, allHubProfiles] = await Promise.all([
            this.getAllProfiles(),
            users.getAllRegisteredProfiles()
        ]);
        logger.info(`Spotlight | Fetched ${allJmcsProfiles.length} JMCS profiles and ${allHubProfiles.length} Hub profiles (${Date.now() - startTime}ms)`);

        // Build profileId → hub data map for O(1) lookups
        const hubProfileMap = new Map();
        for (const hubProfile of allHubProfiles) {
            hubProfileMap.set(hubProfile.profileId, hubProfile);
        }

        // Drop jmcs profiles with no hub account before doing any work
        const registeredJmcsProfiles = allJmcsProfiles.filter(p => hubProfileMap.has(p.profileId));
        logger.info(`Spotlight | ${registeredJmcsProfiles.length} profiles belong to registered Hub users (${Date.now() - startTime}ms)`);

        // Score and format — all hub data already in memory, no async needed
        const formattedProfiles = registeredJmcsProfiles.map(profile => {
            const hub = hubProfileMap.get(profile.profileId);
            const stats = this.computeProfileStats(profile);

            // Has user shared their account to the public?
            const isUserShared = hub.hubSettings.shareAccount
            if (!isUserShared) return null;

            return {
                username: hub.username || profile.nickname || profile.name,
                name: profile.name,
                avatar: hub.avatarId ?? profile.avatar,
                country: (hub.country ? utils.getCountryByCode(hub.country)?.id : null) ?? profile.country,
                portraitBorder: profile.portraitBorder,
                alias: profile.alias,
                aliasGender: profile.aliasGender,
                ...stats,
                profileId: profile.profileId,
                userId: hub.userId,
                platform: hub.platformType,
                wdfRank: profile.wdfRank,
            };
        }).filter(p => p !== null);

        // Deduplicate by userId — keep highest reputationScore per user
        const bestByUser = new Map();
        for (const p of formattedProfiles) {
            if (!p.userId) continue;
            const existing = bestByUser.get(p.userId);
            if (!existing || p.reputationScore > existing.reputationScore) {
                bestByUser.set(p.userId, p);
            }
        }
        const uniqueProfiles = Array.from(bestByUser.values());

        // Sort by reputationScore descending
        uniqueProfiles.sort((a, b) => b.reputationScore - a.reputationScore);

        // Top 100, assign rank
        const top100 = uniqueProfiles.slice(0, 100).map((p, i) => ({
            ...p,
            rank: i + 1
        }));

        await SpotlightCache.findOneAndUpdate(
            { cacheId: 'spotlight' },
            {
                cacheId: 'spotlight',
                players: top100,
                total: uniqueProfiles.length,
                computedAt: new Date()
            },
            { upsert: true, new: true }
        );

        const elapsed = Date.now() - startTime;
        logger.info(`Spotlight computation completed — ${uniqueProfiles.length} total players, top 100 saved (${elapsed}ms)`);

        return {
            players: top100,
            total: uniqueProfiles.length,
            computedAt: new Date()
        };
    };

    /**
     * Returns the cached spotlight leaderboard from MongoDB.
     * Returns null if the cache has never been computed.
     * @returns {Promise<Object|null>} { players, total, computedAt } or null
     */
    async getSpotlightCache() {
        const cache = await SpotlightCache.findOne({ cacheId: 'spotlight' });
        if (!cache) return null;
        return {
            players: cache.players,
            total: cache.total,
            computedAt: cache.computedAt
        };
    };

    async getJmcsStats() {
        const stats = await this.request({
            method: "GET",
            route: `/status/v1/stats`
        });
        if (!stats) return {};
        return stats;
    };

    /**
     *
     * @param {*} profileIds 
     * @returns 
     */
    async getActivitiesFeed(profileIds = [], count = 10, skip = 0, types = [], showProfileId = false, showUserId = false) {
        const feed = await this.request({
            method: "POST",
            route: "/live/v1/activities/feed",
            data: profileIds || [],
            query: {
                count,
                skip,
                types: types.length === 0 ? null : types.join(",")
            }
        });
        const skus = await this.getSkus();
        const songDb = await this.getCachedHubSongDb() || [];

        if (!feed || !Array.isArray(feed.activities)) return [];

        const resolveGameName = (gameVersion, platform) => {
            // since we dont get regions from activities, try all regions until you find it. its stupid... -yunyl
            const regions = ["ww", "scee", "scea", "dev", "all", "cn", "ncsa", "noe", "noa", "mobile", "emea"]
            for (const region of regions) {
                const key = `${gameVersion}-${platform}-${region}`;
                if (skus[key]) return skus[key].name;
            }
            return gameVersion;
        };

        // Collect unique profile IDs
        const uniqueProfileIds = [...new Set(feed.activities.map(a => a.pid))];

        // Fetch hub profiles for all unique profile IDs efficiently
        const hubProfiles = await users.getMultipleProfiles(uniqueProfileIds);
        const hubProfileMap = new Map(
            hubProfiles
                .filter(p => p != null)
                .map(p => [p.profileId, p])
        );

        // Format and filter activities
        return feed.activities.reduce((acc, activity) => {
            const hubProfile = hubProfileMap.get(activity.pid);
            if (!hubProfile) return acc; // Skip unregistered profiles

            const act = {
                type: activity.type,
                timestamp: activity.timestamp,
                user: {
                    username: hubProfile.username,
                    avatarId: hubProfile.avatarId,
                    country: hubProfile.country
                }
            };

            if (showProfileId) {
                act.user.profileId = activity.pid;
            }

            if (showUserId) {
                act.user.userId = hubProfile.userId;
            }

            if (activity.type === "score_improved") {
                act.score = activity.score;
                act.game = resolveGameName(activity.gameVersion, activity.platform);
                act.platform = activity.platform
            } else if (activity.type === "favorite_removed" || activity.type === "favorite_added") {
                // act.mapName = activity.mapName;
            } else if (activity.type === "profile_created") {
                act.platform = activity.platform;
            }

            if (activity.mapName) {
                const song = songDb.find(s => s.mapName == activity.mapName);
                act.song = {
                    id: activity.mapName,
                    title: song?.title,
                    artist: song?.artist,
                    cover: song?.assets?.cover || ""
                };
            };

            acc.push(act);
            return acc;
        }, []);
    };

    /**
     * Fetches active map (song) sessions for a profile from JMCS.
     * When a user starts a song, JMCS records a content-auth request as a
     * map session with startedAt / endsAt timestamps.  Returns the list
     * of sessions (newest first).
     *
     * @param {string} pid — Hub profile UUID
     * @returns {Promise<Array<{ mapName: string, mapLength: number, startedAt: number, endsAt: number }>>}
     */
    /**
     * Computes stats for a single JMCS profile using the same calculation
     * logic as the spotlight leaderboard.
     *
     * @param {Object} profile - JMCS profile object (from getAllProfiles or getProfiles)
     * @returns {Object} { points, reputationScore, version, totalStars, averageScore, songsPlayed, bestScore, unlocks }
     */
    computeProfileStats(profile) {
        const getTotalJdPoints = (jdPoints) => {
            if (!jdPoints) return 0;
            return Object.values(jdPoints).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        };

        const getLatestVersion = (p) => {
            const keys = Object.keys(p.jdPoints || {}).concat(Object.keys(p.stats || {}));
            const years = keys.map(k => {
                const match = k.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            });
            const maxYear = Math.max(...years, 0);
            return maxYear > 0 ? maxYear.toString() : "2022";
        };

        const getTotalStars = (p) => {
            if (!p.scores || Object.keys(p.scores).length === 0) return 0;
            return Object.values(p.scores).reduce((sum, scoreData) => {
                const highest = scoreData.highest || 0;
                return sum + Math.floor(highest / 2000);
            }, 0);
        };

        const getAverageScore = (scores) => {
            if (!scores) return 0;
            const values = Object.values(scores).map(s => s.highest || 0);
            if (values.length === 0) return 0;
            return values.reduce((s, v) => s + v, 0) / values.length / 13333;
        };

        const getBestScore = (scores) => {
            if (!scores) return 0;
            const values = Object.values(scores).map(s => s.highest || 0);
            if (values.length === 0) return 0;
            return Math.max(...values) / 13333;
        };

        const getReputationScore = (p) => {
            const totalJdPoints = getTotalJdPoints(p.jdPoints);
            const totalStars = getTotalStars(p);
            const avgScore = getAverageScore(p.scores);
            const bestScore = getBestScore(p.scores);
            const songsPlayed = p.scores ? Object.keys(p.scores).length : 0;
            const avatars = p.unlockedAvatars ? p.unlockedAvatars.length : 0;
            const skins = p.unlockedSkins ? p.unlockedSkins.length : 0;

            let goldMoves = 0;
            let danceMinutes = 0;
            if (p.stats) {
                Object.values(p.stats).forEach(gameStats => {
                    goldMoves += (gameStats.goldMoves || 0);
                    danceMinutes += Math.floor((gameStats.danceTime || 0) / 60);
                });
            }

            return Math.floor(avgScore * 5000) +
                totalStars * 3 +
                songsPlayed * 10 +
                Math.floor(totalJdPoints / 100) +
                Math.floor(bestScore * 1000) +
                avatars + skins + goldMoves + danceMinutes;
        };

        return {
            points: getTotalJdPoints(profile.jdPoints),
            reputationScore: getReputationScore(profile),
            version: getLatestVersion(profile),
            totalStars: getTotalStars(profile),
            averageScore: getAverageScore(profile.scores),
            songsPlayed: profile.scores ? Object.keys(profile.scores).length : 0,
            bestScore: getBestScore(profile.scores),
            unlocks: (profile.unlockedAvatars?.length ?? 0) + (profile.unlockedSkins?.length ?? 0)
        };
    };

    async getMapSessions(userId) {
        try {
            return await this.request({
                method: "GET",
                route: "/live/v1/map-sessions",
                query: { userId },
            });
        } catch (err) {
            logger.error(`Failed to fetch map sessions for ${userId}: ${err.message}`);
            return { sessions: [] };
        }
    };

    async getProfiles(profileIds = []) {
        try {
            return await this.request({
                method: "POST",
                route: `/backoffice/v1/profiles`,
                data: { profileIds }
            });
        } catch (err) {
            logger.error(`Failed to fetch user profiles for ${userId}: ${err.message}`);
            return [];
        }
    }

    /**
     * Fetches aliases from JMCS.
     * @returns {Promise<Array>}
     */
    async getAliases() {
        try {
            const aliasDb = await this.request({
                method: "GET",
                route: `/aliasdb/v1/aliases`
            });

            const aliases = Object.entries(aliasDb.aliases).map(([aliasId, data]) => ({
                id: aliasId.toString(),
                stringOnlineLocalized: data.StringOnlineLocalized,
                stringOnlineLocalizedFemale: data.StringOnlineLocalizedFemale,
                stringPlaceholder: data.StringPlaceholder,
                difficultyColor: data.DifficultyColor || 0
            }));

            return aliases;
        } catch (err) {
            logger.error(`Failed to fetch aliases: ${err.message}`);
            return [];
        }
    }

    /**
     * Fetches aliases from JMCS and caches them in MongoDB.
     * Uses a stale-while-revalidate pattern (TTL = 1 hour).
     *
     * Cache behaviour:
     *   - MISSING  → fetch from JMCS synchronously (first-time bootstrap), cache & return
     *   - STALE    → return stale data immediately, refresh cache in background
     *   - FRESH    → return instantly
     * @returns {Promise<Array>}
     */
    async getCachedAliases() {
        const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

        const cache = await AliasCache.findOne({ cacheId: 'aliases' });

        if (!cache) {
            const aliases = await this.getAliases();
            await AliasCache.findOneAndUpdate(
                { cacheId: 'aliases' },
                { cacheId: 'aliases', aliases, computedAt: new Date() },
                { upsert: true, new: true }
            );
            return aliases;
        }

        const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > CACHE_TTL_MS;

        if (isStale) {
            this.refreshAliases().catch(err => {
                logger.error(`Background aliases refresh failed: ${err.message}`);
            });
        }

        return cache.aliases;
    };

    /**
     * Refreshes the aliases cache by fetching from JMCS and persisting to MongoDB.
     * Runs in the background when the cache is stale.
     * @returns {Promise<void>}
     */
    async refreshAliases() {
        const aliases = await this.getAliases();
        await AliasCache.findOneAndUpdate(
            { cacheId: 'aliases' },
            { cacheId: 'aliases', aliases, computedAt: new Date() },
            { upsert: true, new: true }
        );
    };
}

module.exports = new JeanMich();