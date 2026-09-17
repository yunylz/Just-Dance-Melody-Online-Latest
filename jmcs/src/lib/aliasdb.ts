import aliasModel from "./models/alias";
import localization from "./localization";
import { createLogger } from "./logger";

const logger = createLogger({ service: "aliasdb-lib" });

class AliasDb {
    constructor() { }

    /**
     * Get the alias database for a specific game version and language.
     */
    async getAliasDb(gameVersion: string, language: string) {
        try {
            const aliases = await aliasModel.find({}).lean();

            // Collect all unique loc IDs to fetch in bulk
            const locIds = new Set<number>();
            for (const alias of aliases) {
                if (alias.StringLocID) locIds.add(alias.StringLocID);
                if (alias.StringLocIDFemale) locIds.add(alias.StringLocIDFemale);
                if (alias.DescriptionLocID) locIds.add(alias.DescriptionLocID);
            }

            const locMap = await localization.getLocalisationMap(Array.from(locIds));

            // Helper to get localized string from map
            const getLoc = (locId: number | null | undefined, lang: string) => {
                if (locId == null) return `<MISSING:null>`;
                const strings = locMap[locId.toString()];
                if (!strings) return `<MISSING:${locId}>`;
                return strings[lang] || strings["en"] || `<MISSING:${locId}:${lang}>`;
            };

            const result: Record<string, any> = {};

            for (const alias of aliases) {
                const formattedAlias: any = { ...alias };

                // Remove internal Mongoose fields
                delete formattedAlias._id;
                delete formattedAlias.__v;
                delete formattedAlias.UnlockObjectives;

                // Localize strings with fallback to StringPlaceholder
                const loc = getLoc(alias.StringLocID, language);
                formattedAlias.StringOnlineLocalized = (loc && !loc.includes('<MISSING')) ? loc : (alias.StringPlaceholder || loc);

                if (alias.StringLocIDFemale) {
                    const locFemale = getLoc(alias.StringLocIDFemale, language);
                    formattedAlias.StringOnlineLocalizedFemale = (locFemale && !locFemale.includes('<MISSING')) ? locFemale : (alias.StringPlaceholder || locFemale);
                } else {
                    formattedAlias.StringOnlineLocalizedFemale = formattedAlias.StringOnlineLocalized;
                    delete formattedAlias.StringLocIDFemale;
                }

                if (alias.DescriptionLocID) {
                    const locDesc = getLoc(alias.DescriptionLocID, language);
                    formattedAlias.DescriptionLocalized = (locDesc && !locDesc.includes('<MISSING')) ? locDesc : `<MISSING:${alias.DescriptionLocID}>`;
                } else {
                    formattedAlias.DescriptionLocalized = `<MISSING:${alias.DescriptionLocID}>`;
                    delete formattedAlias.DescriptionLocID;
                }

                // Default visibility to 1 (VISIBLE)
                formattedAlias.Visibility = 1;

                result[alias.aliasId] = formattedAlias;
            }

            return {
                "__class": "OnlineAliasDb",
                "aliases": result
            };
        } catch (err) {
            logger.error("Failed to fetch alias db", { err });
            throw err;
        }
    }

    /**
     * Methods for Dashboard management
     */
    async getAllRawAliases() {
        return await aliasModel.find({}).sort({ aliasId: 1 });
    }

    async upsertAlias(aliasId: string, data: any) {
        return await aliasModel.findOneAndUpdate({ aliasId }, data, { upsert: true, new: true });
    }

    async deleteAlias(aliasId: string) {
        return await aliasModel.deleteOne({ aliasId });
    }
}

export default new AliasDb();
