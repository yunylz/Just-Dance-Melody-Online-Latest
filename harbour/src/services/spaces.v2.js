const games = require("../lib/games");
const { ticketRequired } = require("../lib/ticket-client");

/**
 * Spaces (v2)
 *
 * Provides entity data for game spaces (installments).
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * Return the global entities list (legacy — all entities regardless of space).
     * GET /entities
     */
    publicRouter.get("/entities", ticketRequired, async (req, res, next) => {
        try {
            const entities = await games.getEntities(null);
            return res.json({ entities });
        } catch (err) {
            return next(err);
        }
    });

    /**
     * Return entities for a specific space.
     * GET /:spaceId/entities
     */
    publicRouter.get("/:spaceId/entities", ticketRequired, async (req, res, next) => {
        try {
            const entities = await games.getEntities(req.params.spaceId);
            return res.json({ entities });
        } catch (err) {
            return next(err);
        }
    });

    publicRouter.get("/:spaceId/configs/events", ticketRequired, async (req, res, next) => {
        try {
            const spaceId = req.params.spaceId;
            const space = await games.getSpace(spaceId);
            if (!space) return res.status(404).json({ message: "Space not found" });

            const events = await games.getConfigEventsV2(spaceId);

            return res.json({
                config: events
            });
        } catch (err) {
            return next(err);
        }
    });

};