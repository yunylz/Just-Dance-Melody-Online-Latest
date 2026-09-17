import { Express, NextFunction, Request, Response, Router } from 'express';
import { Logger } from 'winston';
import homeLib from '../lib/home';
import HomeTileModel from '../lib/models/home-tile';
import HomeCorrectionModel from '../lib/models/home-correction';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import localizationMiddleware from '../lib/localization-middleware';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: Logger) => {
    // Public routes for the game client
    publicRouter.post("/tiles", ticketRequired, skuIdRequired, localizationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await homeLib.getUpdatedHomeTiles(req);
            return res.json(data);
        } catch (err) {
            logger.error(`Error in /tiles: ${err}`);
            return next(err);
        }
    });

    // Backoffice routes (privateRouter)
    privateRouter.get("/manual-content", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tiles = await HomeTileModel.find().sort({ activationTime: -1 });
            return res.json(tiles);
        } catch (err) {
            return next(err);
        }
    });

    privateRouter.post("/manual-content", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tile = new HomeTileModel(req.body);
            await tile.save();
            return res.status(201).json(tile);
        } catch (err) {
            return next(err);
        }
    });

    privateRouter.put("/manual-content/:uuid", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tile = await HomeTileModel.findOneAndUpdate(
                { uuid: req.params.uuid },
                { $set: req.body },
                { new: true }
            );
            if (!tile) return res.sendStatus(404);
            return res.json(tile);
        } catch (err) {
            return next(err);
        }
    });

    privateRouter.delete("/manual-content/:uuid", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await HomeTileModel.deleteOne({ uuid: req.params.uuid });
            if (result.deletedCount === 0) return res.sendStatus(404);
            return res.sendStatus(204);
        } catch (err) {
            return next(err);
        }
    });

    // Manual content correction routes
    privateRouter.get("/manual-content-correction", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const corrections = await HomeCorrectionModel.find();
            return res.json(corrections);
        } catch (err) {
            return next(err);
        }
    });

    privateRouter.put("/manual-content-correction/:uuid", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const correction = await HomeCorrectionModel.findOneAndUpdate(
                { uuid: req.params.uuid },
                { $set: { correction: req.body, uuid: req.params.uuid } },
                { upsert: true, new: true }
            );
            return res.json(correction);
        } catch (err) {
            return next(err);
        }
    });

    privateRouter.delete("/manual-content-correction/:uuid", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await HomeCorrectionModel.deleteOne({ uuid: req.params.uuid });
            if (result.deletedCount === 0) return res.sendStatus(404);
            return res.sendStatus(204);
        } catch (err) {
            return next(err);
        }
    });
};