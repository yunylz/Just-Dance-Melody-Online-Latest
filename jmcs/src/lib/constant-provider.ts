import cache from "./cache";
import cacheKeys from "./cache-keys";
import { createLogger } from "./logger";

const logger = createLogger({ service: "constant-provider-lib" });

class ConstantProvider {
    private cacheKey: string;

    constructor() {
        this.cacheKey = cacheKeys.CONSTANTS;
    };

    async getConstants() : Promise<Record<string, any>> {
        try {
            const { value: constants } = await cache.get(this.cacheKey);
            return { success: true, constants: constants || {} };
        }
        catch(err: any) {
            logger.error({ message: "Failed to get game constants from cache.", error: err });
            return { success: false, error: err };
        }
    };

    async setConstants(constants: Record<string, any>)  {
        try {
            await cache.set(this.cacheKey, constants);
            logger.info({ message: "Set game constants in cache.", details: { constants } });
            return { success: true };
        }
        catch(err: any) {
            logger.error({ message: "Failed to set game constants in cache.", details: { constants }, error: err });
            return { success: false, error: err };
        }
    };
};

export default new ConstantProvider();