const axios = require("axios");

const config = require("../config");
const utils = require("./utils");
const { createLogger } = require("./logger");

const logger = createLogger({ service: "hub-helper" })

class HubHelper {
    constructor() {
        this.CONF = config.HUB;
        this.FQDN = config.HUB.API_FQDN; // Default to localhost for testing
        this.HEADERS = {
            Authorization: `Bearer ${this.CONF.S2S_TOKEN}`,
            "Content-Type": "application/json",
            [this.CONF.AUTH_BYPASS_HEADER]: this.CONF.AUTH_BYPASS_VALUE
        }
    };

    async login(email, password, rememberMe = false) {
        try {
            const { data } = await axios.post(`${this.FQDN}/auth/v1/session`, {
                email,
                password,
                rememberMe
            }, {
                headers: this.HEADERS
            });
            return data;
        }
        catch (error) {
            console.error("Failed to login:", error);
            return null;
        }
    };

    async getJDConstants() {
        try {
            const { data } = await axios.get(`${this.FQDN}/jmcs/v1/constants`, {
                headers: this.HEADERS
            });
            return data.constants;
        } catch (error) {
            console.error("Failed to get JD constants:", error.message);
            return null;
        }
    }

    async getUser(query = {}) {
        try {
            const { data } = await axios.get(`${this.FQDN}/users/v1`, {
                params: query,
                headers: this.HEADERS
            });
            let user = data.length > 0 ? data[0] : null;

            if (user && user.accountType) user.accountType = "Ubisoft";

            if (user && user.profiles && user.profiles.length > 0) {
                user.profiles = user.profiles.map(p => ({
                    ...p,
                    platformType: utils.getPlatformType(p?.platformType)
                }));
            };

            return user;
        }
        catch (error) {
            console.log(error)
            console.error("Failed to get user:", error.message);
            return null;
        }
    };

    async getUsers(query = {}) {
        try {
            const { data } = await axios.get(`${this.FQDN}/users/v1`, {
                params: query,
                headers: this.HEADERS
            });
            return data;
        }
        catch (error) {
            console.error("Failed to get user:", error.message);
            return null;
        }
    };

    async getProfile(userId, platform) {
        try {
            const { data } = await axios.get(`${this.FQDN}/users/v1/${userId}/profiles/${platform}`, {
                headers: this.HEADERS
            });
            return Object.keys(data).length > 0 ? data : null;
        }
        catch (error) {
            console.error("Failed to get user:", error.message);
            return null;
        }
    };

    async updateProfile(userId, platform, data = {}) {
        try {
            const res = await axios.patch(
                `${this.FQDN}/users/v1/${userId}/profiles/${platform}`,
                data,
                { headers: this.HEADERS }
            );
            return res.data;
        } catch (error) {
            console.error("Failed to update user profile:", error.message);
            return null;
        }
    };

    async ensureUplayAccountLinked({ profileId, userId, nameOnPlatform, platformType }) {
        try {
            // Check if the user already has a uPlay account linked in Hub
            const user = await this.getUser({ userId });
            const hasUplayLinked = user && user.profiles && user.profiles.some(p => p.platformType === "uplay");

            if (hasUplayLinked) {
                logger.info(`User ${nameOnPlatform} (${profileId}) already has a uPlay account linked in Hub.`);
                return;
            }

            // If not, create a new uPlay profile for the user in Hub
            const uplayProfileData = {
                username: `${nameOnPlatform}`, // You may want to adjust the naming convention
                platform: "uplay",
                idOnPlatform: userId,
            };

            await this.createProfile(userId, uplayProfileData);
            logger.info(`Created and linked uPlay account for user ${nameOnPlatform} (${profileId}) in Hub.`);
        } catch (error) {
            logger.error({
                message: "Failed to ensure uPlay account is linked",
                details: {
                    error: error.message,
                    profileId,
                    userId,
                    nameOnPlatform,
                    platformType
                }
            });
        }
    };

    async createUplayProfile(userId, profileData = {
        username: "Unknown",
        platform: "uplay",
        idOnPlatform: "",
    }) {
        try {
            const res = await axios.post(
                `${this.FQDN}/users/v1/${userId}/profiles`,
                profileData,
                { headers: this.HEADERS }
            );
            // The hub returns { profiles: [...] } — find the one we just created
            const profiles = res.data?.profiles;
            if (Array.isArray(profiles)) {
                return profiles.find(p => p.platformType === profileData.platform) || null;
            }
            return null;
        } catch (error) {
            logger.error("Failed to create uPlay profile:", error.message);
            return null;
        }
    }

    /**
     * Verifies a PC crack ticket by forwarding it to the Hub's
     * `/auth/v1/verify-ticket` endpoint.
     *
     * The Hub will decrypt the `JDMO:<encrypted>` ticket, validate the auth
     * file password and expiry, and return the user's `UserId`, `Username`,
     * and `Email`.
     *
     * @param {string} ticket - The full ticket string (`JDMO:<encrypted>`).
     * @returns {Promise<Object|null>} The Hub response object, or `null` on failure.
     */
    async verifyTicket(ticket) {
        try {
            const { data: result } = await axios.post(
                `${this.FQDN}/auth/v1/verify-ticket`,
                { ticket },
                { headers: this.HEADERS }
            );
            return result;
        } catch (error) {
            logger.error({
                message: "Failed to verify ticket on Hub",
                details: { error: error.message, status: error.response?.status }
            });
            return null;
        }
    }

    /**
     * Lightweight Hub connectivity check.
     * @returns {Promise<boolean>} true if the Hub responds, false otherwise.
     */
    async ping() {
        try {
            const { status } = await axios.get(
                `${this.FQDN}/status/v1/ping`,
                { headers: this.HEADERS, timeout: 5000 }
            );
            return status === 200;
        } catch (error) {
            logger.error({
                message: "Hub ping failed",
                details: { error: error.message }
            });
            return false;
        }
    }
};

module.exports = new HubHelper();