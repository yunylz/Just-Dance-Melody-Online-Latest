import { ISku } from "../config/skus";

declare global {
    namespace Express {
        interface Request {
            sku?: ISku;
            userId?: string;
            profileId?: string;
            appId?: string;
            spaceId?: string;
            sessionId?: string;
            ticket?: string;
            platform?: string;
            exp?: number;
            sessionData?: ISession;
            clientIp: string;
            clientCountry: string;
            country?: object // set by leaderboard.v1 middleware
            isBackoffice?: boolean
            isAdmin?: boolean // set by httpMiddleware.isAdmin
            isPackageManager?: boolean // set by httpMiddleware.isPackageManager
            isGuest?: boolean,
            isModerator?: boolean,
            isPatreon?: boolean,
            isQA?: boolean,
            isS2s?: boolean,
            verificationCode?: string
            jmcsEnv?: string
        }
    }
}