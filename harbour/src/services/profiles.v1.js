const games = require("../lib/games");
const { ticketRequired } = require("../lib/ticket-client");
const hubHelper = require("../lib/hub-helper");
const config = require("../config");
const utils = require("../lib/utils");

/**
 * Profiles (v1) (legacy)
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    publicRouter.get("/me", ticketRequired, async (req, res) => {
        let profile = await games.getProfile(req.userId);
        if (!profile) {
            // Create a stub profile if it doesn't exist
            profile = {
                profileId: req.profileId,
                userId: req.userId,
                platformType: req.platform || "switch",
                idOnPlatform: req.userId.substring(0, 16),
                nameOnPlatform: "User_" + req.userId.substring(0, 8)
            };
        }
        return res.json(profile);
    });

    publicRouter.get("/me/populations", ticketRequired, async (req, res) => {
        const spaceIds = (req.query.spaceIds || "").split(",").filter(Boolean);
        let populations = await games.getPopulations(spaceIds);

        // Remove subject == "StagingRedirection" if exists
        populations = populations.filter(p => p.subject !== "StagingRedirection" && p.subject !== "Redirection");

        const jmcsEnv = req.jmcsEnv || "prod";
        const jmcsFqdnData = utils.getJmcsFqdnData(jmcsEnv);

        const jmcsPopulation = {
            name: jmcsEnv,
            subject: "Redirection",
            obj: jmcsFqdnData,
            spaceId: spaceIds[0],
            assignmentTime: new Date().toISOString()
        };

        // Map populations to the format requested
        const result = [...populations, jmcsPopulation].map(p => ({
            name: p.name,
            subject: p.subject,
            obj: p.obj,
            spaceId: p.spaceId,
            assignmentTime: p.assignmentTime || p.createdAt
        }));

        return res.json({ populations: result });
    });

    // TODO: investigate how this works
    publicRouter.put("/me/populations/data", ticketRequired, async (req, res) => {
        return res.send({
            "populations": []
        })
    })

    publicRouter.get("/:profileId/actions", ticketRequired, async (req, res) => {
        const { profileId } = req.params;
        const { spaceId } = req.query;
        if (!spaceId) return res.status(400).json({ error: "spaceId required" });

        const actions = await games.getActions(spaceId);

        // Map to response format
        const result = actions.map(a => ({
            ...a,
            profileId,
            isCompleted: true, // Default to true for now
            completionDate: new Date().toISOString()
        }));

        return res.json({ actions: result });
    });

    publicRouter.get("/:profileId/rewards", ticketRequired, async (req, res) => {
        const { profileId } = req.params;
        const { spaceId } = req.query;
        if (!spaceId) return res.status(400).json({ error: "spaceId required" });

        const rewards = await games.getRewards(spaceId);

        // Map to response format
        const result = rewards.map(r => ({
            ...r,
            profileId,
            isOwned: true, // Default to true for now
            purchaseDate: new Date().toISOString()
        }));

        return res.json({ rewards: result });
    });

    publicRouter.get("/me/friends", ticketRequired, async (req, res) => {
        let user = await hubHelper.getUser({
            userId: req.userId
        });
        if (!user) return res.send({
            friends: []
        });

        const friends = user?.friends || [];

        // TODO: what response does it want?

        res.json({ friends: [] })
    });


    // Stubs for other endpoints
    publicRouter.get("/:userId/actions", (req, res) => res.json({ actions: [] }));
    publicRouter.put("/:userId/actions", (req, res) => res.json({}));
    publicRouter.post("/:userId/events", (req, res) => res.json({}));
    publicRouter.put("/:userId/events", (req, res) => res.json({}));
};