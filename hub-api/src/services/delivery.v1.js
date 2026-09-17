const { APP_NOT_FOUND } = require("../lib/http-codes");
const delivery = require("../lib/delivery");

module.exports = (app, publicRouter, privateRouter, logger) => {
    publicRouter.get("/:app/latest", async (req, res, next) => {
        try {
            const payload = await delivery.getLatestRelease(req.params.app);
            return res.json(payload);
        } catch (error) {
            if (error.status === 404) {
                return next(APP_NOT_FOUND);
            }

            return next(error);
        }
    });
};
