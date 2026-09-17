import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import { randomUUID } from 'node:crypto';
import profiles from '../lib/profiles';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * This router is for fake account login for JDCompanion.
     * It returns all the PIDs in JMCS so that the console picks the player's profileId from game and does 
     * AccountInfo.otherPids.includes(Game.ProfileId)
     */
    publicRouter.get("/accounts/ffd651a0-a366-4973-b0bf-1568603bc9ad", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const ticket = req.ticket as string;
        const token = randomUUID();
        const profileIds = await profiles.getAllProfileIds();

        return res.send({
            __class: "AccountInfo",
            pid: req.profileId,
            otherPids: profileIds,
            ticket: ticket.substr(7),
            token: token
        });
    });
};