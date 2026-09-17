const axios = require("axios");
const config = require("../../config");

/**
 * @typedef {Object} PatreonTokenResponse
 * @property {string} access_token  - OAuth2 access token (expires)
 * @property {string} refresh_token - Refresh token (use to renew the access token)
 * @property {number} expires_in    - Seconds until the access token expires
 * @property {string} token_type    - Always "Bearer"
 * @property {string} scope         - Space-separated list of granted scopes
 */

/**
 * @typedef {Object} PatreonMembership
 * @property {string|null} patron_status                  - e.g. "active_patron", "declined_patron", "former_patron", or null
 * @property {number}      currently_entitled_amount_cents - Amount in cents the patron is entitled to (0 if not active)
 * @property {string|null} last_charge_status             - e.g. "Paid", "Declined", "Deleted", "Pending", "Refunded", or null
 * @property {string|null} last_charge_date               - ISO 8601 date string of the last charge attempt, or null
 */

/**
 * @typedef {Object} PatreonUser
 * @property {string}      id         - Patreon user ID
 * @property {string}      email      - User's email address
 * @property {string}      full_name  - User's full name
 * @property {string|null} image_url  - URL of the user's profile image, or null
 * @property {string|null} thumb_url  - URL of the user's thumbnail image, or null
 * @property {string|null} vanity     - User's vanity name (Patreon username), or null
 * @property {string|null} url        - URL of the user's Patreon page, or null
 * @property {string|null} about      - User's bio, or null
 * @property {PatreonMembership|null} membership - Membership to YOUR campaign, or null if not a member
 */

/**
 * Patreon OAuth2 helper module.
 *
 * Handles authorization URL generation, token exchange, token refresh,
 * user profile fetching, and subscription status checking.
 *
 * Typical flow:
 *  1. Redirect user to `getAuthorizationUrl(state)`
 *  2. On callback, call `getAccessToken(code)` and store the tokens
 *  3. Call `getUserProfile(accessToken)` to fetch identity + membership
 *  4. Call `isSubscribed(accessToken)` to check if they're a paying patron
 *  5. Persist `refresh_token` and call `refreshAccessToken()` before tokens expire
 *
 * @namespace Patreon
 */
