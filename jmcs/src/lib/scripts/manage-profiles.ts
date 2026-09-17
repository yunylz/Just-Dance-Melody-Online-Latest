import { Request, Response, NextFunction } from "express";
import ProfileModel from "../models/profile";
import { PROFILE_NOT_FOUND } from "../http-codes";
import { createLogger } from "../logger";

const logger = createLogger({ service: "manage-profiles" });

export default {
    /** GET /admin/v1/scripts/manage-profiles/list — list profiles with search & pagination */
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
            const skip = (page - 1) * limit;
            const search = req.query.search as string;
            const profileId = req.query.profileId as string;

            const filter: Record<string, any> = {};
            if (profileId) {
                filter.profileId = profileId;
            } else if (search) {
                filter.$or = [
                    { profileId: { $regex: search, $options: "i" } },
                    { name: { $regex: search, $options: "i" } },
                    { nickname: { $regex: search, $options: "i" } },
                ];
            }

            const [profiles, total] = await Promise.all([
                ProfileModel.find(filter)
                    .select("profileId name nickname avatar country platformId stars wdfRank songsPlayed diamondPoints")
                    .sort({ profileId: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                ProfileModel.countDocuments(filter),
            ]);

            return res.json({ success: true, profiles, total, page, limit });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /admin/v1/scripts/manage-profiles/get/:id — get full profile by profileId */
    get: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profileId = req.params.id as string;
            const profile = await ProfileModel.findOne({ profileId }).lean();
            if (!profile) return next(PROFILE_NOT_FOUND);

            const { _id, __v, ...data } = profile;
            return res.json({ success: true, profile: data });
        } catch (err) {
            return next(err);
        }
    },

    /** POST /admin/v1/scripts/manage-profiles/create — create a new profile */
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { profileId, name, ...rest } = req.body;
            if (!profileId) {
                return res.status(400).json({ success: false, message: "profileId is required" });
            }

            const existing = await ProfileModel.findOne({ profileId }).lean();
            if (existing) {
                return res.status(409).json({ success: false, message: "Profile with this ID already exists" });
            }

            await ProfileModel.create({
                profileId,
                name: name || "Unknown",
                ...rest,
            });

            logger.info({ message: `Profile ${profileId} created`, details: { profileId } });
            return res.status(201).json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /admin/v1/scripts/manage-profiles/update/:id — update profile fields */
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profileId = req.params.id as string;
            const allowedFields = [
                "name", "nickname", "avatar", "country", "skin", "alias", "aliasGender",
                "portraitBorder", "jdPoints", "progression", "unlockedAvatars", "unlockedSkins",
                "unlockedAliases", "unlockedPortraitBorders", "wdfRank", "stars", "unlocks",
                "songsPlayed", "platformId", "populations", "scores", "history", "favorites",
                "syncVersions", "otherPids", "stats", "mapHistory", "inProgressAliases",
                "diamondPoints",
            ];
            const updates: Record<string, any> = {};
            for (const field of allowedFields) {
                if (req.body.hasOwnProperty(field)) {
                    updates[field] = req.body[field];
                }
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, message: "No valid fields to update" });
            }

            const result = await ProfileModel.updateOne({ profileId }, { $set: updates });
            if (result.matchedCount === 0) return next(PROFILE_NOT_FOUND);

            logger.info({ message: `Profile ${profileId} updated`, details: { profileId, fields: Object.keys(updates) } });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },

    /** DELETE /admin/v1/scripts/manage-profiles/delete/:id — delete a profile permanently */
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profileId = req.params.id as string;
            const result = await ProfileModel.deleteOne({ profileId });
            if (result.deletedCount === 0) return next(PROFILE_NOT_FOUND);

            logger.info({ message: `Profile ${profileId} deleted`, details: { profileId } });
            return res.json({ success: true });
        } catch (err) {
            return next(err);
        }
    },
};
