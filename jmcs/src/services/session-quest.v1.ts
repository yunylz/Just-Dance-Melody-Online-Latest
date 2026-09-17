import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';

/**
 * This is an example service that you can use as a starting point for your own services.
 */

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    publicRouter.get("/", ticketRequired, skuIdRequired, (req: Request, res: Response, next: NextFunction) => {
        return res.json({
            __class: "SessionQuestService::QuestData",
            newReleases: ["IWasMadeQUATSWT"]
        })
    });
};