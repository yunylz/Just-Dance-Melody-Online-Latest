import { Express, NextFunction, Request, Response, Router } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import winston from 'winston';
import path from 'node:path';

import { backOfficeTicketRequired, ticketRequired } from '../lib/harbour-ticket-client';
import httpMiddleware from '../lib/http-middleware';
import profile from '../lib/models/profile';
import WdfConfigModel from '../lib/models/wdf-config';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    privateRouter.get("/profiles", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        const skip = parseInt(req.query.skip as string) || 0;
        const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

        const profiles = await profile.find({}, {
            profileId: 1,
            nickname: 1,
            name: 1,
            avatar: 1,
            jdPoints: 1,
            scores: 1,
            stats: 1,
            unlockedAvatars: 1,
            unlockedSkins: 1,
            portraitBorder: 1,
            alias: 1,
            aliasGender: 1,
            country: 1,
            wdfRank: 1,
            _id: 0
        }).sort({ profileId: 1 }).skip(skip).limit(limit).lean();
        
        return res.send(profiles);
    });

    privateRouter.post("/profiles", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        const profileIds = (req.body.profileIds as string[]) || [];
        const profiles = await profile.find({ profileId: { $in: profileIds } }, {
            profileId: 1,
            nickname: 1,
            name: 1,
            avatar: 1,
            jdPoints: 1,
            scores: 1,
            stats: 1,
            unlockedAvatars: 1,
            unlockedSkins: 1,
            portraitBorder: 1,
            alias: 1,
            aliasGender: 1,
            country: 1,
            wdfRank: 1,
            _id: 0
        }).lean();

        return res.send(profiles);
    });

    privateRouter.get("/files/:fileName", ticketRequired, backOfficeTicketRequired, (req: Request, res: Response, next: NextFunction) => {
        const fileName = req.params.fileName as string;

        // Explicitly block path traversal characters to prevent file discovery vulnerabilities
        // Had to do this due to the old JDMO code leading access to dev files.
        // - yunyl
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            logger.warn(`Potential path traversal attempt blocked: ${fileName}`);
            return res.sendStatus(403);
        }

        const contentDir = path.resolve((global as any).root, "content");
        const filePath = path.resolve(contentDir, fileName + ".json");

        if (!filePath.startsWith(contentDir)) {
            logger.warn(`Resolved path outside content directory: ${filePath}`);
            return res.sendStatus(403);
        }

        if (existsSync(filePath)) {
            const data = JSON.parse(readFileSync(filePath, { encoding: 'utf-8' }))
            return res.send(data);
        } else return res.sendStatus(404);
    });

    /**
     * GET /wdf
     *
     * S2S only. Returns all World Dance Floor configs currently stored on JMCS
     * (the ones managed from the dashboard), keyed by their config name.
     * Each value is the raw JSON content of the corresponding WDF data file
     * (config / schedule / rooms / bosses).
     *
     * The WDF server fetches these instead of reading local data files.
     */
    privateRouter.get("/wdf", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const docs = await WdfConfigModel.find({}).lean();
            const out: Record<string, any> = {};
            docs.forEach((d) => {
                out[d.name] = d.data;
            });
            return res.json({ __class: "WdfConfigs", ...out });
        } catch (err) {
            return next(err);
        }
    });
};