import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';

import QuestModel from '../lib/models/quest';

/**
 * Serves the online quest database from MongoDB.
 *
 * Quests are managed via the `manage-quests` script + the dashboard, and can be
 * seeded from `src/config/quest-data/quests.json` with:
 *   npx tsx tests/load-quests.ts
 */
export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    publicRouter.get("/quests", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const quests = await QuestModel.find({}).sort({ id: 1 }).lean();

            res.send({
                "__class": "OnlineQuestDb",
                "quests": quests.map((q) => ({
                    "__class": "OnlineQuest",
                    "assetUrls": q.assetUrls || {},
                    "id": q.id,
                    "locked": q.locked ?? 0,
                    "playlist": q.playlist || [],
                    "title": q.title,
                })),
            });
        } catch (err) {
            next(err);
        }
    });
};