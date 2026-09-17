
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger';
import ProfileModel from '../models/profile';

const logger = createLogger({ service: "algo-recommendations" });

let recommendations: Record<string, string[]> = {};

// TODO: Load automatic-recommendations.json from S3 or local file
// For now, it's an empty object

export const getRecommendations = (lastMapPlayed: string): string[] => {
    return recommendations[lastMapPlayed] || [];
};

export const savePlayerLastMapPlayed = async (req: Request, res: Response, next: NextFunction) => {
    const pid = (req as any).ticket?.pid || (req as any).profileId;
    if (!pid || !req.body || !req.body.lastMapPlayed) return next();

    try {
        const profile = await ProfileModel.findOne({ profileId: pid });
        if (profile) {
            // Update lastMapPlayed in history or stats
            // In og-jmcs it was saved in a separate Couchbase bucket "history"
            // Here we can save it in the profile document
            if (req.body && req.body.lastMapPlayed) {
                (profile as any).lastMapPlayed = req.body.lastMapPlayed;
                await profile.save();
            }
        }
    } catch (err) {
        logger.error(`Error saving last map played for ${pid}: ${err}`);
    }
    return next();
};

export const getPlayerLastMapPlayed = async (req: Request, res: Response, next: NextFunction) => {
    const pid = (req as any).ticket?.pid || (req as any).profileId;
    if (!pid) return next();

    try {
        const profile = await ProfileModel.findOne({ profileId: pid }).lean();
        if (profile && (profile as any).lastMapPlayed) {
            req.body.lastMapPlayed = (profile as any).lastMapPlayed;
        }
    } catch (err) {
        logger.error(`Error getting last map played for ${pid}: ${err}`);
    }
    return next();
};

export default {
    get: getRecommendations,
    savePlayerLastMapPlayed,
    getPlayerLastMapPlayed
};
