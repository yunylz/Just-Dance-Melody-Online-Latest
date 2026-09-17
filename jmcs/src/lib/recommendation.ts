import SongModel from "./models/song";
import s3 from "./s3";
import cache from "./cache";
import { createLogger } from "./logger";
import PlaylistModel from "./models/playlist";
import tracking from "./tracking";
import PlayLogModel from "./models/tracking";
import utils from "./utils";

const logger = createLogger({ service: "recommendation-lib" });

class Recommendation {
    private refreshInterval: number = 7 * 24 * 60 * 60 * 1000; // 7 days
    private playlistRefreshInterval: number = 1 * 60 * 60 * 1000; // 1 hour

    constructor() { }

    /**
     * Initializes the recommendation service and starts background workers.
     */
    init() {
        logger.info("Initializing Recommendation Service background workers...");
        this.startBackgroundRefresh();
    }

    private async startBackgroundRefresh() {
        // Run once on startup (with check)
        try {
            await this.refreshIfNeeded();
        } catch (err) {
            logger.error("Initial related songs refresh check failed:", err);
        }

        // Then run periodically (every 7 days)
        setInterval(async () => {
            try {
                logger.info("Starting background refresh of related songs...");
                await this.refreshRelatedSongs();
            } catch (err) {
                logger.error("Background related songs refresh failed:", err);
            }
        }, this.refreshInterval);

        // Refresh automated playlists every hour
        setInterval(async () => {
            try {
                await this.refreshAutomatedPlaylists();
            } catch (err) {
                logger.error("Background automated playlists refresh failed:", err);
            }
        }, this.playlistRefreshInterval);
        
        // Run once on startup
        this.refreshAutomatedPlaylists().catch(e => logger.error("Initial automated playlists refresh failed:", e));
    }

    /**
     * Checks if a refresh is needed based on the last update timestamp.
     */
    private async refreshIfNeeded() {
        const { success, value: lastUpdate } = await cache.get("reco:last-refresh-time");
        const now = Date.now();

        if (success && lastUpdate && (now - lastUpdate < this.refreshInterval)) {
            const daysLeft = ((this.refreshInterval - (now - lastUpdate)) / (1000 * 60 * 60 * 24)).toFixed(2);
            logger.info(`Related songs refresh skipped. Last update was ${new Date(lastUpdate).toISOString()}. Next refresh in ${daysLeft} days.`);
            return;
        }

        logger.info("Related songs refresh needed (more than 7 days since last update or never updated).");
        await this.refreshRelatedSongs();
    }

    /**
     * Forces a refresh of the related songs mapping and uploads to S3.
     */
    async refreshRelatedSongs() {
        // Background refresh only builds the prod variant (published songs only)
        const envFilter = utils.getJmcsEnvSongFilter("prod");
        const songs = await SongModel.find(envFilter, { mapName: 1, originalJDVersion: 1, coachCount: 1 }).lean();
        const relatedMapping: Record<string, string[]> = {};

        for (const song of songs) {
            let candidates = songs.filter(s => s.mapName !== song.mapName);
            let matchedCandidates = candidates.filter(s => 
                s.originalJDVersion === song.originalJDVersion || 
                s.coachCount === song.coachCount
            );

            let pool = matchedCandidates.length > 0 ? matchedCandidates : candidates;
            
            // Shuffle pool
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            relatedMapping[song.mapName] = pool.slice(0, 10).map(s => s.mapName);
        }

        const path = await s3.assertRelatedSongs(relatedMapping);
        await cache.set("reco:related-songs-path", path);
        await cache.set("reco:related-songs-mapping", JSON.stringify(relatedMapping));
        await cache.set("reco:last-refresh-time", Date.now()); // Update last refresh time
        logger.info(`Related songs mapping refreshed and uploaded to: ${path}`);
        return path;
    }

    /**
     * Retrieves the related songs mapping from cache.
     */
    async getRelatedSongsMapping(): Promise<Record<string, string[]>> {
        const cached = await cache.get("reco:related-songs-mapping");
        if (cached && cached.success && cached.value) {
            try {
                return JSON.parse(cached.value);
            } catch (e) {
                return {};
            }
        }
        return {};
    }

    /**
     * Get a list of songs ordered by relevance.
     */
    async getOrderedSongs(jmcsEnv?: string, isPatreon?: boolean) {
        try {
            const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
            const patreonFilter = utils.getPatreonSongFilter(isPatreon);
            const combinedFilter = { ...envFilter, ...patreonFilter };
            const songs = await SongModel.find(combinedFilter, { mapName: 1 }).lean();
            const mapNames = songs.map(s => s.mapName);
            
            for (let i = mapNames.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mapNames[i], mapNames[j]] = [mapNames[j], mapNames[i]];
            }

            return {
                orderedMaps: mapNames
            };
        } catch (err) {
            logger.error("Error getting ordered songs:", err);
            return { orderedMaps: [] };
        }
    }

    /**
     * Get related songs JSON URL with a fresh signature.
     */
    async getRelatedSongs() {
        try {
            const cachedPath = await cache.get("reco:related-songs-path");
            let path = cachedPath ? cachedPath.value : null;

            if (!path) {
                logger.warn("Related songs path not found in cache, generating synchronously...");
                path = await this.refreshRelatedSongs();
            }

            // Always generate a fresh signed URL so it never expires for the client
            const signedUrl = s3.getSignedDownloadUrl(path, 3600); 
            return { relatedSongs: signedUrl };
        } catch (err) {
            logger.error("Error getting related songs URL:", err);
            throw err;
        }
    }

    /**
     * Updates automated playlists (top played, top replayed, etc.) based on tracking data.
     */
    async refreshAutomatedPlaylists() {
        try {
            logger.info("Refreshing automated playlists...");

            // 1. Top Played Worldwide
            const topPlayed = await tracking.getGlobalTopPlayed(10);
            if (topPlayed.length > 0) {
                await PlaylistModel.updateOne(
                    { playlistId: "reco-top_played" },
                    { 
                        $set: { 
                            maps: topPlayed, 
                            type: "recommended",
                            titleId: 15004,
                            descriptionId: 15005
                        } 
                    },
                    { upsert: true }
                );
            }

            // 2. Top Replayed
            const topReplayed = await tracking.getTopReplayed(10);
            if (topReplayed.length > 0) {
                await PlaylistModel.updateOne(
                    { playlistId: "reco-top_replayed" },
                    { 
                        $set: { 
                            maps: topReplayed, 
                            type: "recommended",
                            titleId: 15008,
                            descriptionId: 15009
                        } 
                    },
                    { upsert: true }
                );
            }

            // 3. Top Country Playlists (Cached per country)
            const countries = await PlayLogModel.distinct("country");
            for (const country of countries) {
                const countryTop = await tracking.getCountryTopPlayed(country, 10);
                if (countryTop.length > 0) {
                    await PlaylistModel.updateOne(
                        { playlistId: `reco-top_country-${country}` },
                        { 
                            $set: { 
                                maps: countryTop, 
                                type: "recommended",
                                titleId: 15006,
                                descriptionId: 15007
                            } 
                        },
                        { upsert: true }
                    );
                }
            }

            logger.info("Automated playlists refreshed.");
        } catch (err) {
            logger.error("Failed to refresh automated playlists:", err);
        }
    }
}

export default new Recommendation();
