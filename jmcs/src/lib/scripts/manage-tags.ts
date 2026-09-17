import { Request, Response, NextFunction } from "express";
import { Tag } from "../models/tag";
import { paginate } from "../pagination-helper";

import SongModel from "../models/song";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 0;
            const skip = (page - 1) * limit;

            const query = Tag.find({});
            if (limit > 0) query.skip(skip).limit(limit);

            const [tags, total, usageCounts] = await Promise.all([
                query.exec(),
                Tag.countDocuments({}),
                SongModel.aggregate([
                    { $unwind: "$tags" },
                    { $group: { _id: "$tags", count: { $sum: 1 } } }
                ])
            ]);

            const countMap = new Map(usageCounts.map(u => [String(u._id), u.count]));

            const items = tags.map(t => {
                const obj: any = t.toObject ? t.toObject() : t;
                obj.songCount = countMap.get(String(obj._id)) || 0;
                return obj;
            });

            return res.json({ success: true, items, total, page, limit });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = new Tag(req.body);
            await item.save();
            return res.status(201).json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const item = await Tag.findByIdAndUpdate(id, req.body, { new: true });
            if (!item) {
                return res.status(404).json({ success: false, message: "Tag not found" });
            }
            return res.json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const item = await Tag.findByIdAndDelete(id);
            if (!item) {
                return res.status(404).json({ success: false, message: "Tag not found" });
            }
            return res.json({ success: true });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    }
};
