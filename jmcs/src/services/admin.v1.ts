import express, { Express, Request, Response, Router, NextFunction } from 'express';
import path from 'path';
import winston from 'winston';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import crypto from 'crypto';

import config from '../config';
import scriptsRegistry from '../lib/scripts';
import httpMiddleware from '../lib/http-middleware';
import { SESSION_REQUIRED, SCRIPT_NOT_FOUND, SCRIPT_ACTION_NOT_FOUND } from '../lib/http-codes';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    const sessionMiddleware = session({
        secret: config.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: config.MONGODB_URI,
        }),
        cookie: {
            secure: config.IS_HTTPS,
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 // 1 day
        }
    });

    privateRouter.use(sessionMiddleware);

    // Script Runner (API)
    privateRouter.all(
        ['/scripts/:scriptName/:action', '/scripts/:scriptName/:action/:id'],
        httpMiddleware.isAdmin,
        async (req: Request, res: Response, next: NextFunction) => {
            const scriptName = req.params.scriptName as string;
            const action = req.params.action as string;
            const script = scriptsRegistry[scriptName];
            if (!script) return next(SCRIPT_NOT_FOUND);

            const handler = script[action];
            if (typeof handler !== 'function') return next(SCRIPT_ACTION_NOT_FOUND);

            try {
                await handler(req, res, next);
            } catch (err) {
                next(err);
            }
        }
    );
};
