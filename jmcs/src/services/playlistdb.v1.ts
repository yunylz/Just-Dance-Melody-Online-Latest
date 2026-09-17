import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import { localizationMiddleware } from '../lib/localization-middleware';
import httpMiddleware from '../lib/http-middleware';
import playlistdb from '../lib/playlistdb';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * Public route for game clients to fetch the playlist database.
     * Returns a dynamic list of playlists from MongoDB.
     */
    publicRouter.get("/playlists", ticketRequired, skuIdRequired, localizationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await playlistdb.getPlaylistDb(req);
            res.send({
                __class: "PlaylistDbResponse",
                db
            });
        } catch (err) {
            logger.error("Error in /playlists:", err);
            next(err);
        }
    });

    /**
     * S2S: Create a new playlist entry in JMCS.
     */
    publicRouter.post("/playlists", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await playlistdb.upsertUserPlaylist(req.body.id, req.body);
            res.status(201).send(result);
        } catch (err) {
            logger.error("Error in POST /playlists:", err);
            next(err);
        }
    });

    /**
     * S2S: Update an existing playlist.
     */
    publicRouter.put("/playlists/:playlistId", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        try {
            await playlistdb.upsertUserPlaylist(req.params.playlistId as string, req.body);
            res.sendStatus(200);
        } catch (err) {
            logger.error("Error in PUT /playlists:", err);
            next(err);
        }
    });

    /**
     * S2S: Remove a playlist from the game service.
     */
    publicRouter.delete("/playlists/:playlistId", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        try {
            await playlistdb.deleteUserPlaylist(req.params.playlistId as string);
            res.sendStatus(204);
        } catch (err) {
            logger.error("Error in DELETE /playlists:", err);
            next(err);
        }
    });

    /**
     * S2S: Bulk sync a user's entire collection.
     */
    publicRouter.post("/users/:userId/sync", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        try {
            await playlistdb.syncUserPlaylists(req.params.userId as string, req.body.playlists);
            res.sendStatus(200);
        } catch (err) {
            logger.error("Error in POST /users/:userId/sync:", err);
            next(err);
        }
    });
};