import { Request, Response, NextFunction } from "express";
import playlistdb from "../playlistdb";
import { INTERNAL_SERVER_ERROR, PLAYLIST_CANT_BE_UPDATED } from "../http-codes";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const playlists = await playlistdb.getAllRawPlaylists();
            return res.json({ success: true, items: playlists });
        } catch (err) {
            return next({ ...INTERNAL_SERVER_ERROR, error: err });
        }
    },
    upsert: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const playlist = await playlistdb.upsertPlaylist(id as string, req.body);
            return res.json({ success: true, item: playlist });
        } catch (err) {
            return next({ ...PLAYLIST_CANT_BE_UPDATED, error: err });
        }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await playlistdb.deletePlaylist(id as string);
            return res.json({ success: true });
        } catch (err) {
            return next({ ...INTERNAL_SERVER_ERROR, error: err });
        }
    }
};
