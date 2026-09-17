import * as Express from "express";

import { SESSION_REQUIRED } from "./http-codes";
import { createLogger } from "./logger";
import sessionLib from "./session";

const logger = createLogger({ service: "session-client" });

export default async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    const sessionId = req.headers["x-jmcs-sessionid"] as string;

    if (!sessionId) {
        logger.error({
            message: `Session couldn't be found in header.`,
            details: { sessionId }
        });
        return next(SESSION_REQUIRED);
    };

    const sessionData = await sessionLib.getSession(sessionId);

    if (!sessionData) {
        logger.error({
            message: `Session couldn't be found.`,
            details: { sessionId }
        });
        return next(SESSION_REQUIRED);
    };

    req.sessionData = sessionData as ISession;
    return next();
};