import { Request, Response, NextFunction } from "express";
import { Skin } from "../models/items";
import { paginate } from "../pagination-helper";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        return paginate(Skin, req, res, next);
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = new Skin(req.body);
            await item.save();
            return res.status(201).json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const item = await Skin.findByIdAndUpdate(id, req.body, { new: true });
            if (!item) {
                return res.status(404).json({ success: false, message: "Skin not found" });
            }
            return res.json({ success: true, item });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const item = await Skin.findByIdAndDelete(id);
            if (!item) {
                return res.status(404).json({ success: false, message: "Skin not found" });
            }
            return res.json({ success: true });
        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    }
};
