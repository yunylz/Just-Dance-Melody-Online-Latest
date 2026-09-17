import PlayLogModel from "./models/tracking";
import ActivityLogModel, { ActivityType, IActivityLog } from "./models/activity";
import ScoreModel from "./models/score";
import { createLogger } from "./logger";
import utils from "./utils";

const logger = createLogger({ service: "tracking-lib" });

export interface PlayContext {
    isWdf?: boolean;
    isCoop?: boolean;
    isKids?: boolean;
    isPlaylist?: boolean;
    isSweatEnabled?: boolean;
    isJduEnabled?: boolean;
}

class Tracking {
    constructor() { }

    /**
     * Records a map completion event.
     * Detects if it's a replay by checking if a score already existed for the player.
     * @param pid Player ID
     * @param mapName The name of the map completed
     * @param country The country of the player (from profile or geoip)
     * @param context Optional score context flags
     */
    async recordPlay(pid: string, mapName: string, country: string | number, context?: PlayContext) {
        try {
            let countryCode = String(country);
            const countryId = typeof country === 'number' ? country : parseInt(country);
            if (!isNaN(countryId)) {
                const countryObj = utils.getCountryById(countryId);
                if (countryObj) {
                    countryCode = countryObj.code;
                }
            }
            country = countryCode;

            // Check for replay: did the user already have a score for this map?
            const existingScore = await ScoreModel.findOne({ profileId: pid, mapName }).lean();
            const isReplay = !!existingScore;

            await PlayLogModel.create({
                pid,
                mapName,
                country,
                isReplay,
                timestamp: new Date(),
                ...(context ?? {}),
            });

            logger.info(`Recorded play for ${pid}: ${mapName} (Replay: ${isReplay}, Country: ${country})`);
        } catch (err) {
            logger.error(`Failed to record play for ${pid}:`, err);
        }
    }

    /**
     * Records a discrete player activity event (fire-and-forget).
     * Used for the friend/admin activity feed.
     */
    async recordActivity(data: {
        pid: string;
        type: ActivityType;
        mapName?: string;
        score?: number;
        platform?: string;
        gameVersion?: string;
        country?: string;
    }): Promise<void> {
        try {
            await ActivityLogModel.create({
                ...data,
                timestamp: new Date(),
            });
        } catch (err) {
            logger.error(`Failed to record activity for ${data.pid} (${data.type}):`, err);
        }
    }

    /**
     * Returns recent activity log entries, optionally filtered by player IDs and/or event types.
     * Results are ordered by most recent first.
     */
    async getActivities({ profileIds, types, limit, skip = 0 }: {
        profileIds?: string[];
        types?: ActivityType[];
        limit?: number;
        skip?: number;
    }): Promise<IActivityLog[]> {
        const query: Record<string, any> = {};
        if (profileIds?.length) query.pid = { $in: profileIds };
        if (types?.length)      query.type = { $in: types };

        let q = ActivityLogModel.find(query).sort({ timestamp: -1 }).skip(skip);
        if (limit !== undefined) q = q.limit(limit) as typeof q;

        return q.lean() as unknown as IActivityLog[];
    }

    /**
     * Aggregates global top played maps in the last X days.
     */
    async getGlobalTopPlayed(limit: number = 10, days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const aggregation = await PlayLogModel.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: "$mapName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);

        return aggregation.map(a => a._id);
    }

    /**
     * Aggregates top replayed maps globally.
     */
    async getTopReplayed(limit: number = 10, days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const aggregation = await PlayLogModel.aggregate([
            { $match: { timestamp: { $gte: since }, isReplay: true } },
            { $group: { _id: "$mapName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);

        return aggregation.map(a => a._id);
    }

    /**
     * Aggregates top played maps by country.
     */
    async getCountryTopPlayed(country: string, limit: number = 10, days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const aggregation = await PlayLogModel.aggregate([
            { $match: { timestamp: { $gte: since }, country } },
            { $group: { _id: "$mapName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);

        return aggregation.map(a => a._id);
    }

    async getPlayCount() {
        return await PlayLogModel.countDocuments();
    };

    /**
     * Returns recent play log entries, optionally filtered by player IDs.
     * @param profileIds Optional array of player IDs to filter by
     * @param limit Max number of entries to return (undefined = all)
     * @param skip Number of entries to skip for pagination
     */
    async getPlaylogs({ profileIds, limit, skip = 0 }: {
        profileIds?: string[],
        limit?: number,
        skip?: number
    }) {
        const query: Record<string, any> = {};
        if (profileIds?.length) query.pid = { $in: profileIds };

        let q = PlayLogModel.find(query).sort({ timestamp: -1 }).skip(skip);
        if (limit !== undefined) q = q.limit(limit);

        return q.lean();
    };
}

export default new Tracking();