const Patreon = {
    /**
     * Returns the Patreon OAuth2 authorization URL to redirect the user to.
     *
     * Scopes requested:
     *  - `identity`        — basic profile info (name, avatar, etc.)
     *  - `identity[email]` — user's email address
     *  - `identity.memberships` - user's membership to your campaign (patron_status, etc.)
     *
     * @param {string} [state] - Optional CSRF/session state token. Will be returned
     *                           by Patreon on the callback so you can verify the request.
     * @returns {string} Full authorization URL to redirect the user to.
     *
     * @example
     * const url = Patreon.getAuthorizationUrl("some-csrf-token");
     * res.redirect(url);
     */
    getAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: config.PATREON.CLIENT_ID,
            redirect_uri: config.PATREON.REDIRECT_URI,
            response_type: "code",
            scope: "identity identity[email] identity.memberships"
        });

        // Do NOT manually encode the state — URLSearchParams handles encoding
        if (state) params.set("state", state);

        return `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
    },

    /**
     * Exchanges an authorization code (from the OAuth callback) for access/refresh tokens.
     *
     * @param {string} code - The `code` query parameter from the Patreon OAuth callback.
     * @returns {Promise<PatreonTokenResponse>} Token data — store both `access_token` and
     *                                          `refresh_token` against the user in your DB.
     * @throws {Error} If the token exchange fails (e.g. code already used, invalid client secret).
     *
     * @example
     * const tokens = await Patreon.getAccessToken(req.query.code);
     * // Save tokens.access_token and tokens.refresh_token to DB
     */
    async getAccessToken(code) {
        const response = await axios.post(
            "https://www.patreon.com/api/oauth2/token",
            new URLSearchParams({
                client_id: config.PATREON.CLIENT_ID,
                client_secret: config.PATREON.CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: config.PATREON.REDIRECT_URI
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        return response.data;
    },

    /**
     * Refreshes an expired (or expiring) access token using a stored refresh token.
     *
     * Patreon access tokens expire — call this before making API calls if the stored
     * token is near expiry, or when you receive a 401 response. Store the new
     * `access_token` and `refresh_token` returned (refresh tokens also rotate).
     *
     * @param {string} refreshToken - The `refresh_token` previously stored for this user.
     * @returns {Promise<PatreonTokenResponse>} Fresh token data — update BOTH tokens in your DB.
     * @throws {Error} If the refresh token is invalid or has been revoked.
     *
     * @example
     * const tokens = await Patreon.refreshAccessToken(user.patreonRefreshToken);
     * await db.users.update(user.id, {
     *   patreonAccessToken: tokens.access_token,
     *   patreonRefreshToken: tokens.refresh_token,
     * });
     */
    async refreshAccessToken(refreshToken) {
        const response = await axios.post(
            "https://www.patreon.com/api/oauth2/token",
            new URLSearchParams({
                client_id: config.PATREON.CLIENT_ID,
                client_secret: config.PATREON.CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        return response.data;
    },

    /**
     * Fetches the authenticated user's Patreon profile, including their membership
     * status to YOUR campaign (if they have one).
     *
     * The returned `membership` field will be `null` if the user has never pledged
     * to your campaign. If they have pledged (including lapsed/declined patrons),
     * it will contain `patron_status`, `currently_entitled_amount_cents`, etc.
     *
     * @param {string} accessToken - The user's OAuth2 access token.
     * @returns {Promise<PatreonUser>} Normalised user object with nested `membership`.
     * @throws {Error} If the access token is invalid, expired, or the request fails.
     *
     * @example
     * const user = await Patreon.getUserProfile(accessToken);
     * console.log(user.full_name);               // "Jane Doe"
     * console.log(user.membership?.patron_status); // "active_patron"
     */
    async getUserProfile(accessToken) {
        const url =
            "https://www.patreon.com/api/oauth2/v2/identity" +
            "?include=memberships" +
            "&fields[user]=about,email,full_name,image_url,thumb_url,url,vanity" +
            "&fields[member]=patron_status,currently_entitled_amount_cents,last_charge_status,last_charge_date";

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { data, included } = response.data;

        // Extract membership from the JSON:API `included` array (type: "member")
        // This will only contain the user's membership to YOUR campaign — not others —
        // because we did not request the `identity.memberships` scope (which would return all).
        const membershipResource = included?.find((r) => r.type === "member") ?? null;

        /** @type {PatreonMembership|null} */
        const membership = membershipResource
            ? {
                  patron_status: membershipResource.attributes.patron_status ?? null,
                  currently_entitled_amount_cents:
                      membershipResource.attributes.currently_entitled_amount_cents ?? 0,
                  last_charge_status:
                      membershipResource.attributes.last_charge_status ?? null,
                  last_charge_date:
                      membershipResource.attributes.last_charge_date ?? null
              }
            : null;

        /** @type {PatreonUser} */
        return {
            id: data.id,
            email: data.attributes.email ?? null,
            full_name: data.attributes.full_name ?? null,
            image_url: data.attributes.image_url ?? null,
            thumb_url: data.attributes.thumb_url ?? null,
            vanity: data.attributes.vanity ?? null,
            url: data.attributes.url ?? null,
            about: data.attributes.about ?? null,
            membership
        };
    },

    /**
     * Checks whether a user is an active, paying patron of YOUR campaign.
     *
     * A user is considered subscribed if:
     *  - They have a membership record on your campaign
     *  - Their `patron_status` is `"active_patron"`
     *  - Their last charge status is `"Paid"` (i.e. their most recent payment went through)
     *
     * Declined, lapsed, or former patrons will return `false`.
     *
     * @param {string} accessToken - The user's OAuth2 access token.
     * @returns {Promise<boolean>} `true` if the user is an active paying patron, `false` otherwise.
     * @throws {Error} If the access token is invalid, expired, or the request fails.
     *
     * @example
     * const subscribed = await Patreon.isSubscribed(accessToken);
     * if (!subscribed) return res.status(403).json({ error: "Patreon subscription required." });
     */
    async isSubscribed(accessToken) {
        const user = await Patreon.getUserProfile(accessToken);
        const { membership } = user;

        if (!membership) return false;

        return (
            membership.patron_status === "active_patron" &&
            (membership.last_charge_status === "Paid" || membership.last_charge_status === null)
        );
    },

    /**
     * Checks whether a user is subscribed using a stored refresh token.
     *
     * Useful for background/server-side re-checks where the original access token
     * may have expired. Automatically refreshes the access token, checks subscription
     * status, and returns both the result and fresh tokens to be saved back to the DB.
     *
     * @param {string} refreshToken - The user's stored refresh token.
     * @returns {Promise<{ subscribed: boolean, tokens: PatreonTokenResponse }>}
     *   `subscribed` — whether the user is an active patron.
     *   `tokens`     — fresh access/refresh tokens (save both back to your DB).
     * @throws {Error} If the refresh token is invalid or the API request fails.
     *
     * @example
     * const { subscribed, tokens } = await Patreon.isSubscribedWithRefresh(user.patreonRefreshToken);
     * await db.users.update(user.id, {
     *   patreonAccessToken: tokens.access_token,
     *   patreonRefreshToken: tokens.refresh_token,
     *   isPatron: subscribed,
     * });
     */
    async isSubscribedWithRefresh(refreshToken) {
        const tokens = await Patreon.refreshAccessToken(refreshToken);
        const subscribed = await Patreon.isSubscribed(tokens.access_token);
        return { subscribed, tokens };
    }
};

module.exports = Patreon;