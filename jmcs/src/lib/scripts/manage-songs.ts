import { Request, Response, NextFunction } from "express";
import songsLib from "../songs";
import { runMigration } from "../migrate/songdb";
import { INTERNAL_SERVER_ERROR, SONG_ALREADY_EXISTS, SONG_NOT_FOUND } from "../http-codes";
import { createLogger } from "../logger";

const logger = createLogger({ service: "manage-songs" });

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 0; // 0 = all
        const search = req.query.search as string;
        const mapName = req.query.mapName as string;
        const tag = req.query.tag as string;
        const status = req.query.status as string;
        const patreon = req.query.patreon as string;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (tag) {
            filter.tags = tag;
        }
        if (mapName) {
            filter.mapName = mapName;
        } else if (search) {
            const searchNum = Number(search);
            filter.$or = [
                { mapName: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
                { artist: { $regex: search, $options: "i" } },
                ...(isNaN(searchNum) ? [] : [{ originalJDVersion: searchNum }]),
            ];
        }
        if (status === "published") {
            filter.releaseDate = { $ne: "" };
        } else if (status === "unpublished") {
            filter.$or = [
                { releaseDate: { $exists: false } },
                { releaseDate: "" }
            ];
        }
        if (patreon === "true") {
            filter.isPatreon = true;
        } else if (patreon === "false") {
            filter.isPatreon = { $ne: true };
        }

        const { success, songs, total, error, errorMessage } = await songsLib.getAllSongs(filter, { 
            skip: limit > 0 ? skip : undefined, 
            limit: limit > 0 ? limit : undefined 
        });

        if (!success) {
            return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || INTERNAL_SERVER_ERROR.message });
        }
        return res.json({ success: true, items: songs, total, page, limit });
    },

    get: async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.id as string;
        const { success, song, error, errorMessage } = await songsLib.getSong(mapName);

        if (!success || !song) {
            if (error) return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to fetch song" });
            return next(SONG_NOT_FOUND);
        }

        return res.json({ success: true, song });
    },

    create: async (req: Request, res: Response, next: NextFunction) => {
        const { mapName, ...songDesc } = req.body;
        if (!mapName) {
            return res.status(400).json({ success: false, message: "mapName is required" });
        }
        
        const { success, error, errorMessage } = await songsLib.newSong(mapName, songDesc);
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to create song" });
            }
            return next(SONG_ALREADY_EXISTS);
        }
        return res.status(201).json({ success: true });
    },

    update: async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.id as string;
        const songDesc = req.body;
        const { success, error, errorMessage } = await songsLib.updateSong(mapName, songDesc);
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to update song" });
            }
            return next(SONG_NOT_FOUND);
        }
        return res.json({ success: true });
    },

    delete: async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.id as string;
        const { success, error, errorMessage } = await songsLib.deleteSong(mapName);
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to delete song" });
            }
            return next(SONG_NOT_FOUND);
        }
        return res.json({ success: true });
    },

    /**
     * POST /scripts/manage-songs/bulk
     *
     * Body: { action: "publish"|"unpublish"|"set-patreon", mapNames: string[], value?: any }
     */
    bulk: async (req: Request, res: Response, next: NextFunction) => {
        const { action, mapNames, value } = req.body;
        if (!action || !mapNames || !Array.isArray(mapNames) || mapNames.length === 0) {
            return res.status(400).json({ success: false, message: "action and mapNames[] are required" });
        }
        const { success, error, errorMessage } = await songsLib.bulkAction(action, mapNames, value);
        if (!success) {
            return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Bulk action failed" });
        }
        return res.json({ success: true });
    },

    /**
     * POST /scripts/manage-songs/bulk-by-filter
     *
     * Applies the action to ALL songs matching the given filter criteria.
     * Body: { action, value?, search?, tag?, status?, patreon? }
     *
     * This avoids sending hundreds of mapNames when selecting all matching songs.
     */
    "bulk-by-filter": async (req: Request, res: Response, next: NextFunction) => {
        const { action, value, search, tag, status, patreon } = req.body;
        if (!action) {
            return res.status(400).json({ success: false, message: "action is required" });
        }

        const filter: any = {};
        if (tag) {
            filter.tags = tag;
        }
        if (search) {
            const searchNum = Number(search);
            filter.$or = [
                { mapName: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
                { artist: { $regex: search, $options: "i" } },
                ...(isNaN(searchNum) ? [] : [{ originalJDVersion: searchNum }]),
            ];
        }
        if (status === "published") {
            filter.releaseDate = { $ne: "" };
        } else if (status === "unpublished") {
            filter.$or = [
                { releaseDate: { $exists: false } },
                { releaseDate: "" }
            ];
        }
        if (patreon === "true") {
            filter.isPatreon = true;
        } else if (patreon === "false") {
            filter.isPatreon = { $ne: true };
        }

        const { success, count, error, errorMessage } = await songsLib.bulkActionByFilter(action, filter, value);
        if (!success) {
            return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Bulk action failed" });
        }
        return res.json({ success: true, count });
    },

    /**
     * POST /admin/songs/migrate
     *
     * Streams migration progress via Server-Sent Events.
     * Each SSE `data` payload is one of:
     *   { mapName, action: "imported"|"updated"|"error", error? }
     *   { summary: { imported, updated, skipped, errors } }   ← final event
     *
     * The frontend should open an EventSource to this endpoint and close it
     * when a `summary` event is received.
     */
    migrate: async (req: Request, res: Response, _next: NextFunction) => {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

        try {
            for await (const event of runMigration()) {
                send(event);
                if ("summary" in event) break;
            }
        } catch (err: any) {
            logger.error({ message: "Migration SSE failed", error: err?.message });
            send({ error: err?.message ?? "Migration failed unexpectedly" });
        } finally {
            res.end();
        }
    }
};
