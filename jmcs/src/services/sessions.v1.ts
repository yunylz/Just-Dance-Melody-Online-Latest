import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';
import sessionLib from "../lib/session";
import { CANT_CREATE_SESSION, INTERNAL_SERVER_ERROR, NOT_FOUND, BAD_REQUEST, INVALID_PAIRING_CODE, SESSION_NOT_FOUND } from '../lib/http-codes';
import { skuIdRequired } from '../lib/skus-client';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { ISku } from '../config/skus';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * @description POST /session
     * @tags Sessions
     * @summary Create a new JMCS session
     * @security HarbourTicket
     * @security SkuId
     * @return {SessionResponse} 200 - Session created successfully
     * @return {CANT_CREATE_SESSION} 400 - Bad request
     * @return {NOT_AUTHENTICATED} 401 - Unauthorized
     * @return {NOT_FOUND} 404 - SKU not found
     * @return {INTERNAL_ERROR} 500 - Internal server error
     */
    publicRouter.post("/session", ticketRequired, skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as ISessionRequestBody;
        const profileId = req.profileId as string;
        const userId = req.userId as string;
        const sessionId = req.sessionId as string;
        const sku = req.sku as ISku;
        const ticketExpiration = req.exp as number;

        try {
            const result = await sessionLib.createSession({
                sku,
                userId,
                profileId,
                sessionId,
                ticketExpiration,
                publicIp: body.publicIp,
                pairingInfo: body.pairingInfo,
                populations: body.populations
            });

            if (!result.success) {
                logger.error({
                    message: "Failed to create session",
                    details: { userId, profileId, sessionId, sku, ticketExpiration }
                });
                return next(CANT_CREATE_SESSION);
            }

            return res.status(200).json({
                ...(result.pairingCode && { pairingCode: result.pairingCode }),
                sessionId,
                ...(result.docId && { docId: result.docId })
            });
        } catch (err) {
            logger.error({
                message: "Failed to create session",
                details: { userId, profileId, sessionId, sku, ticketExpiration, error: err }
            });
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @description GET /pairing-info
     * @tags Sessions
     * @summary Get pairing info for a session by pairing code
     * @security SkuId
     * @param {string} code.query.required - The pairing code
     * @return {PairingInfo} 200 - Pairing info returned successfully
     * @return {BAD_REQUEST} 400 - Invalid or missing pairing code
     * @return {NOT_FOUND} 404 - Pairing code or session not found
     * @return {INTERNAL_ERROR} 500 - Internal server error
     */
    publicRouter.get("/pairing-info", skuIdRequired, async (req: Request, res: Response, next: NextFunction) => {
        const code = req.query.code as string;

        // Validate code range, matching original JS behaviour
        const intCode = parseInt(code);
        if (!intCode || intCode < 1 || intCode > 999999) {
            return next(INVALID_PAIRING_CODE);
        }

        try {
            const session = await sessionLib.getSessionByPairingCode(code);

            if ('success' in session) {
                return next(SESSION_NOT_FOUND);
            }

            if (!session.pairingInfo) {
                return next(SESSION_NOT_FOUND);
            }

            return res.status(200).json(session.pairingInfo);
        } catch (err) {
            logger.error({
                message: "Failed to get pairing info",
                details: { code, error: err }
            });
            return next(INTERNAL_SERVER_ERROR);
        }
    });
};