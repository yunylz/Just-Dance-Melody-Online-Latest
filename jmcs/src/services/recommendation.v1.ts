import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import recommendation from '../lib/recommendation';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * Get related songs JSON URL.
     * Returns a signed S3 URL to a JSON file containing map relationships.
     */
    publicRouter.get("/related-songs", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await recommendation.getRelatedSongs();
            res.json({
                "__class": "RelatedSongs",
                ...data
            });
        } catch (err) {
            logger.error("Error in /related-songs:", err);
            next(err);
        }
    });

    /**
     * Get song relevance recommendations.
     */
    publicRouter.get("/song-relevance", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await recommendation.getOrderedSongs(req.jmcsEnv, req.isPatreon);
            res.json({
                "__class": "RecommendedSongs",
                ...data
            });
        } catch (err) {
            logger.error("Error in /song-relevance:", err);
            next(err);
        }
    });

    /**
     * Get quickplay recommendations.
     */
    publicRouter.get("/quickplay", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await recommendation.getOrderedSongs(req.jmcsEnv, req.isPatreon);
            res.json({
                "__class": "RecommendedSongs",
                ...data
            });
        } catch (err) {
            logger.error("Error in /quickplay:", err);
            next(err);
        }
    });

    /**
     * Get songs sorted by relevance.
     */
    publicRouter.get("/relevance-sorting", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            // We don't want pertinance sorting <3
            return res.status(500).send();
        } catch (err) {
            logger.error("Error in /relevance-sorting:", err);
            next(err);
        }
    });
};