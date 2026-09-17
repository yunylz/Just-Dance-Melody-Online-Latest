const { verifyAppByHeader, verifyUserAgent, verifyBuildId, verifyAuth } = require("../lib/middleware");
const hubHelper = require("../lib/hub-helper");
const { ticketRequired } = require("../lib/ticket-client");
const { UNAUTHORIZED, USER_NOT_ON_HUB } = require("../lib/http-codes");

/**
 * Users (v2)
 *
 * Exposes Hub user information. A user may only query their own record
 * unless the request carries an S2S ticket.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * Get Hub user info for a given userId.
     * Users can only fetch their own record; S2S tokens may fetch any user.
     * GET /v2/users/:userId
     */
    publicRouter.get("/:userId", ticketRequired, async (req, res, next) => {
        const { userId } = req.params;

        if (userId !== req.userId && !req.isS2s) return next(UNAUTHORIZED);

        const hubUser = await hubHelper.getUser({ userId });
        if (!hubUser) {
            logger.warn({ message: "User not found on Hub", details: { userId } });
            return next(USER_NOT_ON_HUB);
        }

        return res.json(hubUser);
    });

};