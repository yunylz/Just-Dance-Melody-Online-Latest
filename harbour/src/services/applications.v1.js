const { ticketRequired, s2sTicketRequired } = require("../lib/ticket-client");
const apps = require("../lib/games");

/**
 * Applications (v1)
 *
 * Exposes application metadata — app IDs, names, platforms, and
 * platform-specific configuration. All routes require a valid Harbour ticket.
 * The list route additionally requires an S2S token.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    /**
     * List all registered applications. Filterable by `?appId=`, `?name=`, `?platform=`.
     * GET /v1/applications
     */
    publicRouter.get("/", ticketRequired, s2sTicketRequired, async (req, res, next) => {
        try {
            const { appId, name, platform } = req.query;
            const allApps = await apps.getAllApps();

            return res.json({
                applications: allApps.filter(a => {
                    if (appId    && a.applicationId !== appId)                           return false;
                    if (name     && !a.name.toLowerCase().includes(name.toLowerCase())) return false;
                    if (platform && a.platform.toLowerCase() !== platform.toLowerCase()) return false;
                    return true;
                })
            });
        } catch (err) {
            return next(err);
        }
    });

    /**
     * Get a single application by its ID.
     * GET /v1/applications/:appId
     */
    publicRouter.get("/:appId", ticketRequired, async (req, res, next) => {
        try {
            const application = await apps.getApp(req.params.appId);
            return res.json(application);
        } catch (err) {
            return next(err);
        }
    });

    /**
     * Get the platform configuration object for an application.
     * GET /v1/applications/:appId/configuration
     */
    publicRouter.get("/:appId/configuration", ticketRequired, async (req, res, next) => {
        try {
            const configuration = await apps.getConfiguration(req.params.appId);
            return res.json({ configuration });
        } catch (err) {
            return next(err);
        }
    });

    /**
     * Get configuration parameters for an application.
     * GET /v1/applications/:appId/parameters
     */
    publicRouter.get("/:appId/parameters", ticketRequired, async (req, res, next) => {
        try {
            const parameters = await apps.getParameters(req.params.appId);
            return res.json(parameters);
        } catch (err) {
            return next(err);
        }
    });

};