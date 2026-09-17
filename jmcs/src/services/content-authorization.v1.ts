import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import contentAuthLib from "../lib/content-auth";
import httpMiddleware from '../lib/http-middleware';
import { CONTENT_AUTH_NOT_FOUND } from '../lib/http-codes';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import * as webhook from '../lib/webhook';
import MapSessionModel from "../lib/models/map-session";

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/maps/:mapName", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;
        const jmcsEnv = req.jmcsEnv;

        const contentAuth = await contentAuthLib.getMapContentAuth(mapName, jmcsEnv, req.isPatreon);
        if (!contentAuth) {
            logger.warn({
                message: "Map content auth not found!",
                details: {
                    mapName, userId: req.userId
                }
            });
            webhook.ticket({
                title: "🔍 Unauthorized Content Auth Access",
                ip: req.ip as string,
                originalUrl: req.originalUrl as string,
                message: `Content auth for \`${mapName}\` not found or not accessible (env: \`${jmcsEnv}\`)`,
                userId: req.userId,
                profileId: req.profileId
            });
            return next(CONTENT_AUTH_NOT_FOUND);
        };

        const { urls, mapLength } = contentAuth;

        // Track map session start
        const now = Math.floor(Date.now() / 1000);

        await MapSessionModel.create({
            pid: req.profileId,
            userId: req.userId,
            mapName,
            mapLength,
            startedAt: now,
            endsAt: now + mapLength
        }).catch((err) => {
            logger.error({
                message: "Failed to track map session",
                error: err,
                details: { mapName, profileId: req.profileId }
            });
        });

        logger.info({
            message: "Content authorized",
            details: {
                mapName: mapName,
                pid: req.profileId,
                userId: req.userId
            }
        });

        return res.json({
            __class: "ContentAuthorizationEntry",
            duration: 300,
            changelist: 0,
            urls: urls
        });
    });

    // publicRouter.post("/maps/:mapName", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
    //     const mapName = req.params.mapName as string;
    //     const { urls } = req.body as { urls: Record<string, string> };

    //     const result = await contentAuthLib.upsertContentAuth(mapName, urls);

    //     return res.json({
    //         mapName: result.mapName,
    //         urls: result.urls
    //     });
    // });
};