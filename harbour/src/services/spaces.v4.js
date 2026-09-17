const games = require("../lib/games");
const { ticketRequired } = require("../lib/ticket-client");

module.exports = (app, publicRouter, privateRouter, logger) => {

    publicRouter.get("/:spaceId/configs/events", ticketRequired, async (req, res, next) => {
        try {
            const spaceId = req.params.spaceId;
            const space = await games.getSpace(spaceId);
            if (!space) return res.status(404).json({ message: "Space not found" });

            const events = await games.getConfigEvents(spaceId);

            return res.json({
                ...events
            });
        } catch (err) {
            return next(err);
        }
    });
};