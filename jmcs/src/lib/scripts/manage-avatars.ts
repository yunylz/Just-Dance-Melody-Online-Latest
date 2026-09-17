import { Request, Response, NextFunction } from "express";
import { Avatar } from "../models/items";
import { paginate } from "../pagination-helper";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        return paginate(Avatar, req, res, next);
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = new Avatar(req.body);
            await item.save();
            return res.status(201).json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id; // Actually MongoDB _id, not the item's Id field unless specified otherwise
            const item = await Avatar.findByIdAndUpdate(id, req.body, { new: true });
            if (!item) {
                return res.status(404).json({ success: false, message: "Avatar not found" });
            }
            return res.json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const item = await Avatar.findByIdAndDelete(id);
            if (!item) {
                return res.status(404).json({ success: false, message: "Avatar not found" });
            }
            return res.json({ success: true });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    }
};
