const axios = require("axios");
const config = require("../../config");

/**
 * Discord OAuth2 helper module.
 * Handles authorization URL generation, token exchange, and user profile fetching.
 */
const Discord = {
    /**
     * Returns the Discord OAuth2 authorization URL.
     * @param {string} [state] - Optional state parameter (e.g., a session token for linking)
     * @param {string} [redirectUri] - Optional redirect URI override (for desktop deep-link flow)
     * @returns {string} Authorization URL
     */
    getAuthorizationUrl(state, redirectUri = config.DISCORD.REDIRECT_URI) {
        const params = new URLSearchParams({
            client_id: config.DISCORD.CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "identify email"
        });
        if (state) params.set("state", encodeURIComponent(state));
        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    },

    /**
     * Exchanges an authorization code for an access token.
     * @param {string} code - Authorization code from Discord callback
     * @param {string} [redirectUri] - Optional redirect URI override (for desktop deep-link flow)
     * @returns {Promise<Object>} Token response data (contains access_token, etc.)
     */
    async getAccessToken(code, redirectUri = config.DISCORD.REDIRECT_URI) {
        const response = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                client_id: config.DISCORD.CLIENT_ID,
                client_secret: config.DISCORD.CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        return response.data;
    },

    /**
     * Fetches the Discord user profile using an access token.
     * @param {string} accessToken - OAuth2 access token
     * @returns {Promise<Object>} Discord user object
     */
    async getUserProfile(accessToken) {
        const response = await axios.get("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return response.data;
    },

    /**
     * Checks whether a Discord user is a member of a specified guild (server).
     * Uses the Discord Bot token for authentication.
     * @param {string} discordUserId - The Discord user ID to check
     * @param {string} guildId - The Discord guild (server) ID
     * @param {string} botToken - The Discord Bot token
     * @returns {Promise<boolean>} Whether the user is a member of the guild
     */
    async isMemberOfGuild(discordUserId, guildId, botToken) {
        try {
            const response = await axios.get(
                `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            return response.status === 200;
        } catch (err) {
            if (err.response?.status === 404) return false;

            const guildName = config.PATREON?.DISCORD_SERVER_ID
                ? `guild ${guildId}`
                : guildId;
            throw new Error(`Failed to check Discord guild membership for ${guildName}: ${err.message}`);
        }
    }
};

module.exports = Discord;
