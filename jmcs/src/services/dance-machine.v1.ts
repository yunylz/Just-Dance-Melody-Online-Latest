import { Express, Request, Response, Router } from 'express';
import winston from 'winston';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/blocks", (req: Request, res: Response) => {
        res.send({
            __class: "OnlineBlockDb",
            blocks: {}
        });
    });
};