
import { Request } from 'express';
import config from '../../config';
import { createLogger } from '../logger';

const logger = createLogger({ service: "ab-testing" });

export const getPopulation = async (req: Request): Promise<any> => {
    // Porting logic from ab-testing.js
    if (config.ENV === 'test' || (req as any).isBackOffice?.()) return null;

    const sku = req.sku;
    if (!sku?.spaceId) {
        console.log(sku)
        logger.warn(`No spaceId for SKU ${sku?.gameVersion}-${sku?.platform}-${sku?.region}. Cannot do AB-testing.`);
        return null;
    }

    // In a real scenario, this would call Ubisoft KSS services
    // For now, we can return null or a mock population if needed
    return null;
};

export default {
    getPopulation
};
