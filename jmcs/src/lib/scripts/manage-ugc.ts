import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

import UgcModel from "../models/ugc";
import ProfileModel from "../models/profile";
import ugcClient from "../ugc-client";
import ugcS3 from "../ugc-s3";
import {
    UGC_NOT_FOUND,
    UGC_ALREADY_DELETED,
    UGC_NOT_FEATURED,
    UGC_NO_CONTENT,
    UGC_MISSING_FIELDS,
    UGC_INVALID_CONTENT,
} from "../http-codes";
import { createLogger } from "../logger";

const logger = createLogger({ service: "manage-ugc" });
const MAX_COUNT = 30;

export default {
    /** GET /admin/v1/scripts/manage-ugc/list — list UGCs with filters */
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const type = req.query.type as string;
            const profileId = req.query.profileId as string;
            const reported = req.query.reported as string;
            const pending = req.query.pending as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || MAX_COUNT, 100);
            const skip = (page - 1) * limit;

            const filter: Record<string, any> = {};
            if (type) filter.type = type;
            if (profileId) filter.profileId = profileId;
            if (reported === "true") filter.reports = { $gt: 0 };
            if (pending === "true") filter.approved = { $exists: false };

            const [docs, total] = await Promise.all([
                UgcModel.find(filter as any)
                    .sort({ time: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                UgcModel.countDocuments(filter as any),
            ]);

            const formatted = docs.map((d) => ugcClient.formatUgc(d, d.ugcId));
            return res.json({ success: true, ugcs: formatted, total, page, limit });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-ugc/get/:id — get single UGC bypassing moderation */
    get: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const data = await UgcModel.findOne({ ugcId }).lean();
            if (!data) return next(UGC_NOT_FOUND);

            const doc = ugcClient.formatUgc(data, ugcId);
            doc.__class = "UGCEntry";
            delete doc.random;
            delete (doc as any)._id;

            const profile = await ProfileModel.findOne({ profileId: doc.profileId }).lean();
            if (profile) {
                doc.name = profile.name;
                doc.avatar = profile.avatar;
                doc.country = profile.country;
                if (profile.portraitBorder) doc.portraitBorder = profile.portraitBorder;
            }

            return res.json(doc);
        } catch (err) {
            return next(err);
        }
    },

    /** POST /admin/v1/scripts/manage-ugc/create-cv — create CV UGC */
    "create-cv": async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { content, text, time: cvTime, title, profileId } = req.body;
            if (!content || typeof content !== "object") return next(UGC_MISSING_FIELDS);

            const fileNames = Object.keys(content);
            for (const fileName of fileNames) {
                if (!content[fileName]?.mimetype) return next(UGC_INVALID_CONTENT);
            }

            const ugcId = uuidv4();
            const doc = {
                ugcId,
                type: "cv" as const,
                content,
                text,
                time: cvTime,
                title,
                profileId: profileId || "00000000-0000-0000-0000-000000000000",
                approved: 1,
            };

            const result: Record<string, any> = { ugcId, content: {} };
            for (const fileName of fileNames) {
                const url = await ugcS3.getSignedUploadUrl(ugcS3.buildKey(ugcId, fileName), content[fileName].mimetype);
                result.content[fileName] = { url, mimetype: content[fileName].mimetype };
            }

            await UgcModel.create(doc);
            logger.info({ message: `CV UGC ${ugcId} created`, details: { ugcId, title } });
            return res.status(201).json(result);
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /admin/v1/scripts/manage-ugc/update/:id — update UGC fields */
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const result = await UgcModel.updateOne({ ugcId }, { $set: req.body });
            if (result.matchedCount === 0) return next(UGC_NOT_FOUND);
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /admin/v1/scripts/manage-ugc/moderate/:id — approve/deny UGC */
    moderate: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const approved = req.body.approved ? 1 : 0;
            const banReason = req.body.banReason;

            const ugc = await UgcModel.findOne({ ugcId }).lean();
            if (!ugc) return next(UGC_NOT_FOUND);
            if (!ugc.content) return next(UGC_NO_CONTENT);

            await UgcModel.updateOne({ ugcId }, { $set: { approved, banReason } });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /admin/v1/scripts/manage-ugc/feature/:id — feature UGC */
    feature: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const now = Math.floor(Date.now() / 1000);
            const result = await UgcModel.updateOne({ ugcId }, { $set: { featured: now } });
            if (result.matchedCount === 0) return next(UGC_NOT_FOUND);
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** DELETE /admin/v1/scripts/manage-ugc/unfeature/:id — unfeature UGC */
    unfeature: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const ugc = await UgcModel.findOne({ ugcId }).lean();
            if (!ugc) return next(UGC_NOT_FOUND);
            if (!ugc.featured) return next(UGC_NOT_FEATURED);
            await UgcModel.updateOne({ ugcId }, { $unset: { featured: "" } });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /admin/v1/scripts/manage-ugc/tags/:id — set UGC tags */
    tags: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ugcId = req.params.id as string;
            const { tags } = req.body;
            const result = await UgcModel.updateOne({ ugcId }, { $set: { tags } });
            if (result.matchedCount === 0) return next(UGC_NOT_FOUND);
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-ugc/reported — list reported UGCs grouped by type */
    "list-reported": async (req: Request, res: Response, next: NextFunction) => {
        try {
            const type = req.query.type as string;
            const offset = parseInt(req.query.offset as string) || 0;
            const count = Math.min(parseInt(req.query.count as string) || MAX_COUNT, MAX_COUNT);

            const filter: Record<string, any> = { reports: { $gt: 0 }, deleted: { $ne: 1 } };
            if (type) filter.type = type;

            const docs = await UgcModel.find(filter as any)
                .sort({ reports: -1 })
                .skip(offset)
                .limit(count)
                .lean();

            const formatted = docs.map((d) => ugcClient.formatUgc(d, d.ugcId));
            return res.json(formatted);
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-ugc/reported-count — count reported UGCs */
    "reported-count": async (req: Request, res: Response, next: NextFunction) => {
        try {
            const type = req.query.type as string;
            const filter: Record<string, any> = { reports: { $gt: 0 }, deleted: { $ne: 1 } };
            if (type) filter.type = type;
            const count = await UgcModel.countDocuments(filter as any);
            return res.json({ count });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-ugc/pending — list pending UGCs */
    "list-pending": async (req: Request, res: Response, next: NextFunction) => {
        try {
            const type = req.query.type as string;
            const count = Math.min(parseInt(req.query.count as string) || MAX_COUNT, MAX_COUNT);

            const filter: Record<string, any> = {
                approved: { $exists: false },
                deleted: { $ne: 1 },
            };
            if (type) filter.type = type;

            const docs = await UgcModel.find(filter as any)
                .sort({ time: -1 })
                .limit(count)
                .lean();

            const filtered = docs.filter((d) => !d.hasOwnProperty("approved"));
            const formatted = filtered.map((d) => ugcClient.formatUgc(d, d.ugcId));
            return res.json(formatted);
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-ugc/pending-count — count pending UGCs */
    "pending-count": async (req: Request, res: Response, next: NextFunction) => {
        try {
            const type = req.query.type as string;
            const filter: Record<string, any> = { approved: { $exists: false }, deleted: { $ne: 1 } };
            if (type) filter.type = type;
            const count = await UgcModel.countDocuments(filter as any);
            return res.json({ count });
        } catch (err) {
            return next(err);
        }
    },
};
