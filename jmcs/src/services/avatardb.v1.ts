import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import itemsLib from '../lib/items';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * GET /avatars
     * Returns all the available avatars.
     * FIXME: We currently retreive avatars from items, then remove the skins and portraitBorders. Better ways to handle this?
     * 
     * @param req Request
     * @param res Response
     * @param next Next function
     * @returns List of all avatars
     */
    publicRouter.get("/avatars", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const items = await itemsLib.getItems();

        // Remove unnecessary data
        delete items.skins;
        delete items.portraitBorders;

        return res.send({
            __class: "OnlineCustomizableItemDb",
            ...items
        })
    });
};