import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import profiles from '../lib/profiles';
import SongModel from '../lib/models/song';
import utils from '../lib/utils';
import {
    PROFILE_NOT_FOUND,
    INVALID_REQUEST,
    INVALID_BODY,
    GUEST_NOT_ALLOWED,
} from '../lib/http-codes';
import { ISku } from '../config/skus';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * GET /country
     * Returns the detected country of the client from GeoIP or Cloudflare.
     */
    publicRouter.get("/country", ticketRequired, skuIdRequired, (req: Request, res: Response) => {
        return res.json({ country: req.clientCountry || "UBI" });
    });

    /**
     * POST /profiles
     * Upserts a dancer card (v2 — versioned jdPoints/stats, score merging).
     * Required fields: name, avatar, country, wdfRank, stars, unlocks, songsPlayed, progression
     */
    publicRouter.post("/profiles", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const sku = req.sku as ISku;
        const body = req.body;
        const language = req.clientCountry || "en";

        try {
            await profiles.upsertProfileV2(pid, body, sku, language, req.isGuest);
            return res.end();
        } catch (err) {
            logger.error({ message: "Failed to upsert profile (v2)", details: { pid, err } });
            return next(err);
        }
    });

    /**
     * GET /profiles?profileIds=pid1,pid2,...
     * Fetches multiple dancer cards (v2 — filters versioned jdPoints/stats by gameVersion).
     * Returns isExisting:false entries for missing profiles.
     */
    publicRouter.get("/profiles", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const rawIds = req.query.profileIds as string;
        const sku = req.sku as ISku;
        const gameVersion = sku.gameVersion;
        const jmcsEnv = req.jmcsEnv;

        if (!rawIds || rawIds.length === 0) return res.json([]);

        const pids = rawIds.split(",").slice(0, 100).filter(Boolean);
        if (pids.length === 0) return res.json([]);

        try {
            // Fetch allowed map names based on env (prod → published, dev → unpublished)
            const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
            const patreonFilter = utils.getPatreonSongFilter(req.isPatreon);
            const combinedFilter = { ...envFilter, ...patreonFilter };
            const allowedSongs = await SongModel.find(combinedFilter, { mapName: 1 }).lean();
            const allowedMapNames = new Set(allowedSongs.map((s: any) => s.mapName));

            const profileMap = await profiles.getProfiles(pids);

            const result = pids.map(pid => {
                const p = profileMap[pid];

                if (!p) {
                    return { profileId: pid, isExisting: false };
                }

                p.profileId = pid;
                delete p.platform;
                delete p.playedMaps;

                // Resolve versioned jdPoints to the current gameVersion's value
                if (p.jdPoints && typeof p.jdPoints === "object") {
                    p.jdPoints = p.jdPoints[gameVersion] ?? undefined;
                }

                // Resolve versioned stats to the current gameVersion's value
                if (p.stats && typeof p.stats === "object") {
                    p.stats = p.stats[gameVersion] || {};
                }

                // Filter scores — only include allowed map names
                if (p.scores && typeof p.scores === "object") {
                    const filtered: Record<string, any> = {};
                    for (const mapName of Object.keys(p.scores)) {
                        if (!allowedMapNames.has(mapName)) continue;
                        const entry = p.scores[mapName];
                        if (entry && !entry.hasOwnProperty("isCoopHighscore")) {
                            entry.isCoopHighscore = false;
                        }
                        filtered[mapName] = entry;
                    }
                    p.scores = filtered;
                }

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
            });

            return res.json(result);
        } catch (err) {
            logger.error({ message: "Failed to fetch profiles (v2)", details: { pids, err } });
            return next(err);
        }
    });

    /**
     * POST /filter-players
     * Accepts an array of profileIds and returns only the ones that exist in DB.
     * Limited to 1000 entries.
     */
    publicRouter.post("/filter-players", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        if (!Array.isArray(req.body)) {
            return next({ ...INVALID_BODY, message: "Body must be an array of profile IDs." });
        }

        const pids: string[] = req.body.slice(0, 1000);

        try {
            const existing = await profiles.filterExistingProfiles(pids);
            return res.json(existing);
        } catch (err) {
            logger.error({ message: "Failed to filter players (v2)", details: { err } });
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
            logger.error({ message: "Failed to search profiles by name (v2)", details: { name, err } });
            return next(err);
        }
    });

    /**
     * GET /challenges/:mapName
     * Returns the ugcId stored in a profile's score entry for a given map.
     */
    publicRouter.get("/challenges/:mapName", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            const ugcId = await profiles.getChallengeUgcId(pid, mapName);

            if (ugcId === null) {
                return next(PROFILE_NOT_FOUND);
            }

            return res.json({ ugcId });
        } catch (err) {
            logger.error({ message: "Failed to get challenge ugcId (v2)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * PUT /favorites/maps/:mapName
     * Adds a map to the authenticated user's favorites (v2 — propagates to all linked profiles).
     */
    publicRouter.put("/favorites/maps/:mapName", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            await profiles.addFavorite(pid, mapName);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to add favorite (v2)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * DELETE /favorites/maps/:mapName
     * Removes a map from favorites and also clears the map from history (v2 behavior).
     */
    publicRouter.delete("/favorites/maps/:mapName", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;

        try {
            await profiles.removeFavorite(pid, mapName);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to remove favorite (v2)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * PUT /scores/maps/:mapName
     * Updates the highscore for a specific map on the authenticated user's profile.
     * Body: { score: number, isCoopHighscore?: boolean }
     */
    publicRouter.put("/scores/maps/:mapName", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const mapName = req.params.mapName as string;
        const sku = req.sku as ISku;
        const { score, isCoopHighscore } = req.body;

        // Block guests from submitting scores
        if (req.isGuest) {
            return next(GUEST_NOT_ALLOWED);
        }

        if (typeof score !== "number") {
            return next({ ...INVALID_BODY, message: "Missing or invalid required field: score" });
        }

        try {
            await profiles.updateScore(pid, mapName, score, sku, isCoopHighscore ?? false);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to update score (v2)", details: { pid, mapName, err } });
            return next(err);
        }
    });

    /**
     * POST /map-ended
     * Appends map history entries (CLASSIC/KIDS) and trims to MAX_HISTORY_SIZE.
     * Body: Array<{ mapName, timestamp, score, gameMode, nbPlayers?, ... }>
     */
    publicRouter.post("/map-ended", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const entries = req.body;
        const sku = req.sku as ISku;

        // Block guests from pushing map-ended
        if (req.isGuest) {
            return next(GUEST_NOT_ALLOWED)
        };

        if (!Array.isArray(entries)) {
            return next({ ...INVALID_BODY, message: "Body must be an array of map history entries." });
        };

        try {
            await profiles.updateMapHistory(pid, entries, sku);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to update map history (v2)", details: { pid, err } });
            return next(err);
        }
    });

    /**
     * PUT /alias/:aliasId
     * Grants an alias to the authenticated user's profile.
     * (Admin route in original; kept on privateRouter)
     */
    privateRouter.put("/alias/:aliasId", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const aliasId = parseInt(req.params.aliasId as string, 10);

        if (isNaN(aliasId)) {
            return next({ ...INVALID_REQUEST, message: "aliasId must be a number." });
        }

        try {
            await profiles.unlockAlias(pid, aliasId);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to unlock alias (v2)", details: { pid, aliasId, err } });
            return next(err);
        }
    });

    /**
     * DELETE /alias/:aliasId
     * Removes an alias from the authenticated user's profile.
     * (Admin route in original; kept on privateRouter)
     */
    privateRouter.delete("/alias/:aliasId", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const pid = req.profileId as string;
        const aliasId = parseInt(req.params.aliasId as string, 10);

        if (isNaN(aliasId)) {
            return next({ ...INVALID_REQUEST, message: "aliasId must be a number." });
        }

        try {
            await profiles.removeAlias(pid, aliasId);
            return res.end();
        } catch (err: any) {
            logger.error({ message: "Failed to remove alias (v2)", details: { pid, aliasId, err } });
            return next(err);
        }
    });
};