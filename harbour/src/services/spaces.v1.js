const games = require("../lib/games");
const { ticketRequired } = require("../lib/ticket-client");
const utils = require("../lib/utils");
const hubHelper = require("../lib/hub-helper");

/**
 * Spaces (v1)
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

    /**
     * Get configuration parameters for a space.
     * GET /v1/spaces/:spaceId/parameters
     */
    publicRouter.get("/:spaceId/parameters", ticketRequired, async (req, res, next) => {
        try {
            const jmcsEnv = req.jmcsEnv || "prod";
            let { parameters } = await games.getParameters(req.params.spaceId);

            if (parameters["jd-serverInfo"]) {
                parameters["jd-serverInfo"] = {
                    fields: utils.getJmcsFqdnData(jmcsEnv, false),
                    relatedPopulation: null
                };
            }

            if (parameters["jd-constantsJDVersion"]) {
                const constants = await hubHelper.getJDConstants();
                if (!constants) {
                    logger.warn("Failed to fetch JD constants, skipping JD version parameter");
                }
                else {
                    parameters["jd-constantsJDVersion"] = {
                        fields: {
                            Override: constants?.JDVersion?.Override || {}
                        },
                        relatedPopulation: null
                    }
                };
            };

            return res.json({
                parameters
            });
        } catch (err) {
            return next(err);
        }
    });

    /**
     * Get events definitions for a space.
     * GET /v1/spaces/:spaceId/eventsDefinitions
     */
    publicRouter.get("/:spaceId/eventsDefinitions", ticketRequired, async (req, res, next) => {
        try {
            const defs = await games.getEventsDefinitions(req.params.spaceId);
            return res.json(defs);
        } catch (err) {
            return next(err);
        }
    });
};