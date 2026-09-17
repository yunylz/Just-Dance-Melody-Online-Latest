import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import { INTERNAL_SERVER_ERROR } from '../lib/http-codes';
import constantProvider from '../lib/constant-provider';
import httpMiddleware from '../lib/http-middleware';

/**
 * Constant Provider (v1)
 */
export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * GET /sku-constants
     * Returns the game constants for the platform in the SKU.
     */
    publicRouter.get("/sku-constants", async (req: Request, res: Response) => {
        const { constants } = await constantProvider.getConstants();
        return res.json(constants);
    });

    /**
     * POST /sku-constants
     * Sets the game constants for the platform in the SKU.
     */
    publicRouter.post("/sku-constants", httpMiddleware.isAdmin, async (req: Request, res: Response, next: NextFunction) => {
        const constants = req.body as Record<string, any>;
        const { success, error } = await constantProvider.setConstants(constants);

        if (!success) {
            return next(INTERNAL_SERVER_ERROR);
        };

        return res.json({ success: true });
    });
}