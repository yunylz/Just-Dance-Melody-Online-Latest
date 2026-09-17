/**
 * @module ticket-client
 *
 * Express middleware layer over {@link module:ticket}.
 *
 * This module contains the two middleware functions that routes use to enforce
 * that a request carries a **valid Harbour session ticket** — the JWT-style
 * token issued by this server after a successful platform login.  It is
 * distinct from the platform credential layer (`auth-handler.js` / `lib/auth/`)
 * which validates the one-time console tokens sent during login.
 *
 * Expected `Authorization` header format:
 *   `Ubi_v1 t=<ticket>`
 *
 * Tokens without the `Ubi_v1` scheme or with the `t=` prefix omitted are
 * rejected immediately with `401 UNAUTHORIZED`.
 */

const config = require("../config");

const ticketLib = require("./ticket");
const { createLogger } = require("./logger");
const { INTERNAL_SERVER_ERROR, S2S_TOKEN_ONLY, TICKET_REQUIRED, BACKOFFICE_TOKEN_REQUIRED } = require("./http-codes");

const logger = createLogger({ service: "ticket-client" });

/**
 * Validates an incoming Harbour session ticket and populates the request with
 * the decoded claims.
 *
 * **Header contract:**
 * ```
 * Authorization: Ubi_v1 t=<ticket>
 * ```
 *
 * **S2S fast-path:** If the ticket's claims include `s2s: true` (a
 * server-to-server token), only `req.isS2s`, `req.appId`, `req.spaceId`, and
 * `req.sessionId` are set.  `req.userId` and `req.profileId` are **not** set
 * because S2S tokens do not belong to a user.  Use {@link s2sTicketRequired}
 * immediately after this middleware to restrict a route to S2S-only callers.
 *
 * **On success sets:**
 * - `req.userId`    {string}  — Hub user UUID (absent on S2S tokens).
 * - `req.profileId` {string}  — Hub profile UUID.
 * - `req.appId`     {string}  — Application UUID the session was created for.
 * - `req.spaceId`   {string}  — Space/product UUID (`spid` or `productId` claim).
 * - `req.sessionId` {string}  — Session UUID (used for cache lookups).
 * - `req.platform`  {string}  — Platform ID string (e.g. `"nx"`, `"ps4"`).
 * - `req.isS2s`     {boolean} — `true` only when the token is a server-to-server token.
 *
 * @type {import("express").RequestHandler}
 */
module.exports.ticketRequired = function (req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) return next(TICKET_REQUIRED);

    // Tickets must be issued under the Ubi_v1 scheme: "Ubi_v1 t=<token>"
    let [type, ticket] = authorization.split(" ");
    if (type == "Bearer") {
        return next(this.backOfficeTokenRequired);
    };
    if (type !== "Ubi_v1") return next(TICKET_REQUIRED);

    // Strip the optional "t=" prefix that some Ubi clients include
    if (ticket.startsWith("t=")) ticket = ticket.substring(2);

    const { error, result } = ticketLib.decrypt(ticket);
    if (error && !result) {
        return next(error || INTERNAL_SERVER_ERROR);
    }

    req.userId = result.claims.uid;
    req.profileId = result.claims.pid;
    req.appId = result.claims.aid;
    req.spaceId = result.claims.spid;
    req.sessionId = result.claims.sid;
    req.platform = result.claims.platform;
    req.isGuest = result.claims.guest;
    req.isAdmin = result.claims.admin;
    req.isModerator = result.claims.mod;
    req.isPatreon = result.claims.patreon;
    req.isQA = result.claims.qa;
    req.jmcsEnv = result.claims.jmcsEnv;

    next();
};

/**
 * Rejects any request whose ticket is **not** a server-to-server (S2S) token.
 *
 * Must be placed **after** {@link ticketRequired} in the middleware chain —
 * it relies on `req.isS2s` being set.
 *
 * @example
 * publicRouter.get("/", ticketRequired, s2sTicketRequired, handler);
 *
 * @type {import("express").RequestHandler}
 */
module.exports.s2sTicketRequired = function (req, res, next) {
    if (!req.isS2s) return next(S2S_TOKEN_ONLY);
    return next();
};

module.exports.backOfficeTokenRequired = function (req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) return next(BACKOFFICE_TOKEN_REQUIRED);

    const [type, token] = req.headers.authorization.split(" ");
    if (type !== "Bearer") return next(BACKOFFICE_TOKEN_REQUIRED);
    if (token !== config.BACKOFFICE_TOKEN) {
        logger.warn({
            message: "Invalid backoffice token",
            details: {
                token: token,
                ip: req.ip,
                originalUrl: req.originalUrl,
                raw: req.headers.authorization
            }
        });
        return next(BACKOFFICE_TOKEN_REQUIRED);
    };

    return next();
};