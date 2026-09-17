
import { Request } from 'express';
import { registerProcessor } from "../registry";
import { createLogger } from '../../logger';

const logger = createLogger({ service: "TopPlayedRequest-processor" });

/**
 * Placeholder for Top Played Songs request.
 * Implementation will follow in a future update.
 */
registerProcessor("JD_CarouselTopPlayedRequestDesc", async (requestDesc: any, req: Request) => {
    logger.info("TopPlayedRequest processor called (stub)");

    const carouselVersion = (req as any).carouselVersion || 2;

    if (carouselVersion >= 2) {
        return {
            items: [],
            actionLists: {}
        };
    } else {
        return [];
    }
});
