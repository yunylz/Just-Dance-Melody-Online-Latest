/**
 * Gateway (v1)
 *
 * Provides gateway-level configuration consumed by clients on startup.
 * Currently only exposes CORS domain allowlists.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    publicRouter.get("/ping", (req, res) => {
        return res.json({ message: "pong" });
    });

    /**
     * Return the list of allowed CORS domains. Currently returns an empty
     * array — extend this when client-side CORS enforcement is needed.
     * GET /v1/gateway/configuration/cors
     */
    publicRouter.get("/configuration/cors", (req, res) => {
        return res.json({ domains: [] });
    });

};