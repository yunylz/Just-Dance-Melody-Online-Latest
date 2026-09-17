import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

/**
 * This is an example service that you can use as a starting point for your own services.
 */

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/", (req: Request, res: Response, next: NextFunction) => {
        res.send("OK");
    });
};