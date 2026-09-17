import { Request, Response, NextFunction } from "express";
import aliasdb from "../aliasdb";
import { INTERNAL_SERVER_ERROR, ALIAS_CANT_BE_UPDATED } from "../http-codes";

export default {
    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const aliases = await aliasdb.getAllRawAliases();
            return res.json({ success: true, items: aliases });
        } catch (err) {
            return next({ ...INTERNAL_SERVER_ERROR, error: err });
        }
    },
    upsert: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const alias = await aliasdb.upsertAlias(id as string, req.body);
            return res.json({ success: true, item: alias });
        } catch (err) {
            return next({ ...ALIAS_CANT_BE_UPDATED, error: err });
        }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await aliasdb.deleteAlias(id as string);
            return res.json({ success: true });
        } catch (err) {
            return next({ ...INTERNAL_SERVER_ERROR, error: err });
        }
    }
};
