import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import itemsLib from '../lib/items';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    publicRouter.get("/items", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const items = await itemsLib.getItems();

        return res.send({
            __class: "OnlineCustomizableItemDb",
            ...items
        });
    });

}