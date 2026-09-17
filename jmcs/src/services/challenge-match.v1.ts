import { Express, NextFunction, Request, Response, Router } from "express";
import winston from "winston";

import { ticketRequired } from "../lib/harbour-ticket-client";
import { skuIdRequired } from "../lib/skus-client";
import challengeMatch from "../lib/challenge-match";
import {
    BAD_REQUEST,
    MATCH_INVALID_STATE,
    MATCH_NOT_FOUND,
    MATCH_NOT_PARTICIPANT,
    MATCH_UNAUTHORIZED_ROUND,
} from "../lib/http-codes";

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /** PUT /matches/:matchType — create a new match */
    publicRouter.put("/matches/:matchType",
        ticketRequired,
        skuIdRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const matchType = req.params.matchType as string;
                if (matchType !== "ranked" && matchType !== "friendly") {
                    return next(BAD_REQUEST);
                }

                const result = await challengeMatch.createNewMatch({
                    pid: req.profileId!,
                    type: matchType,
                    ugcId: req.body.ugcId,
                    opponentPid: req.body.opponentPid,
                    gameVersion: (req.sku as any)?.gameVersion,
                    platform: (req.sku as any)?.platform,
                    availableSongs: (req as any).availableSongs,
                });

                return res.json(result);
            } catch (err) {
                return next(err);
            }
        }
    );

    /** DELETE /matches/:matchId — cancel a match */
    publicRouter.delete("/matches/:matchId",
        ticketRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await challengeMatch.cancelMatch({
                    pid: req.profileId!,
                    matchId: req.params.matchId as string,
                });
                return res.json(result);
            } catch (err: any) {
                if (err.message === "Match not found") return next(MATCH_NOT_FOUND);
                if (err.message?.includes("not a participant")) return next(MATCH_NOT_PARTICIPANT);
                return next(err);
            }
        }
    );

    /** POST /matches/:matchId/start-round — start a new round */
    publicRouter.post("/matches/:matchId/start-round",
        ticketRequired,
        skuIdRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await challengeMatch.startRound({
                    pid: req.profileId!,
                    platform: (req.sku as any)?.platform,
                    matchId: req.params.matchId as string,
                    gameVersion: (req.sku as any)?.gameVersion,
                    availableSongs: (req as any).availableSongs,
                });
                return res.json(result);
            } catch (err: any) {
                if (err.message === "Match not found") return next(MATCH_NOT_FOUND);
                if (err.message?.includes("STATE_INPROGRESS")) return next(MATCH_INVALID_STATE);
                return next(err);
            }
        }
    );

    /** POST /matches/:matchId/finalize-round — finalize a round with score */
    publicRouter.post("/matches/:matchId/finalize-round",
        ticketRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { score, tauntId } = req.body;
                if (score === undefined || tauntId === undefined) {
                    return next(BAD_REQUEST);
                }

                const result = await challengeMatch.finalizeRound({
                    pid: req.profileId!,
                    matchId: req.params.matchId as string,
                    dancerScore: parseInt(score),
                    tauntId: parseInt(tauntId),
                });
                return res.json(result);
            } catch (err: any) {
                if (err.message === "Match not found") return next(MATCH_NOT_FOUND);
                if (err.message === "Unauthorized call to finalize-round") return next(MATCH_UNAUTHORIZED_ROUND);
                return next(err);
            }
        }
    );

    /** GET /challenge-by-map/:mapName — get challenge UGC for a specific map */
    publicRouter.get("/challenge-by-map/:mapName",
        ticketRequired,
        skuIdRequired,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const challengesByMap = await challengeMatch.getChallengesByMapForPid({
                    pid: req.profileId!,
                    gameVersion: (req.sku as any)?.gameVersion,
                });

                const mapName = req.params.mapName as string;
                if (!challengesByMap[mapName]) {
                    return res.json({ ugcId: null });
                }

                const challenges = challengesByMap[mapName];
                return res.json({ ugcId: challenges[0].id.substring(4) });
            } catch (err) {
                return next(err);
            }
        }
    );
};
