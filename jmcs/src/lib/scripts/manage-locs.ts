import { Request, Response, NextFunction } from "express";
import localizationLib from "../localization";
import { INTERNAL_SERVER_ERROR } from "../http-codes";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 0;
            const search = req.query.search as string;
            const skip = (page - 1) * limit;

            const filter: any = {};
            if (search) {
                filter.$or = [
                    { locId: isNaN(Number(search)) ? -1 : Number(search) },
                    { [`strings.en`]: { $regex: search, $options: "i" } }
                ];
            }

            const { items, total } = await localizationLib.getAllLocs(filter, { 
                skip: limit > 0 ? skip : undefined, 
                limit: limit > 0 ? limit : undefined 
            });

            return res.json({ success: true, items, total, page, limit });
        } catch (error: any) {
            return next({ ...INTERNAL_SERVER_ERROR, error, message: error.message || INTERNAL_SERVER_ERROR.message });
        }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        const { locId, strings } = req.body;
        if (!locId) {
            return res.status(400).json({ success: false, message: "locId is required" });
        }
        
        const { success, error, errorMessage } = await localizationLib.newLoc(Number(locId), strings || {});
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to create localization" });
            }
            return res.status(409).json({ success: false, message: "Localization already exists" });
        }
        return res.status(201).json({ success: true });
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
        const locId = req.params.id as string;
        const { strings } = req.body;
        const { success, error, errorMessage } = await localizationLib.updateLoc(Number(locId), strings || {});
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to update localization" });
            }
            return res.status(404).json({ success: false, message: "Localization not found" });
        }
        return res.json({ success: true });
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        const locId = req.params.id as string;
        const { success, error, errorMessage } = await localizationLib.deleteLoc(Number(locId));
        if (!success) {
            if (error) {
                return next({ ...INTERNAL_SERVER_ERROR, error, message: errorMessage || "Failed to delete localization" });
            }
            return res.status(404).json({ success: false, message: "Localization not found" });
        }
        return res.json({ success: true });
    }
};
