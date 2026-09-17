import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import packages from '../lib/packages';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import { ISku } from '../config/skus';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    publicRouter.get("/sku-packages", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const platform = (req.sku as ISku).platform;
        const jmcsEnv = req.jmcsEnv;

        const skuPackages = await packages.getSkuPackages(platform.toUpperCase(), jmcsEnv, req.isPatreon);

        return res.json(skuPackages);
    });

};