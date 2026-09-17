import { createLogger } from "./logger";
import { Request } from "express";
import PlayLogModel from "./models/tracking";
import ScoreModel from "./models/score";
import SongModel from "./models/song";
import PlaylistModel from "./models/playlist";
import UserPlaylistModel from "./models/user-playlist";
import recommendation from "./recommendation";

const logger = createLogger({ service: "playlistdb-lib" });

class PlaylistDb {
    constructor() { }

    /**
     * Formats a playlist object for the game client.
     * Includes localization and cover URL selection.
     */
    private formatPlaylist(req: Request, playlist: any) {
        const language = (req as any).language || "en";
        const getLocalisation = (req as any).getLocalisation;

        const result: any = {
            "__class": "PlaylistDbService::Playlist",
            "title": (getLocalisation ? getLocalisation(playlist.titleId) : null) || this.getAutomatedTitle(playlist.playlistId),
            "description": (getLocalisation ? getLocalisation(playlist.descriptionId) : null) || this.getAutomatedDescription(playlist.playlistId),
            "maps": [...(playlist.maps || [])],
            "fixedMapOrder": !!playlist.fixedMapOrder,
            "fallback": !!playlist.fallback,
            "pinned": !!playlist.pinned,
            "filters": true // Standard for these playlists
        };

        // Handle cover URL selection (Language-specific covers)
        if (playlist.covers) {
            const covers = playlist.covers instanceof Map ? Object.fromEntries(playlist.covers) : playlist.covers;
            result.coverURL = covers[language] || covers[playlist.defaultLanguage || "en"] || Object.values(covers)[0] || "";
        }

        // Include recommendation metadata if applicable
        if (playlist.colors) {
            result.colors = playlist.colors;
        }

        if (playlist.type === "recommended") {
            result.type = "recommended";
        }

        return result;
    }

    /**
     * Formats a user-generated playlist for the game client.
     */
    private formatUserPlaylist(userPlaylist: any) {
        return {
            "__class": "PlaylistDbService::Playlist",
            "title": userPlaylist.title,
            "description": userPlaylist.description || "",
            "maps": userPlaylist.songs.map((s: any) => s.mapName),
            // Use the first song's cover as the playlist cover
            "coverURL": userPlaylist.songs[0]?.coverUrl || "",
            "fixedMapOrder": true,
            "fallback": false,
            "pinned": false,
            "filters": true
        };
    }

    private getAutomatedTitle(playlistId: string) {
        if (playlistId.startsWith("reco-top_country-")) return "Top Played in your country";
        switch (playlistId) {
            case "reco-top_played": return "Top Played Worldwide";
            case "reco-top_replayed": return "Top Replayed";
            case "reco-for_you": return "For You";
            case "reco-discover": return "Discover";
            case "reco-top_country": return "Top Played in your country";
            default: return `Playlist_${playlistId}`;
        }
    }

    private getAutomatedDescription(playlistId: string) {
        switch (playlistId) {
            case "reco-top_played": return "The most popular songs of Just Dance Melody Online";
            case "reco-top_replayed": return "The songs players keep coming back to";
            case "reco-for_you": return "Hand-picked for your dance style";
            case "reco-discover": return "Songs you haven't tried yet";
            default: return "";
        }
    }

    /**
     * Gets all playlists for a user, formatted and localized.
     */
    async getPlaylistDb(req: Request) {
        const pid = (req as any).profileId;
        const country = (req as any).clientCountry || "UBI";

        try {
            // Fetch all playlists from MongoDB
            const playlists = await PlaylistModel.find({}).lean();

            const db: Record<string, any> = {};
            for (const playlist of playlists) {
                // Handle Country Playlists
                if (playlist.playlistId.startsWith("reco-top_country-")) {
                    if (playlist.playlistId === `reco-top_country-${country}`) {
                        db["reco-top_country"] = this.formatPlaylist(req, playlist);
                    }
                    continue;
                }

                db[playlist.playlistId] = this.formatPlaylist(req, playlist);
            }

            // Handle Personalized Playlists
            if (pid) {
                const forYou = await this.generateForYouPlaylist(req, pid);
                if (forYou) db["reco-for_you"] = forYou;

                const discover = await this.generateDiscoverPlaylist(req, pid);
                if (discover) db["reco-discover"] = discover;

                // Include User's Synced Playlists
                const userPlaylists = await UserPlaylistModel.find({ ownerId: pid }).lean();
                for (const up of userPlaylists) {
                    db[`user-${up.id}`] = this.formatUserPlaylist(up);
                }
            }

            return db;
        } catch (err) {
            logger.error("Error fetching playlist database:", err);
            throw err;
        }
    }

