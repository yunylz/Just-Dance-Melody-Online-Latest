const { execSync } = require("child_process");
const config = require("../config");
const session = require("../lib/session");

function getGitInfo() {
    try {
        return {
            commitHash: execSync("git rev-parse HEAD").toString().trim(),
            branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
            tag: execSync("git describe --tags --always").toString().trim(),
        };
    } catch (e) {
        return {
            commitHash: null,
            branch: null,
            tag: null,
        };
    }
}

module.exports = (app, publicRouter, privateRouter, logger) => {
    const Users = require("../lib/users");
    const { tokenRequired } = require("../lib/session-client");

    /**
     * @route GET /ping
     * @description Checks if the server is running. If authenticated, updates online status.
     * @returns {Object} Status object.
     */
    publicRouter.get("/ping", async (req, res, next) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith("Bearer ")) {
            const token = auth.split(" ")[1];
            const { verified, payload } = session.verifySession(token);
            if (verified) {
                // Update status in background, don't block the response
                Users.updateLastPing(payload.uid).catch(err => logger.error({ err, msg: "Failed to update last ping" }));
            }
        }
        res.send({ status: "ok" });
    });

    /**
     * @route GET /info
     * @description Gets information about the server.
     * @returns {Object} Server information.
     */
    privateRouter.get("/info", async (req, res, next) => {
        const bootTime = new Date(Date.now() - process.uptime() * 1000).toISOString();
        const gitInfo = getGitInfo();

        res.send({
            env: config.ENV,
            version: config.VERSION,
            bootTime,
            bootTimeEpoch: new Date(bootTime).getTime(),
            ...gitInfo,
        });
    });

    /**
     * @route GET /errors
     * @description Gets list of HTTP codes.
     * @returns {Array} List of HTTP codes.
     */
    publicRouter.get("/errors", (req, res, next) => {
        return res.send(require("../lib/http-codes"))
    });
};
