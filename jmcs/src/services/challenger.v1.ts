import { Express, NextFunction, Request, Response, Router } from "express";
import winston from "winston";

import { backOfficeTicketRequired, ticketRequired } from "../lib/harbour-ticket-client";
import ProfileModel from "../lib/models/profile";
import TauntModel from "../lib/models/taunt";
import TauntHistoryModel from "../lib/models/taunt-history";
import UgcModel from "../lib/models/ugc";

const TAUNT_HISTORY_LIMIT = 20;

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * GET /players/:pid/scores/:mapName/no-moderation
     *
     * Backoffice only. Returns a player's challenge score for a map (bypassing
     * moderation checks), enriched with light profile + UGC info.
     */
    publicRouter.get(
        "/players/:pid/scores/:mapName/no-moderation",
        backOfficeTicketRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const pid = req.params.pid as string;
                const mapName = req.params.mapName as string;

                const ugc = await UgcModel.findOne({
                    profileId: pid,
                    mapName,
                    type: "ch",
                    deleted: { $ne: 1 },
                }).sort({ score: -1 }).lean();

                if (!ugc) return res.status(404).end();

                const profile = await ProfileModel.findOne({ profileId: pid }).lean();

                return res.json({
                    profileId: pid,
                    mapName,
                    score: ugc.score || 0,
                    ugcId: ugc.ugcId,
                    time: ugc.time,
                    name: (profile as any)?.name,
                    avatar: (profile as any)?.avatar,
                    country: (profile as any)?.country,
                    skin: (profile as any)?.skin,
                    portraitBorder: (profile as any)?.portraitBorder,
                    platformId: (profile as any)?.platformId,
                    jdPoints: (profile as any)?.jdPoints,
                });
            } catch (err) {
                return next(err);
            }
        }
    );

    /**
     * PUT /taunts/:pid
     *
     * Creates (or refreshes) a taunt — i.e. the current player challenges
     * `:pid` with their score on `mapName`. Mirrors the OG `tn/<from>/<to>`
     * doc and updates the per-pair history `th/<min>/<max>`.
     */
    publicRouter.put(
        "/taunts/:pid",
        ticketRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const from = req.profileId as string;
                const to = req.params.pid as string;
                const { mapName, message, victory } = req.body;

                // The challenger must have a dancer card (profile).
                const profile = await ProfileModel.findOne({ profileId: from }).lean();
                if (!profile) return res.status(403).end();

                const now = Math.floor(Date.now() / 1000);

                await TauntModel.updateOne(
                    { from, to },
                    {
                        $set: {
                            from,
                            to,
                            mapName,
                            message: parseInt(message),
                            victory: parseInt(victory),
                            country: (profile as any)?.country,
                            time: now,
                        },
                    },
                    { upsert: true }
                );

                // Update the undirected pair history (most recent first, capped).
                const pair = from < to ? `${from}/${to}` : `${to}/${from}`;
                await TauntHistoryModel.updateOne(
                    { pair },
                    {
                        $push: {
                            maps: { $each: [mapName], $position: 0, $slice: TAUNT_HISTORY_LIMIT },
                        },
                    },
                    { upsert: true }
                );

                return res.status(200).end();
            } catch (err) {
                return next(err);
            }
        }
    );

    /**
     * DELETE /taunts/:pid
     *
     * Removes the taunt sent by `:pid` to the current player.
     */
    publicRouter.delete(
        "/taunts/:pid",
        ticketRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const from = req.params.pid as string;
                const to = req.profileId as string;

                await TauntModel.deleteOne({ from, to });

                return res.status(200).end();
            } catch (err) {
                return next(err);
            }
        }
    );
};
