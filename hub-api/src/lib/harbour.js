const axios = require("axios");

const config = require("../config");

const { createLogger } = require("./logger");
const logger = createLogger({ service: "harbour-lib" });

class Harbour {
  constructor() {
    this.cachedToken = null;
    this.tokenExpiration = null;
    this.client = axios.create({
      baseURL: config.HARBOUR.FQDN,
      headers: {
        Authorization: `Bearer ${config.HARBOUR.TOKEN}`
      }
    });
  }

  /**
   * Verifies the given verification code with Harbour.
   * @param {String} code Verification code
   * @returns {Object}
   */
  async checkVerificationCode(code) {
    try {
      const { data } = await this.client.get(`/v1/backoffice/verify-code?code=${code}`);
      const { session, usSession } = data;

      return {
        success: true, session, usSession
      };
    }
    catch (err) {
      if (err?.response?.data?.errorCode === 23) {
        logger.warn({
          message: "Code session not found",
          details: { code, harbourError: err.response.data }
        });
        return { success: false };
      };

      logger.warn({
        message: "Unknown error occured with Harbour while trying to verify code",
        details: {
          code,
          error: err.message
        }
      });
      return {
        success: false
      };
    }
  };

  /**
   * Fetches the latest tracking batch for a user from Harbour.
   * Returns the full tracking document (events array + metadata).
   * @param {String} userId Hub user UUID
   * @param {String} [spaceId] Optional game/product space UUID
   * @returns {Promise<Object|null>} Tracking document or null if 404
   */
  async getLatestTracking(userId, spaceId) {
    try {
      let url = `/v1/backoffice/events/latest?userId=${encodeURIComponent(userId)}`;
      if (spaceId) url += `&spaceId=${encodeURIComponent(spaceId)}`;

      const { data } = await this.client.get(url);
      return data;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      logger.error({
        message: "Failed to fetch latest tracking from Harbour",
        details: { userId, error: err.message }
      });
      return null;
    }
  }

  /**
   * Fetches only the latest (most recent) single tracking event for a user from Harbour.
   * This is the preferred endpoint for Discord RPC — one call gives you exactly
   * what's happening right now.
   * @param {String} userId Hub user UUID
   * @param {String} [spaceId] Optional game/product space UUID
   * @returns {Promise<Object|null>} The event with the highest seqId, or null if no data
   */
  async getLatestEvent(userId, spaceId) {
    try {
      let url = `/v1/backoffice/events/latest-event?userId=${encodeURIComponent(userId)}`;
      if (spaceId) url += `&spaceId=${encodeURIComponent(spaceId)}`;

      const { data } = await this.client.get(url);
      return data;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      logger.error({
        message: "Failed to fetch latest event from Harbour",
        details: { userId, error: err.message }
      });
      return null;
    }
  }
};

module.exports = new Harbour();