import { Express, NextFunction, Request, Response, Router } from "express";
import winston from "winston";

import { ISku } from "../config/skus";

import {
    INTERNAL_SERVER_ERROR,
} from "../lib/http-codes";
import { skuIdRequired } from "../lib/skus-client";
import { ticketRequired } from "../lib/harbour-ticket-client";
import songs from "../lib/songs";
import cache from "../lib/cache";
import cacheKeys from "../lib/cache-keys";
import httpMiddleware from "../lib/http-middleware";

export default (
    app: Express,
    publicRouter: Router,
    privateRouter: Router,
    logger: winston.Logger
) => {

    /**
     * GET /songs
     * Returns the full song database for the platform in the SKU.
     */
    publicRouter.get("/songs", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const sku = req.sku as ISku;
        const jmcsEnv = req.jmcsEnv;

        const { success, requestSpecificMaps, songdbUrl, localisationUrl, localMaps } = await songs.buildSongDbV2({ sku, jmcsEnv, isPatreon: req.isPatreon });

        return res.json({
            requestSpecificMaps,
            songdbUrl,
            localisationUrl,
            localMaps
        });
    });

    /**
     * POST /songs/refresh
     * Triggers a complete rebuild of the databases and stores the S3 paths in cache.
     * Can be used by automation tools or the admin dashboard.
     */
    publicRouter.post("/songs/refresh", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const triggeredBy = req.body.triggeredBy || "System";
        const result = await songs.refreshDatabases(triggeredBy);
        if (!result.success) {
            return next({ ...INTERNAL_SERVER_ERROR, error: result.error, message: result.errorMessage });
        }
        return res.json({ success: true, message: "Databases refreshed successfully." });
    });

    /**
     * GET /songs/status
     * Returns the current database refresh status.
     */
    publicRouter.get("/songs/status", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const dbStatus = await cache.get(cacheKeys.DB_STATUS);
        if (dbStatus.success && dbStatus.value) {
            return res.json({ success: true, status: dbStatus.value });
        }
        return res.json({ success: true, status: null });
    });
};