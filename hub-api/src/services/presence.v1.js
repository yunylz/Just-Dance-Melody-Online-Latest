const axios = require("axios");
const config = require("../config");
const { tokenRequired } = require("../lib/session-client");
const presence = require("../lib/presence");

module.exports = (app, publicRouter, privateRouter, logger) => {
  /**
   * @route GET /presence/v1/status
   * @description Returns the current player's Rich Presence state.
   *                Requires a valid session token or S2S token.
   *                The desktop app should poll this every ~5 seconds.
   * @returns {Object} Presence state object.
   */
  publicRouter.get("/status", tokenRequired, async (req, res, next) => {
    try {
      // userId comes from the session (set by tokenRequired middleware)
      // For S2S requests, the caller must pass ?userId=<uuid>
      const userId = req.query.userId || req.userId;

      if (!userId) {
        return res.status(400).json({
          online: false,
          state: "Missing userId",
          details: null,
        });
      }

      const state = await presence.getPresence(userId);

      return res.json(state);
    } catch (err) {
      logger.error({ message: "Presence error", error: err.message });
      
      return res.status(500).json({
        online: false,
        state: "Error",
        details: err.message,
      });
    }
  });
};