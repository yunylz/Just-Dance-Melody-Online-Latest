import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import { ticketRequired } from '../lib/harbour-ticket-client';
import profiles from '../lib/profiles';
import SongModel from '../lib/models/song';
import utils from '../lib/utils';
import {
    PROFILE_NOT_FOUND,
    INVALID_REQUEST,
    INVALID_BODY,
} from '../lib/http-codes';
import httpMiddleware from '../lib/http-middleware';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * POST /profiles
     * Upserts a dancer card (v1 — pre-syncVersions logic).
     * Required fields: name, avatar, country, wdfRank, stars, unlocks, songsPlayed, progression
     */
    publicRouter.post("/profiles", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const body = req.body;

        const required = ["name", "avatar", "country", "wdfRank", "stars", "unlocks", "songsPlayed", "progression"];
        for (const field of required) {
            if (body[field] === undefined || body[field] === null) {
                return next({ ...INVALID_BODY, message: `Missing required field: ${field}` });
            }
        }

        const platform = req.platform || req.sku?.platform || "unknown";
        const language = req.clientCountry || "en";

        try {
            await profiles.upsertProfileV1(pid, body, platform, language);
            return res.sendStatus(200);
        } catch (err) {
            logger.error({ message: "Failed to upsert profile (v1)", details: { pid, err } });
            return next(err);
        }
    });

    /**
     * GET /profiles/:pid
     * Fetches a single dancer card by profileId.
     * Strips platform and scores from the response.
     */
    publicRouter.get("/profiles/:pid", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.params.pid as string;
        const jmcsEnv = req.jmcsEnv;

        try {
            const profile = await profiles.getProfile(pid);

            if (!profile) {
                return next(PROFILE_NOT_FOUND);
            }

            // Match original: strip platform and scores from public profile view
            delete profile.scores;

            // Filter favorites/history based on env
            if (jmcsEnv) {
                const envFilter = utils.getJmcsEnvSongFilter(jmcsEnv);
                const patreonFilter = utils.getPatreonSongFilter(req.isPatreon);
                const combinedFilter = { ...envFilter, ...patreonFilter };
                const allowedSongs = await SongModel.find(combinedFilter, { mapName: 1 }).lean();
                const allowedMapNames = new Set(allowedSongs.map((s: any) => s.mapName));

                if (Array.isArray(profile.favorites)) {
                    profile.favorites = profile.favorites.filter((m: string) => allowedMapNames.has(m));
                }

                if (profile.history && typeof profile.history === "object") {
                    const filtered: Record<string, any> = {};
                    for (const mapName of Object.keys(profile.history)) {
                        if (allowedMapNames.has(mapName)) {
                            filtered[mapName] = profile.history[mapName];
                        }
                    }
                    profile.history = filtered;
                }
            }

            return res.json(profile);
        } catch (err) {
            logger.error({ message: "Failed to fetch profile (v1)", details: { pid, err } });
            return next(err);
        }
    });

    /**
     * GET /profiles?profileIds=pid1,pid2,...
     * Fetches multiple dancer cards, up to 100.
     * Strips platform, playedMaps, and scores from responses.
     */
    publicRouter.get("/profiles", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const rawIds = req.query.profileIds as string;
        const jmcsEnv = req.jmcsEnv;

        if (!rawIds) return res.json([]);
        if (rawIds.length === 0) return res.json([]);

        const pids = rawIds.split(",").slice(0, 100).filter(Boolean);
        if (pids.length === 0) return res.json([]);

        try {
            // Fetch allowed map names based on env and patreon
            const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
            const patreonFilter = utils.getPatreonSongFilter(req.isPatreon);
            const combinedFilter = { ...envFilter, ...patreonFilter };
            const allowedSongs = await SongModel.find(combinedFilter, { mapName: 1 }).lean();
            const allowedMapNames = new Set(allowedSongs.map((s: any) => s.mapName));

            const profileMap = await profiles.getProfiles(pids);

            const result = pids
                .map(pid => {
                    const p = profileMap[pid];
                    if (!p) return null;
                    p.profileId = pid;
                    delete p.playedMaps;
                    delete p.scores;

                    // Filter favorites — only include allowed map names
                    if (Array.isArray(p.favorites)) {
                        p.favorites = p.favorites.filter((m: string) => allowedMapNames.has(m));
                    }

                    // Filter history — only include allowed map names
                    if (p.history && typeof p.history === "object") {
                        const filtered: Record<string, any> = {};
                        for (const mapName of Object.keys(p.history)) {
                            if (allowedMapNames.has(mapName)) {
                                filtered[mapName] = p.history[mapName];
                            }
                        }
                        p.history = filtered;
                    }

                    return p;
                })
                .filter(Boolean);

            return res.json(result);
        } catch (err) {
            logger.error({ message: "Failed to fetch profiles (v1)", details: { pids, err } });
            return next(err);
        }
    });

    /**
     * POST /filter-players
     * Accepts an array of profileIds and returns only the ones that exist in DB.
     * Limited to 1000 entries.
     */
    publicRouter.post("/filter-players", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        if (!Array.isArray(req.body)) {
            return next({ ...INVALID_BODY, message: "Body must be an array of profile IDs." });
        }

        const pids: string[] = req.body.slice(0, 1000);

        try {
            const existing = await profiles.filterExistingProfiles(pids);
            return res.json(existing);
        } catch (err) {
            logger.error({ message: "Failed to filter players (v1)", details: { err } });
            return next(err);
        }
    });

    /**
     * GET /names/:name
     * Searches for profiles by name. Returns a map of profileId -> profile.
     */
    privateRouter.get("/names/:name", async (req: Request, res: Response, next: NextFunction) => {
        const name = req.params.name as string;

        try {
            const results = await profiles.searchProfilesByName(name);
            return res.json(results);
        } catch (err) {
            logger.error({ message: "Failed to search profiles by name (v1)", details: { name, err } });
            return next(err);
        }
    });

    /**
     * GET /challenges/:mapName
     * Returns the ugcId stored in a profile's score entry for a given map.
     */
    publicRouter.get("/challenges/:mapName", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            const ugcId = await profiles.getChallengeUgcId(pid, mapName);

            if (ugcId === null) {
                return next(PROFILE_NOT_FOUND);
            }

            return res.json({ ugcId });
        } catch (err) {
            logger.error({ message: "Failed to get challenge ugcId (v1)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * PUT /favorites/maps/:mapName
     * Adds a map to the authenticated user's favorites.
     */
    publicRouter.put("/favorites/maps/:mapName", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            await profiles.addFavorite(pid, mapName);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to add favorite (v1)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * DELETE /favorites/maps/:mapName
     * Removes a map from the authenticated user's favorites.
     */
    publicRouter.delete("/favorites/maps/:mapName", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            await profiles.removeFavorite(pid, mapName);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to remove favorite (v1)", details: { pid, mapName, err } });
            return next(err);
        }
    });
};
