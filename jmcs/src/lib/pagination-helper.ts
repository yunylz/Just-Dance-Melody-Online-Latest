import { Request, Response, NextFunction } from "express";
import { Model } from "mongoose";
import config from "../config";

const S3_FQDN = config.S3.FQDN || "";

export async function paginate(model: Model<any>, req: Request, res: Response, next: NextFunction, filter: any = {}) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 0;
        const skip = (page - 1) * limit;

        const query = model.find(filter);
        if (limit > 0) {
            query.skip(skip).limit(limit);
        }

        const [rawItems, total] = await Promise.all([
            query.exec(),
            model.countDocuments(filter)
        ]);

        const items = rawItems.map(item => {
            const obj = item.toObject ? item.toObject() : item;
            const fieldsToExpand = ['url', 'backgroundUrl', 'foregroundUrl'];
            
            for (const field of fieldsToExpand) {
                if (obj[field] && String(obj[field]).startsWith('/')) {
                    obj[field] = S3_FQDN + obj[field];
                }
            }
            return obj;
        });

        return res.json({
            success: true,
            items,
            total,
            page,
            limit
        });
    } catch (err: any) {
        return next({ status: 500, message: err.message, error: err });
    }
}
