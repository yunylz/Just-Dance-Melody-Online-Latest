import localization from "./models/localization";

import { createLogger } from "./logger";

const logger = createLogger({ service: "localization-lib" });

class Localization {
    constructor() { }

    async getAllLocs(filter: any = {}, options: { skip?: number, limit?: number } = {}) {
        const query = localization.find(filter);
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);

        const [items, total] = await Promise.all([
            query.exec(),
            localization.countDocuments(filter)
        ]);
        return { items, total };
    };

    async buildLocsDb() {
        try {
            const locs = await this.getAllLocs();
            const locsDb: Record<string, any> = {};
            for (const loc of locs.items) {
                locsDb[loc.locId.toString()] = loc.strings;
            }

            return {
                success: true,
                locsDb
            };
        } catch (err) {
            logger.error({
                message: "Failed to build localization DB.",
                error: err,
                details: {}
            })
            return {
                success: false,
                error: err
            }
        }
    };
    async newLoc(locId: number, strings: Record<string, string>) {
        try {
            const exists = await localization.findOne({ locId });
            if (exists) return { success: false, errorMessage: "Localization ID already exists." };
            await localization.create({ locId, strings });
            return { success: true };
        } catch (err: any) {
            logger.error(`Error creating localization: ${err.message}`, { err });
            return { success: false, error: err, errorMessage: err.message };
        }
    }

    async updateLoc(locId: number, strings: Record<string, string>) {
        try {
            const exists = await localization.findOne({ locId });
            if (!exists) return { success: false, errorMessage: "Localization ID not found." };
            await localization.updateOne({ locId }, { $set: { strings } });
            return { success: true };
        } catch (err: any) {
            logger.error(`Error updating localization: ${err.message}`, { err });
            return { success: false, error: err, errorMessage: err.message };
        }
    }

    async deleteLoc(locId: number) {
        try {
            const exists = await localization.findOne({ locId });
            if (!exists) return { success: false, errorMessage: "Localization ID not found." };
            await localization.deleteOne({ locId });
            return { success: true };
        } catch (err: any) {
            logger.error(`Error deleting localization: ${err.message}`, { err });
            return { success: false, error: err, errorMessage: err.message };
        }
    }

    async getLocalisation(locId: number | null | undefined, language: string): Promise<string> {
        if (locId === null || locId === undefined) return "<MISSING:null>";
        try {
            const loc = await localization.findOne({ locId });
            if (!loc) return `<MISSING:${locId}>`;
            return loc.strings[language] || loc.strings["en"] || `<MISSING:${locId}:${language}>`;
        } catch (err) {
            return `<ERROR:${locId}>`;
        }
    }

    async getLocalisationMap(locIds: number[]): Promise<Record<string, Record<string, string>>> {
        try {
            const locs = await localization.find({ locId: { $in: locIds } }).lean();
            const map: Record<string, Record<string, string>> = {};
            for (const loc of locs) {
                map[loc.locId.toString()] = loc.strings;
            }
            return map;
        } catch (err) {
            logger.error(`Error fetching localization map: ${err}`, { err });
            return {};
        }
    }
}

export default new Localization();