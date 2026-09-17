import { Express, NextFunction, Request, Response, Router } from "express";
import winston from "winston";

import songs from "../lib/songs";
import {
    INTERNAL_SERVER_ERROR,
    SONG_ALREADY_EXISTS,
    SONG_CANT_BE_DELETED,
    SONG_CANT_BE_UPDATED,
    SONG_NOT_FOUND,
} from "../lib/http-codes";
import { skuIdRequired } from "../lib/skus-client";
import { ticketRequired } from "../lib/harbour-ticket-client";
import httpMiddleware from "../lib/http-middleware";
import infos from "../config/infos";
import customInfos from "../lib/custom-infos";
import { Tag } from "../lib/models/tag";

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
        const platform = req.sku?.platform;
        const jmcsEnv = req.jmcsEnv;

        const { success, songDb, error, errorMessage } = await songs.buildSongDb({ platform, jmcsEnv, isPatreon: req.isPatreon });

        if (!success || !songDb) {
            logger.error({
                message: "Failed to build song DB.",
                details: { platform, errorMessage },
                error,
            });
            return next({ ...INTERNAL_SERVER_ERROR, error });
        }

        // Show custom information entries for certain games in the songDb
        let infosDb = {};

        const infosGameVersions = ["jd2016", "jd2017", "jd2018", "jdcompanion"];
        const showInfoDb = infosGameVersions.includes(req.sku?.gameVersion ?? "");

        if (showInfoDb && req.isGuest) {
            const verificationCode = req.verificationCode;
            infosDb = customInfos.getCustomInfoDb([{
                infoName: "JoinTheHub", infoFormatData: { code: (verificationCode as string) }
            }]);
        };

        const finalDb = {
            ...infosDb,
            ...songDb
        }

        return res.json(finalDb);
    });

    /**
     * GET /songs/backoffice
     * Returns the full song database from the model.
     * Restricted to admins and package managers.
     */
    privateRouter.get("/backoffice", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const { success, songs: songList, error, errorMessage, total } = await songs.getAllSongs({});

        if (!success || !songList) {
            logger.error({
                message: "Failed to get all songs from DB.",
                details: { errorMessage },
                error,
            });
            return next({ ...INTERNAL_SERVER_ERROR, error });
        }

        return res.json({ count: total, songs: songList });
    });

    /**
     * GET /songs/wdf
     * Returns the full song database from the model.
     * Restricted to WDF server.
     */
    privateRouter.get("/wdf", httpMiddleware.isS2s, async (req: Request, res: Response, next: NextFunction) => {
        const { success, songDb } = await songs.getAllSongsForWdf();

        if (!success || !songDb) {
            logger.error({
                message: "Failed to get all songs from DB for WDF.",
            });
            return next({ ...INTERNAL_SERVER_ERROR });
        };

        return res.json(songDb);
    });

    /**
     * GET /songs/tags
     * Returns all tags.
     * Restricted to S2S server.
     */
    publicRouter.get("/tags", httpMiddleware.isAdminOrPackageManager, async (_req: Request, res: Response) => {
        const tags = await Tag.find({});
        return res.json(tags);
    });

    /**
     * POST /songs/tags
     * Creates a new tag.
     * Restricted to admins and package managers.
     */
    privateRouter.post("/tags", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const tagData = req.body;

        try {
            const tag = new Tag(tagData);
            await tag.save();

            logger.info({
                message: "Tag created successfully.",
                details: {
                    tagData,
                    isPackageManager: req.isPackageManager,
                    isAdmin: req.isAdmin
                }
            });

            return res.status(201).json({ success: true, tag });
        } catch (error) {
            logger.error({
                message: "Failed to create tag — DB error.",
                details: { tagData },
                error,
            });
            return next({ ...INTERNAL_SERVER_ERROR, error });
        }
    });

    /**
     * GET /audit
     * Performs a comprehensive audit of all songs in the database.
     * Restricted to administrators.
     */
    privateRouter.get("/audit", httpMiddleware.isAdmin, async (req: Request, res: Response, next: NextFunction) => {
        const result = await songs.auditSongs();

        if (!result.success) {
            return next({ ...INTERNAL_SERVER_ERROR, errorMessage: result.errorMessage });
        }

        return res.json(result);
    });

    /**
     * POST /songs/:mapName
     * Creates a new song entry. Body is used as songDesc.
     */
    privateRouter.post("/songs/:mapName", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;
        const songDesc = req.body as Record<string, unknown>;

        const { success, error, errorMessage } = await songs.newSong(mapName, songDesc);

        if (!success) {
            if (error) {
                logger.error({
                    message: "Failed to create song — DB error.",
                    details: { mapName, errorMessage },
                    error,
                });
                return next({ ...INTERNAL_SERVER_ERROR, error });
            }
            logger.warn({
                message: "Failed to create song — already exists.",
                details: { mapName },
            });
            return next(SONG_ALREADY_EXISTS);
        }

        logger.info({
            message: "Song created successfully.",
            details: {
                mapName,
                isPackageManager: req.isPackageManager,
                isAdmin: req.isAdmin
            }
        });
        return res.status(201).json({ success: true });
    });

    /**
     * GET /songs/:mapName
     * Fetches a single song by its mapName.
     */
    publicRouter.get("/songs/:mapName", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;

        const { success, song, error, errorMessage } = await songs.getSong(mapName);

        if (!success || !song) {
            if (error) {
                logger.error({
                    message: "Failed to fetch song — DB error.",
                    details: { mapName, errorMessage },
                    error,
                });
                return next({ ...INTERNAL_SERVER_ERROR, error });
            }
            logger.warn({
                message: "Failed to fetch song — not found.",
                details: { mapName },
            });
            return next(SONG_NOT_FOUND);
        }

        return res.json(song);
    });

    /**
     * PUT /songs/:mapName
     * Updates an existing song's fields with the request body.
     */
    privateRouter.put("/songs/:mapName", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;
        const songDesc = req.body as Record<string, unknown>;

        const { success, error, errorMessage } = await songs.updateSong(mapName, songDesc);

        if (!success) {
            if (error) {
                logger.error({
                    message: "Failed to update song — DB error.",
                    details: { mapName, errorMessage, fields: Object.keys(songDesc) },
                    error,
                });
                return next({ ...INTERNAL_SERVER_ERROR, error });
            }
            logger.warn({
                message: "Failed to update song — not found.",
                details: { mapName },
            });
            return next(SONG_CANT_BE_UPDATED);
        }

        logger.info({
            message: "Song updated successfully.",
            details: {
                mapName,
                isPackageManager: req.isPackageManager,
                isAdmin: req.isAdmin
            }
        });
        return res.json({ success: true });
    });

    /**
     * DELETE /songs/:mapName
     * Deletes a song by its mapName.
     */
    privateRouter.delete("/songs/:mapName", httpMiddleware.isAdminOrPackageManager, async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;

        const { success, error, errorMessage } = await songs.deleteSong(mapName);

        if (!success) {
            if (error) {
                logger.error({
                    message: "Failed to delete song — DB error.",
                    details: { mapName, errorMessage },
                    error,
                });
                return next({ ...INTERNAL_SERVER_ERROR, error });
            }
            logger.warn({
                message: "Failed to delete song — not found.",
                details: { mapName },
            });
            return next(SONG_CANT_BE_DELETED);
        }

        logger.info({
            message: "Song deleted successfully.",
            details: {
                mapName,
                isPackageManager: req.isPackageManager,
                isAdmin: req.isAdmin
            }
        });
        return res.json({ success: true });
    });
};