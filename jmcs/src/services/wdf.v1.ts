import axios from 'axios';
import { Express, Request, Response, Router } from 'express';
import winston from 'winston';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import utils from '../lib/utils';

var WDF_HOST = process.env.WDF_HOST ?? 'world-dance-floor';
var WDF_PORT = process.env.WDF_PORT ?? 9330;

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    logger.debug(`Using WDF proxy ${WDF_HOST}:${WDF_PORT}`);

    // Proxy all WDF endpoints to the WDF server
    // But keep ticket and sku validation. 
    publicRouter.all("/*path", ticketRequired, skuIdRequired, async (req: Request, res: Response) => {
        const url = `http://${WDF_HOST}:${WDF_PORT}${req.originalUrl}`;

        try {
            const headers = { 
                ...req.headers
            };
            delete headers['host'];

            const proxyRes = await axios({
                method: req.method as any,
                url,
                headers,
                data: req.body,
                responseType: 'stream',
                validateStatus: () => true
            });

            res.status(proxyRes.status);
            for (const [key, value] of Object.entries(proxyRes.headers)) {
                if (value !== undefined) res.setHeader(key, value as string);
            }
            proxyRes.data.pipe(res);
        } catch (error: any) {
            if (!utils.isLocal()) logger.error({ message: 'WDF proxy error', details: error?.stack });
            res.status(502).send();
        }
    });

}