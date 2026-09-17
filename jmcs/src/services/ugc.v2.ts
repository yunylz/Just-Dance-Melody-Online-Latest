import { Express, NextFunction, Request, Response, Router } from "express";
import winston from "winston";
import { v4 as uuidv4 } from "uuid";

import { ISku } from "../config/skus";
import constants from "../config/constants";

import {
    UGC_INVALID_TYPE,
    UGC_MISSING_FIELDS,
    UGC_INVALID_CONTENT,
    UGC_NOT_FOUND,
    UGC_ALREADY_DELETED,
    UGC_NOT_OWNER,
    UGC_PROFILE_REQUIRED,
    UGC_CONFIRMATION_NOT_PENDING,
    UGC_ALREADY_LIKED,
    UGC_NOT_LIKED,
    PROFILE_NOT_FOUND,
} from "../lib/http-codes";
import { ticketRequired } from "../lib/harbour-ticket-client";
import { skuIdRequired } from "../lib/skus-client";
import UgcModel from "../lib/models/ugc";
import ProfileModel from "../lib/models/profile";
import { getRedisClient } from "../lib/clients/redis";
import ugcClient from "../lib/ugc-client";
import ugcS3 from "../lib/ugc-s3";

const MINIMUM_NON_VIDEO_SCORE = 2000;

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    // ─── Create UGC ───────────────────────────────────────────────────────────
    publicRouter.post("/ugcs", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { mapName, type, content, coach, device, score, moves, contest, sequence } = req.body;
            const sku = req.sku as ISku;

            const validTypes = ["ad", "st", "dm", "ch", "cr"];
            if (!validTypes.includes(type)) return next(UGC_INVALID_TYPE);

            switch (type) {
                case "ad":
                case "st":
                case "dm":
                    if (!content || typeof content !== "object") return next(UGC_MISSING_FIELDS);
                    break;
                case "ch":
                    if (coach === undefined || device === undefined || score === undefined) return next(UGC_MISSING_FIELDS);
                    break;
                case "cr":
                    if (!content || typeof content !== "object" || contest === undefined || sequence === undefined) return next(UGC_MISSING_FIELDS);
                    break;
            }

            if (content && typeof content === "object") {
                for (const fileName of Object.keys(content)) {
                    if (!content[fileName]?.mimetype) return next(UGC_INVALID_CONTENT);
                }
            }

            const ugcId = uuidv4();
            const now = Math.floor(Date.now() / 1000);

            const doc: Record<string, any> = {
                ugcId, type, mapName,
                profileId: req.profileId,
                gameVersion: sku.gameVersion,
                platform: sku.platform,
                time: now,
            };

            if (content) doc.content = content;
            if (moves && type === "ch") doc.moves = Buffer.from(moves, "base64").toString("base64");
            if (coach !== undefined && type === "ch") doc.coach = coach;
            if (device !== undefined && type === "ch") doc.device = device;
            if (score !== undefined && type === "ch") doc.score = score;
            if (contest !== undefined && type === "cr") doc.contest = contest;
            if (sequence !== undefined && type === "cr") doc.sequence = sequence;

            const result: Record<string, any> = { ugcId, content: {} };

            if (type === "ch") {
                doc.random = Math.random();

                const profile = await ProfileModel.findOne({ profileId: req.profileId }).lean();
                if (!profile) return next(UGC_PROFILE_REQUIRED);
                doc.country = profile.country;

                const challengeSkipDocument = !content && sku.gameVersion === "jd2016" && (score || 0) < MINIMUM_NON_VIDEO_SCORE;
                const scores = (profile as any).scores || {};
                let challengeNotHighestScore = false;
                let previousChallengeDocId: string | null = null;

                if (!scores[mapName]) {
                    scores[mapName] = { highest: score };
                } else if ((score || 0) > (scores[mapName].highest || 0)) {
                    scores[mapName].highest = score;
                } else {
                    challengeNotHighestScore = true;
                }

                if (!challengeSkipDocument && !content) {
                    if (scores[mapName].ugcId) previousChallengeDocId = scores[mapName].ugcId;
                    scores[mapName].ugcId = ugcId;
                }

                await ProfileModel.updateOne({ profileId: req.profileId }, { $set: { scores } });

                if (!challengeSkipDocument && previousChallengeDocId) {
                    const prevDoc = await UgcModel.findOne({ ugcId: previousChallengeDocId }).lean();
                    if (prevDoc?.content) {
                        await UgcModel.updateOne({ ugcId: previousChallengeDocId }, { $set: { deleted: 1 } });
                    }
                }

                if (challengeSkipDocument || (!content && challengeNotHighestScore && sku.gameVersion === "jd2016")) {
                    return res.end();
                }

                if (!content) doc.approved = 1;
            }

            if (type === "cr") {
                const profile = await ProfileModel.findOne({ profileId: req.profileId }).lean();
                if (!profile) return next(UGC_PROFILE_REQUIRED);
                doc.name = profile.name;
                doc.avatar = profile.avatar;
                doc.country = profile.country;
            }

            if (content) {
                doc.pendingConfirmation = true;
                doc.pendingExpiry = new Date(Date.now() + constants.UGC.PENDING_CONFIRMATION_DURATION * 1000);
            } else {
                doc.approved = 1;
            }

            if (content) {
                for (const fileName of Object.keys(content)) {
                    const url = await ugcS3.getSignedUploadUrl(ugcS3.buildKey(ugcId, fileName), content[fileName].mimetype);
                    result.content[fileName] = { url, mimetype: content[fileName].mimetype };
                }
            }

            await UgcModel.create(doc);
            logger.info({ message: `UGC ${ugcId} (${type}) created`, details: { ugcId, type, mapName, profileId: req.profileId } });
            return res.status(201).json(result);
        } catch (err) {
            logger.error({ message: "Failed to create UGC", error: err });
            return next(err);
        }
    });

    // ─── Confirm UGC (after content upload) ───────────────────────────────────
    publicRouter.post("/ugcs/:ugcId/confirmation", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;

            const ugc = await UgcModel.findOne({ ugcId }).lean();
            if (!ugc) return next(UGC_NOT_FOUND);
            if (!ugc.pendingConfirmation) return next(UGC_CONFIRMATION_NOT_PENDING);

            await UgcModel.updateOne(
                { ugcId },
                { $set: { pendingConfirmation: false }, $unset: { pendingExpiry: "" } }
            );

            if (ugc.type === "ch") {
                const profile = await ProfileModel.findOne({ profileId: ugc.profileId }).lean();
                if (profile) {
                    const existingScores = ((profile as any).scores as Record<string, any>) || {};
                    const scores = { ...existingScores };
                    let previousChallengeDocId: string | null = null;

                    if (scores[ugc.mapName as string]?.ugcId && scores[ugc.mapName as string].ugcId !== ugcId) {
                        previousChallengeDocId = scores[ugc.mapName as string].ugcId;
                    }
                    scores[ugc.mapName as string] = { ...(scores[ugc.mapName as string] || {}), ugcId };
                    await ProfileModel.updateOne({ profileId: ugc.profileId }, { $set: { scores } });

                    if (previousChallengeDocId) {
                        try {
                            await UgcModel.updateOne({ ugcId: previousChallengeDocId }, { $set: { deleted: 1 } });
                        } catch { /* ignore */ }
                    }
                }
            }

            return res.end();
        } catch (err) {
            logger.error({ message: "Failed to confirm UGC", error: err });
            return next(err);
        }
    });

    // ─── Get single UGC ──────────────────────────────────────────────────────
    publicRouter.get("/ugcs/:ugcId", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;

            const data = await UgcModel.findOne({ ugcId }).lean();
            if (!data) return next(UGC_NOT_FOUND);
            if (data.deleted) return next(UGC_ALREADY_DELETED);

            const doc = ugcClient.formatUgc(data, ugcId);
            doc.__class = "UGCEntry";
            delete doc.random;
            delete doc._id;

            if (!doc.approved && req.profileId !== doc.profileId) {
                delete doc.content;
            }

            const profile = await ProfileModel.findOne({ profileId: doc.profileId }).lean();
            if (!profile) return next(PROFILE_NOT_FOUND);

            switch (doc.type) {
                case "ad":
                case "st":
                case "dm":
                    doc.name = profile.name;
                    doc.avatar = profile.avatar;
                    doc.country = profile.country;
                    if (profile.portraitBorder) doc.portraitBorder = profile.portraitBorder;
                    break;
                case "ch":
                    doc.name = profile.name;
                    doc.avatar = profile.avatar;
                    break;
            }

            const redis = getRedisClient();
            doc.like = await redis.sIsMember(`ul:${ugcId}`, req.profileId || "");

            return res.json(doc);
        } catch (err) {
            return next(err);
        }
    });

    // ─── Delete UGC ──────────────────────────────────────────────────────────
    publicRouter.delete("/ugcs/:ugcId", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;

            const ugc = await UgcModel.findOne({ ugcId }).lean();
            if (!ugc) return next(UGC_NOT_FOUND);
            if (ugc.deleted) return next(UGC_ALREADY_DELETED);
            if (ugc.profileId !== req.profileId) return next(UGC_NOT_OWNER);

            await UgcModel.updateOne({ ugcId }, { $set: { deleted: 1 } });

            if (ugc.type === "ch") {
                const profile = await ProfileModel.findOne({ profileId: ugc.profileId }).lean();
                if (profile) {
                    const existingScores = ((profile as any).scores as Record<string, any>) || {};
                    const scores = { ...existingScores };
                    if (scores[ugc.mapName as string]?.ugcId === ugcId) {
                        delete scores[ugc.mapName as string].ugcId;
                        await ProfileModel.updateOne({ profileId: ugc.profileId }, { $set: { scores } });
                    }
                }
            }

            return res.end();
        } catch (err) {
            return next(err);
        }
    });

    // ─── Like UGC ────────────────────────────────────────────────────────────
    publicRouter.put("/ugcs/:ugcId/like", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;
            const redis = getRedisClient();
            const likesKey = `ul:${ugcId}`;

            const added = await redis.sAdd(likesKey, req.profileId || "");
            if (added !== 1) return next(UGC_ALREADY_LIKED);

            const likeCount = await redis.sCard(likesKey);
            await UgcModel.updateOne({ ugcId }, { $set: { likes: parseInt(likeCount.toString()) } });
            return res.end();
        } catch (err) {
            if ((err as any)?.code === "keyNotFound") return next(UGC_NOT_FOUND);
            return next(err);
        }
    });

    // ─── Unlike UGC ──────────────────────────────────────────────────────────
    publicRouter.delete("/ugcs/:ugcId/like", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;
            const redis = getRedisClient();
            const likesKey = `ul:${ugcId}`;

            const removed = await redis.sRem(likesKey, req.profileId || "");
            if (removed !== 1) return next(UGC_NOT_LIKED);

            const likeCount = await redis.sCard(likesKey);
            await UgcModel.updateOne({ ugcId }, { $set: { likes: parseInt(likeCount.toString()) } });
            return res.end();
        } catch (err) {
            if ((err as any)?.code === "keyNotFound") return next(UGC_NOT_FOUND);
            return next(err);
        }
    });

    // ─── Report UGC ──────────────────────────────────────────────────────────
    publicRouter.post("/ugcs/:ugcId/reports", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;

            await ugcClient.updateUgc(ugcId, (doc, callback) => {
                doc.reports = (doc.reports || 0) + 1;
                callback();
            });

            return res.status(201).end();
        } catch (err) {
            if ((err as any)?.code === "keyNotFound") return next(UGC_NOT_FOUND);
            return next(err);
        }
    });

    // ─── View UGC ────────────────────────────────────────────────────────────
    publicRouter.post("/ugcs/:ugcId/views", ticketRequired, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.ugcId as string;

            await ugcClient.updateUgc(ugcId, (doc, callback) => {
                doc.views = (doc.views || 0) + 1;
                callback();
            });

            return res.status(201).end();
        } catch (err) {
            if ((err as any)?.code === "keyNotFound") return next(UGC_NOT_FOUND);
            return next(err);
        }
    });
};
