import { Express, Request, Response, Router } from 'express';
import winston from 'winston';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/com-videos-fullscreen", (req: Request, res: Response) => {
        res.send([]);
    });
};