    /**
     * Generates a "For You" playlist based on user's recent plays.
     */
    private async generateForYouPlaylist(req: Request, pid: string) {
        try {
            const recentPlays = await PlayLogModel.find({ pid }).sort({ timestamp: -1 }).limit(5).lean();
            const lastMaps = recentPlays.map(p => p.mapName);

            let recommendations: any[] = [];
            if (lastMaps.length > 0) {
                const relatedMapping = await recommendation.getRelatedSongsMapping();
                
                // Get related songs for each recently played map
                const relatedPool = new Set<string>();
                for (const mapName of lastMaps) {
                    if (relatedMapping[mapName]) {
                        relatedMapping[mapName].forEach((related: string) => relatedPool.add(related));
                    }
                }
                
                // Remove songs they already played recently
                lastMaps.forEach(m => relatedPool.delete(m));
                
                // Convert to array and shuffle
                const poolArr = Array.from(relatedPool);
                for (let i = poolArr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [poolArr[i], poolArr[j]] = [poolArr[j], poolArr[i]];
                }
                
                // Take up to 10
                recommendations = poolArr.slice(0, 10).map(mapName => ({ mapName }));
            }

            // Fallback to random songs if no specific recommendations found
            if (recommendations.length < 5) {
                const randomSongs = await SongModel.aggregate([
                    { $match: { mapName: { $nin: lastMaps } } },
                    { $sample: { size: 10 } }
                ]);
                recommendations = [...recommendations, ...randomSongs].slice(0, 10);
            }

            return this.formatPlaylist(req, {
                playlistId: "reco-for_you",
                titleId: 15010, // Ensure these are seeded or have fallbacks
                descriptionId: 15011,
                maps: Array.from(new Set(recommendations.map(s => s.mapName))),
                type: "recommended",
                colors: { base_color: "FF4582FF", grad_color: "FFA100FF" }
            });
        } catch (err) {
            logger.error("Error generating For You playlist:", err);
            return null;
        }
    }

    /**
     * Generates a "Discover" playlist with songs the user has never played.
     */
    private async generateDiscoverPlaylist(req: Request, pid: string) {
        try {
            const playedScores = await ScoreModel.find({ profileId: pid }, { mapName: 1 }).lean();
            const playedMaps = playedScores.map(s => s.mapName);

            // Use MongoDB $sample for better randomization across the entire song collection
            const discovery = await SongModel.aggregate([
                { $match: { mapName: { $nin: playedMaps } } },
                { $sample: { size: 10 } }
            ]);

            return this.formatPlaylist(req, {
                playlistId: "reco-discover",
                titleId: 15012,
                descriptionId: 15013,
                maps: discovery.map(s => s.mapName),
                type: "recommended",
                colors: { base_color: "5FB61EFF", grad_color: "17CDBAFF" }
            });
        } catch (err) {
            logger.error("Error generating Discover playlist:", err);
            return null;
        }
    }

    /**
     * Dashboard management: Get all raw playlists.
     */
    async getAllRawPlaylists() {
        return PlaylistModel.find({}).lean();
    }

    /**
     * Dashboard management: Create or update a playlist.
     */
    async upsertPlaylist(playlistId: string, data: any) {
        return PlaylistModel.findOneAndUpdate(
            { playlistId },
            { ...data, playlistId },
            { upsert: true, new: true }
        );
    }

    /**
     * Dashboard management: Delete a playlist.
     */
    async deletePlaylist(playlistId: string) {
        return PlaylistModel.deleteOne({ playlistId });
    }

    /**
     * S2S management: Create or update a user playlist.
     */
    async upsertUserPlaylist(id: string, data: any) {
        return UserPlaylistModel.findOneAndUpdate(
            { id },
            { ...data, id },
            { upsert: true, new: true }
        );
    }

    /**
     * S2S management: Delete a user playlist.
     */
    async deleteUserPlaylist(id: string) {
        return UserPlaylistModel.deleteOne({ id });
    }

    /**
     * S2S management: Bulk sync user playlists.
     */
    async syncUserPlaylists(ownerId: string, playlists: any[]) {
        // Delete existing playlists for this user that are not in the sync list
        const incomingIds = playlists.map(p => p.id);
        await UserPlaylistModel.deleteMany({ ownerId, id: { $nin: incomingIds } });

        // Upsert all incoming playlists
        const ops = playlists.map(p => ({
            updateOne: {
                filter: { id: p.id },
                update: { ...p, ownerId },
                upsert: true
            }
        }));

        if (ops.length > 0) {
            await UserPlaylistModel.bulkWrite(ops);
        }
    }
}

export default new PlaylistDb();
