
import express from 'express';

import config from "../config";

import { UNAUTHORIZED, INTERNAL_SERVER_ERROR, BACKOFFICE_ONLY, ENVIRONMENT_MISMATCH } from "./http-codes";
import { recordTicketHit, recordTicketRejection } from "./metrics-store";
import { createLogger } from "./logger";

import harbourTicket from "./harbour-ticket";
import httpMiddleware from "./http-middleware";
import * as webhook from "./webhook";
import utils from "./utils";

const logger = createLogger({ service: "harbour-ticket-client" });

// Bypass header keys — all in one place for easy management
const HEADER_JMCS_ENV_BYPASS = "x-jmcs-env-bypass-header";
const HEADER_JMCS_BYPASS_EXP = "x-jmcs-bypass-exp";
const HEADER_JMCS_USERID = "x-jmcs-override-userid";
const HEADER_JMCS_PROFILEID = "x-jmcs-override-profileid";
const HEADER_JMCS_PERMISSIONS = "x-jmcs-permissions";
const HEADER_BACKOFFICE_BYPASS = "x-backoffice-bypass";

// Handles Ubi_v1 tickets
export const ticketRequired = function (req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = req.ip as string;
    const originalUrl = req.originalUrl as string;
    const authorization = req.headers.authorization;

    // No auth provided
    if (!authorization) {
        logger.warn({
            message: "No authorization header provided in request.",
            details: { authorization, ip },
        });
        recordTicketRejection({
            ip,
            originalUrl,
            timestamp: new Date().toISOString(),
            reason: "missing"
        });
        return next(UNAUTHORIZED);
    }

    let [type, ticket] = authorization.split(" ");
    // If type is bearer, we forward it to isS2s for Hub to access all routes of JMCS.
    // S2S clients default to "prod" so they only see published songs.
    // Override via x-jmcs-env-bypass header if needed (e.g. for dev tools).
    if (type == "Bearer") {
        req.jmcsEnv = (req.headers[HEADER_JMCS_ENV_BYPASS] as string) || "prod";
        return httpMiddleware.isS2s(req, res, next);
    }

    // If auth is provided but the type is not what we need
    if (type !== "Ubi_v1") {
        logger.warn({
            message: "Invalid authorization header provided in request.",
            details: { authorization, ip },
        });
        recordTicketRejection({
            ip,
            originalUrl,
            type: type,
            ticket: ticket,
            timestamp: new Date().toISOString(),
            reason: "invalid"
        });
        webhook.ticket({
            title: "🚫 Invalid Authorization Type",
            message: `Expected Ubi_v1, received \`${type}\``,
            ip,
            originalUrl
        });
        return next(UNAUTHORIZED);
    }

    // Remove extra "t=" prefix from token if exists
    if (ticket.startsWith("t=")) ticket = ticket.substring(2);

    // Allow ticket expiration check to be bypassed via x-jmcs-bypass-exp header
    const bypassExpiry = !!(req.headers[HEADER_JMCS_BYPASS_EXP]);

    // Decrypt the ticket
    const { error, result } = harbourTicket.decrypt(ticket, { bypassExpiry });
    if (error) {
        logger.warn({
            message: "Failed to decrypt authorization header.",
            details: { authorization, ip },
            error: error.message
        });
        recordTicketRejection({
            ip,
            originalUrl,
            ticket: ticket,
            timestamp: new Date().toISOString(),
            reason: "invalid"
        });
        webhook.ticket({
            title: "💥 Ticket Decryption Failure",
            message: `Error: \`${error?.message}\``,
            ip,
            originalUrl
        });
        return next(error?.message ? error : UNAUTHORIZED);
    }

    const claims = result?.claims;

    // No longer needed since JMCS env switch is now used for songs only.
    // if (!claims?.isAdmin && !utils.isLocal()) {
    //     // Make sure jmcsEnv in ticket matches this JMCS' environment.
    //     const jmcsEnv = claims?.jmcsEnv ?? "prod";

    //     // Security: In development environments, strictly forbid production tickets.
    //     if (utils.isDev() && jmcsEnv === "prod") {
    //         logger.warn({
    //             message: "Production ticket used in development environment.",
    //             details: { ip, originalUrl, userId: claims?.uid }
    //         });
    //         webhook.ticket({
    //             title: "🚫 Production Ticket in Dev Environment",
    //             message: "A production ticket was used in a development environment. This is strictly forbidden.",
    //             ip,
    //             originalUrl,
    //             userId: claims?.uid,
    //             profileId: claims?.pid
    //         });
    //         return next(ENVIRONMENT_MISMATCH);
    //     }

    //     if (jmcsEnv !== config.ENV) {
    //         logger.warn({
    //             message: "JMCS environment in ticket does not match this JMCS' environment.",
    //             details: { authorization, ip, originalUrl, jmcsEnv, thisJmcsEnv: config.ENV },
    //         });
    //         webhook.environmentMismatch({
    //             ip,
    //             originalUrl,
    //             ticketEnv: jmcsEnv,
    //             currentEnv: config.ENV,
    //             userId: claims?.uid,
    //             profileId: claims?.pid
    //         });

    //         recordTicketRejection({
    //             ip,
    //             originalUrl,
    //             ticket: ticket,
    //             timestamp: new Date().toISOString(),
    //             reason: "invalid"
    //         });
    //         return next(ENVIRONMENT_MISMATCH);
    //     };
    // }

    req.userId = claims?.uid;
    req.profileId = claims?.pid;
    req.appId = claims?.aid;
    req.spaceId = claims?.spid;
    req.sessionId = claims?.sid;
    req.platform = claims?.platform;
    req.exp = claims?.exp;
    req.ticket = ticket;
    req.verificationCode = claims?.vfc;

    req.isGuest = claims?.guest || false;
    req.isAdmin = claims?.admin || false;
    req.isModerator = claims?.mod || false;
    req.isPatreon = claims?.patreon || false;
    req.isQA = claims?.qa || false;

    // Allow jmcsEnv to be overridden by a special header for testing purposes. If not provided, use the jmcsEnv from the ticket or default to "prod".
    if (req.headers[HEADER_JMCS_ENV_BYPASS]) {
        req.jmcsEnv = req.headers[HEADER_JMCS_ENV_BYPASS] as string;
    } else {
        req.jmcsEnv = claims?.jmcsEnv || "prod";
    }

    // Allow userId and profileId to be overridden via headers for testing.
    if (req.headers[HEADER_JMCS_USERID]) {
        req.userId = req.headers[HEADER_JMCS_USERID] as string;
    }
    if (req.headers[HEADER_JMCS_PROFILEID]) {
        req.profileId = req.headers[HEADER_JMCS_PROFILEID] as string;
    }

    // Allow permission flags to be overridden via x-jmcs-permissions header for testing.
    // Value is a comma-separated list: "patreon,admin,mod,qa"
    const permissionsHeader = req.headers[HEADER_JMCS_PERMISSIONS] as string | undefined;
    if (permissionsHeader) {
        const flags = permissionsHeader.split(",").map(f => f.trim().toLowerCase());
        req.isPatreon = flags.includes("patreon");
        req.isAdmin = flags.includes("admin");
        req.isModerator = flags.includes("mod") || flags.includes("moderator");
        req.isQA = flags.includes("qa");
    }

    // logger.info({
    //     message: "Authorization header successfully decrypted.",
    //     details: { authorization, ip, userId: req.userId, profileId: req.profileId, appId: req.appId, spaceId: req.spaceId, sessionId: req.sessionId, platform: req.platform },
    // });

    recordTicketHit();

    return next();
};

export const backOfficeTicketRequired = function (req: express.Request, res: express.Response, next: express.NextFunction) {
    const appId = req.appId;
    // If a special header is given, backoffice app ID check can be bypassed (for testing purposes)
    if (req.headers[HEADER_BACKOFFICE_BYPASS] && req.headers[HEADER_BACKOFFICE_BYPASS] == config.BACKOFFICE.BYPASS_TOKEN) {
        req.isBackoffice = true;
        return next()
    };

    // If not a Backoffice Ticket, reject request.
    if ((!appId || appId !== config.BACKOFFICE.APP_ID)) {
        webhook.ticket({
            title: "🔒 Unauthorized Backoffice Access",
            message: "A request attempted to access backoffice-only routes without a valid backoffice App ID.",
            ip: req.ip as string,
            originalUrl: req.originalUrl as string,
            userId: req.userId,
            profileId: req.profileId
        });
        return next(BACKOFFICE_ONLY)
    }

    req.isBackoffice = true;
    return next();
}