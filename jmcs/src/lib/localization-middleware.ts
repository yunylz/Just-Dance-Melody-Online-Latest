
import { Request, Response, NextFunction } from 'express';
import localizationLib from './localization';
import config from '../config';

let locsDb: Record<string, Record<string, string>> = {};

const loadLocs = async () => {
    const result = await localizationLib.buildLocsDb();
    if (result.success && result.locsDb) {
        locsDb = result.locsDb;
    }
};

loadLocs();

export const localizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const language = (req.query.language as string) || config.DEFAULT_LANGUAGE || 'en';

    (req as any).language = language;
    (req as any).getLocalisation = (locId: number | string) => {
        const idStr = locId.toString();
        const strings = locsDb[idStr];
        if (!strings) return null;
        return strings[language] || strings['en'] || Object.values(strings)[0] || null;
    };

    next();
};

export default localizationMiddleware;
