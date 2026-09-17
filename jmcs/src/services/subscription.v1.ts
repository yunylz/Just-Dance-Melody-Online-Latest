import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import profiles from '../lib/profiles';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';


export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.post("/refresh", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as IRefreshSubscriptionInput;
        const profileId = req.profileId as string;

        const clientProfile = await profiles.getProfile(profileId);
        const platformId = clientProfile ? clientProfile.platformId : profileId;

        return res.json({
            validity: true,
            errorCode: "",
            timeLeft: 18316800,
            expiryTimeStamp: "1771172820",
            platformId: platformId,
            trialActivated: false,
            consoleHasTrial: true,
            trialDuration: "0",
            trialIsActive: false,
            needEshopLink: false
        });
    });
};