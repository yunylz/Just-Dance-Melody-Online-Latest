import { Request, Response, NextFunction } from "express";

import QuestModel from "../models/quest";
import { createLogger } from "../logger";

const logger = createLogger({ service: "manage-quests" });

const getActor = (req: Request): string =>
    (req as any).profileId || (req as any).userId || "admin";

export default {
    /** GET /admin/v1/scripts/manage-quests/list — list all quests, sorted by id */
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const quests = await QuestModel.find({}).sort({ id: 1 }).lean();
            return res.json({ success: true, items: quests });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-quests/get/:id — fetch a single quest */
    get: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const quest = await QuestModel.findOne({ id: req.params.id }).lean();
            if (!quest) {
                return res.status(404).json({ success: false, message: `Quest "${req.params.id}" not found` });
            }
            return res.json({ success: true, item: quest });
        } catch (err) {
            return next(err);
        }
    },

    /** POST /admin/v1/scripts/manage-quests/create — create a new quest (id must be unique) */
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, title } = req.body || {};
            if (!id || !title) {
                return res.status(400).json({ success: false, message: "id and title are required" });
            }

            const exists = await QuestModel.findOne({ id });
            if (exists) {
                return res.status(409).json({ success: false, message: `Quest "${id}" already exists` });
            }

            const quest = await QuestModel.create({
                id,
                title,
                locked: req.body.locked ?? 0,
                playlist: req.body.playlist ?? [],
                assetUrls: req.body.assetUrls ?? {},
                updatedAt: Date.now(),
                updatedBy: getActor(req),
            });

            logger.info(`Created quest "${id}"`);
            return res.json({ success: true, item: quest });
        } catch (err) {
            return next(err);
        }
    },

    /** POST /admin/v1/scripts/manage-quests/update/:id — upsert a quest by id */
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const body = req.body || {};

            const quest = await QuestModel.findOneAndUpdate(
                { id },
                {
                    $set: {
                        id,
                        title: body.title ?? "",
                        locked: body.locked ?? 0,
                        playlist: body.playlist ?? [],
                        assetUrls: body.assetUrls ?? {},
                        updatedAt: Date.now(),
                        updatedBy: getActor(req),
                    },
                },
                { upsert: true, new: true }
            );

            logger.info(`Updated quest "${id}"`);
            return res.json({ success: true, item: quest });
        } catch (err) {
            return next(err);
        }
    },

    /** DELETE /admin/v1/scripts/manage-quests/delete/:id — delete a quest */
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            await QuestModel.deleteOne({ id: req.params.id });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },
};
