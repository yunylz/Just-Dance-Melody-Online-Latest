import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import tracking from '../lib/tracking';
import httpMiddleware from '../lib/http-middleware';
import { ActivityType } from '../lib/models/activity';
import MapSessionModel from '../lib/models/map-session';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * POST /activities/playlogs
     *
     * Returns recent play log entries.
     * Only works with S2s for Hub.
     */
    publicRouter.post(
        '/activities/playlogs',
        httpMiddleware.isS2s,
        async (req: Request, res: Response, next: NextFunction) => {
            const profileIds: string[] | undefined = Array.isArray(req.body) && req.body.length > 0
                ? req.body
                : undefined;

            const count = req.isS2s ? undefined : parseInt(req.query.count as string ?? '20');
            const skip = parseInt(req.query.skip as string ?? '0');

            const playlogs = await tracking.getPlaylogs({ profileIds, limit: count, skip });

            return res.send({ playlogs });
        }
    );

    /**
     * POST /activities/feed
     *
     * Returns the activity feed (favorite_added, favorite_removed, score_improved, profile_created).
     * - Body: string[] of profileIds to filter by (empty = global, for admin)
     * - Query: ?count=50, ?skip=0, ?types=favorite_added,score_improved (comma-separated)
     * Only accessible via S2S (Hub API).
     */
    publicRouter.post(
        '/activities/feed',
        httpMiddleware.isS2s,
        async (req: Request, res: Response, next: NextFunction) => {
            const profileIds: string[] | undefined = Array.isArray(req.body) && req.body.length > 0
                ? req.body
                : undefined;

            const count = parseInt(req.query.count as string ?? '50');
            const skip  = parseInt(req.query.skip  as string ?? '0');
            const typesRaw = req.query.types as string | undefined;
            const types: ActivityType[] | undefined = typesRaw
                ? (typesRaw.split(',').filter(Boolean) as ActivityType[])
                : undefined;

            const activities = await tracking.getActivities({ profileIds, types, limit: count, skip });

            return res.send({ activities });
        }
    );

    /**
     * GET /map-sessions
     *
     * Returns map sessions filtered by pid or userId (or both) via query params.
     * Only accessible via S2S (Hub API).
     */
    publicRouter.get(
        '/map-sessions',
        httpMiddleware.isS2s,
        async (req: Request, res: Response, next: NextFunction) => {
            const filter: Record<string, any> = {};

            if (req.query.pid) {
                filter.pid = req.query.pid;
            }
            if (req.query.userId) {
                filter.userId = req.query.userId;
            }

            const sessions = await MapSessionModel.find(filter).lean();

            return res.send({ sessions });
        }
    );

};