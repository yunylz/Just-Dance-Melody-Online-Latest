import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import { backOfficeTicketRequired, ticketRequired } from '../lib/harbour-ticket-client';
import { randomUUID } from 'node:crypto';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {
    publicRouter.get("/uuid", ticketRequired, backOfficeTicketRequired, (req: Request, res: Response, next: NextFunction) => {
        return res.send(randomUUID());
    });
};