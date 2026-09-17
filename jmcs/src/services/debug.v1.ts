import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import skus from '../lib/skus';
import utils from '../lib/utils';
import { FORBIDDEN } from '../lib/http-codes';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    // Only allow this route in dev environments
    const isDev = utils.isDev();
    if (!isDev) {
        publicRouter.use((req: Request, res: Response, next: NextFunction) => {
            return next(FORBIDDEN);
        });
        privateRouter.use((req: Request, res: Response, next: NextFunction) => {
            return next(FORBIDDEN);
        });
    };

    /**
     * GET /skus
     * Returns the full SKU database.
     */
    privateRouter.get("/skus", async (req: Request, res: Response, next: NextFunction) => {
        const allSkus = skus.info;

        return res.send({
            skus: allSkus
        });
    });

};