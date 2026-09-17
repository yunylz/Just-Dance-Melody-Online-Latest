import { Request, Response, NextFunction } from "express";

import WdfConfigModel from "../models/wdf-config";
import skus from "../skus";
import { createLogger } from "../logger";

const logger = createLogger({ service: "manage-wdf" });

const WDF_NAMES = ["config", "schedule", "rooms", "bosses"] as const;

export default {
    /**
     * GET /admin/v1/scripts/manage-wdf/skus
     *
     * Returns the valid SKU ids (from skus.ts) so the dashboard can present a
     * picker for the rooms' `skus` field.
     */
    skus: async (_req: Request, res: Response, next: NextFunction) => {
        try {
            return res.json({
                success: true,
                ids: skus.getAllSkuIds(),
                info: skus.info,
            });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-wdf/list — list all WDF config docs (metadata only) */
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const docs = await WdfConfigModel.find({}).lean();
            return res.json({
                success: true,
                items: docs.map((d) => ({
                    name: d.name,
                    updatedAt: d.updatedAt,
                    updatedBy: d.updatedBy,
                })),
            });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-wdf/get/:id — fetch a single WDF config */
    get: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const name = req.params.id as string;
            const doc = await WdfConfigModel.findOne({ name }).lean();
            if (!doc) {
                return res.status(404).json({ success: false, message: `WDF config "${name}" not found` });
            }
            return res.json({
                success: true,
                name: doc.name,
                data: doc.data,
                updatedAt: doc.updatedAt,
                updatedBy: doc.updatedBy,
            });
        } catch (err) {
            return next(err);
        }
    },

    /** POST /admin/v1/scripts/manage-wdf/update/:id — upsert the whole config */
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const name = req.params.id as string;
            if (!(WDF_NAMES as readonly string[]).includes(name)) {
                return res.status(400).json({ success: false, message: `Invalid WDF config name "${name}"` });
            }

            const data = (req.body && req.body.data !== undefined) ? req.body.data : req.body;
            const updatedBy = (req as any).profileId || (req as any).userId || "admin";

            const doc = await WdfConfigModel.findOneAndUpdate(
                { name },
                { $set: { name, data, updatedAt: Date.now(), updatedBy } },
                { upsert: true, new: true }
            );

            return res.json({ success: true, item: doc });
        } catch (err) {
            return next(err);
        }
    },

    /** DELETE /admin/v1/scripts/manage-wdf/delete/:id — delete a WDF config */
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const name = req.params.id as string;
            await WdfConfigModel.deleteOne({ name });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },
};
