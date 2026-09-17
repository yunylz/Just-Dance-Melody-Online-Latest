import { Express, Request, Response, Router } from 'express';
import winston from 'winston';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/active-contest", (req: Request, res: Response) => {
        res.send();
    });
};