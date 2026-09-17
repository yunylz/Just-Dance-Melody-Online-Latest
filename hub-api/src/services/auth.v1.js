const crypto = require("crypto");
const uuid = require("uuid").v4;
const bcrypt = require("bcrypt");
const axios = require("axios");

const rateLimit = require("express-rate-limit");
const config = require("../config");
const {
    USERNAME_OR_EMAIL_USED,
    INTERNAL_SERVER_ERROR,
    USER_NOT_FOUND,
    INVALID_CREDENTIALS,
    INACTIVE_ACCOUNT,
    LOCKED_ACCOUNT,
    BANNED_ACCOUNT,
    EMAIL_NOT_VERIFIED,
    EMAIL_COOLDOWN,
    VALIDATION_ERROR,
    PASSWORD_UNKNOWN_ERROR,
    PASSWORD_RESET_EXPIRED,
    EMAIL_ALREADY_VERIFIED,
    PASSWORD_RESET_SUCCESSFUL,
    REGISTRATION_SUCCESSFUL,
    ACCOUNT_NOT_AVAILABLE,
    TOO_MANY_AUTH_ATTEMPTS,
    INVALID_REQUEST,
    UNAUTHORIZED,
    DISCORD_ALREADY_LINKED,
    DISCORD_NOT_FOUND,
    PATREON_ALREADY_LINKED,
    PATREON_NOT_FOUND,
    PATREON_AUTH_FAILED,
    USER_NOT_ON_SERVER,
    USER_DISCORD_NOT_CONNECTED,
    TWO_FACTOR_REQUIRED,
    INVALID_TWO_FACTOR_CODE,
    TWO_FACTOR_ALREADY_ENABLED,
    TWO_FACTOR_NOT_ENABLED,
    INVALID_AUTH_FILE,
    AUTH_FILE_EXPIRED,
    AUTH_FILE_PASSWORD_CHANGED,
    REGISTRATION_DISABLED
} = require("../lib/http-codes");
const session = require("../lib/session");
const { tokenRequired, emailVerifyTokenRequired, resetPassTokenRequired, twoFactorTokenRequired } = require("../lib/session-client");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../lib/auth-utils");
const utils = require("../lib/utils");
const token = require("../lib/token");
const authFile = require("../lib/auth-file");
const DiscordOAuth = require("../lib/oauth/discord");
const PatreonOAuth = require("../lib/oauth/patreon");
const User = require("../lib/models/user");

/**
 * Rate limiter for authentication endpoints (e.g., login) to prevent brute-force attacks.
 * Bypasses rate limiting if AUTH_SLOWDOWN_BYPASS_HEADER is present in request headers.
 */
const authLimiter = rateLimit({
    windowMs: config.AUTH_RATE_LIMIT_WINDOW, // e.g., 15 minutes
    max: config.AUTH_RATE_LIMIT_MAX, // e.g., 5 attempts
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Limiter is always bypassed on local environments
        if (utils.isLocal()) return true;

        // Bypass rate limiting if the bypass header is present and matches expected value
        if (config.AUTH_SLOWDOWN_BYPASS_HEADER && config.AUTH_SLOWDOWN_BYPASS_VALUE) {
            const headerValue = req.headers[config.AUTH_SLOWDOWN_BYPASS_HEADER.toLowerCase()];
            const doesMatch = headerValue === config.AUTH_SLOWDOWN_BYPASS_VALUE;
            if (doesMatch) req.isBypassing = true;
            return doesMatch;
        }
        return false;
    },
    handler: (req, res, next) => {
        return next(TOO_MANY_AUTH_ATTEMPTS);
    }
});

/**
 * Rate limiter for general endpoints (e.g., register, forgot-password) to limit request volume.
 * Bypasses rate limiting if AUTH_SLOWDOWN_BYPASS_HEADER is present in request headers.
 */
const generalLimiter = rateLimit({
    windowMs: config.GENERAL_RATE_LIMIT_WINDOW, // e.g., 15 minutes
    max: config.GENERAL_RATE_LIMIT_MAX, // e.g., 10 requests
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Bypass rate limiting if the bypass header is present and matches expected value
        if (config.AUTH_SLOWDOWN_BYPASS_HEADER && config.AUTH_SLOWDOWN_BYPASS_VALUE) {
            const headerValue = req.headers[config.AUTH_SLOWDOWN_BYPASS_HEADER.toLowerCase()];
            return headerValue === config.AUTH_SLOWDOWN_BYPASS_VALUE;
        }
        // Limiter is bypassed on local environments
        if (utils.isLocal()) return true;
        return false;
    },
    handler: (req, res, next) => {
        if (!utils.isLocal()) {
            return next(TOO_MANY_AUTH_ATTEMPTS);
        };
    }
});

module.exports = (app, publicRouter, privateRouter, logger) => {
    const Users = require("../lib/users");

    /**
     * @route GET /auth/v1/reset-password
     * @description Renders the password reset page with the provided token.
     * @param {string} req.query.token - Password reset token
     * @returns {HTML} Renders reset-password.ejs with success or error message in modal
     */
    publicRouter.get("/reset-password", (req, res, next) => {
        resetPassTokenRequired(req, res, (err) => {
            if (err) {
                // Middleware rejected token
                let message = "An error occurred.";
                if (err === PASSWORD_UNKNOWN_ERROR || err === PASSWORD_RESET_EXPIRED) {
                    message = "Invalid or expired token. Please request a new password reset link.";
                }
                return res.render("reset-password", {
                    token: req.query.token || "",
                    showModal: true,
                    success: false,
                    message
                });
            }

            // Middleware passed → valid token
            return res.render("reset-password", {
                token: req.query.token,
                showModal: false,
                success: false,
                message: ""
            });
        });
    });


    /**
     * @route POST /auth/v1/reset-password
     * @description Resets the user's password using the provided token and new password.
     * @param {string} req.query.token - Password reset token
     * @param {Object} req.body - Request body
     * @param {string} req.body.newPassword - New password
     * @returns {HTML} Renders reset-password.ejs with success or error message in modal
     */
    publicRouter.post("/reset-password", (req, res, next) => {
        resetPassTokenRequired(req, res, async (err) => {
            if (err) {
                let message = "An error occurred.";
                if (err === PASSWORD_UNKNOWN_ERROR || err === PASSWORD_RESET_EXPIRED) {
                    message = "Invalid or expired token. Please request a new password reset link.";
                }
                return res.render("reset-password", {
                    token: req.query.token || "",
                    showModal: true,
                    success: false,
                    message
                });
            }

            try {
                const { newPassword } = req.body;
                const email = req.email;

                const user = await Users.getUserByEmail(email);
                if (!user) {
                    return res.render("reset-password", {
                        token: req.query.token,
                        showModal: true,
                        success: false,
                        message: "User not found. Please request a new password reset link."
                    });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await Users.resetPassword(email, hashedPassword);

                return res.render("reset-password", {
                    token: req.query.token,
                    showModal: true,
                    success: true,
                    message: "Password reset successfully."
                });
            } catch (error) {
                return res.render("reset-password", {
                    token: req.query.token,
                    showModal: true,
                    success: false,
                    message: "An unknown error occurred while resetting your password."
                });
            }
        });
    });

    /**
     * @route GET /auth/v1/verify-email
     * @description Verifies the user's email using the provided token.
     * @param {string} req.query.token - Email verification token
     * @returns {HTML} Renders verify-email.ejs with success or error message
     */
    publicRouter.get("/verify-email", emailVerifyTokenRequired, async (req, res, next) => {
        try {
            const user = await Users.getUserByEmail(req.email);
            if (!user) {
                return res.render("verify-email", {
                    success: false,
                    message: "User not found.",
                    errorCode: "USER_NOT_FOUND"
                });
            }

            if (user.status.emailVerified) {
                return res.render("verify-email", {
                    success: false,
                    message: "Email already verified.",
                    errorCode: "ALREADY_VERIFIED"
                });
            }

            await Users.verifyEmail(user);

            return res.render("verify-email", {
                success: true,
                message: "Email verified successfully.",
                errorCode: null
            });
        } catch (err) {
            logger.error(`GET /verify-email error: ${err.message}`);

            let message = "An error occurred while verifying your email. Please try again.";
            let errorCode = "UNKNOWN_ERROR";

            if (err === PASSWORD_UNKNOWN_ERROR) {
                message = "An unknown error occurred. Please try requesting a new link.";
                errorCode = "UNKNOWN_ERROR";
            }
            if (err === PASSWORD_RESET_EXPIRED) {
                message = "Invalid or expired verification token. Please request a new link.";
                errorCode = "TOKEN_EXPIRED";
            }

            return res.render("verify-email", {
                success: false,
                message,
                errorCode
            });
        }
    });


    /**
     * @route POST /auth/v1/register
     * @description Registers a new user, creates an account, and sends an email verification link.
     * @param {Object} req.body - User details
     * @param {string} req.body.username - User's unique username (4-12 chars, alphanumeric)
     * @param {string} req.body.email - User's email address
     * @param {string} req.body.password - User's password
     * @param {string} req.body.firstName - User's first name
     * @param {string} req.body.lastName - User's last name
     * @param {string} req.body.country - User's country code
     * @param {string} req.body.dateOfBirth - User's date of birth (YYYY-MM-DD)
     * @param {boolean} req.body.acceptedTermsOfUse - Whether terms are accepted
     * @param {number} req.body.avatarId - User's avatar ID
     * @param {boolean} req.body.rememberMe - Whether to remember the session
     * @returns {Object} JSON response with success status
     */
    publicRouter.post("/register", generalLimiter, async (req, res, next) => {
        try {
            // Registration disabled for now
            return next(REGISTRATION_DISABLED);

            const { username, email, password, firstName, lastName, country, dateOfBirth, acceptedTermsOfUse, avatarId, rememberMe } = req.body;

            const existingUser = await Users.getUserByUsernameOrEmail(username, email);
            if (existingUser) {
                return next(USERNAME_OR_EMAIL_USED);
            }

            const userId = uuid();

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await Users.createUser({
                userId,
                username,
                email,
                nameOnPlatform: username,
                hashedPassword: hashedPassword,
                firstName,
                lastName,
                country,
                dateOfBirth,
                emailVerified: false,
                avatarId,
                hasAcceptedLegalOptins: acceptedTermsOfUse
            });

            await sendVerificationEmail(user, "verify-email");

            //const sessionData = await session.createSession(user, rememberMe);
            return res.json({
                ...REGISTRATION_SUCCESSFUL,
                emailVerificationSent: true
            });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/session
     * @description Authenticates a user and creates a session. Sends email verification if unverified.
     * @param {Object} req.body - Login credentials
     * @param {string} req.body.email - User's email address
     * @param {string} req.body.password - User's password
     * @param {boolean} [req.body.rememberMe] - Whether to create a long-lived session
     * @returns {Object} JSON response with session token or email verification prompt
     * @throws {INVALID_CREDENTIALS} If email or password is incorrect
     * @throws {INACTIVE_ACCOUNT} If account is inactive
     * @throws {LOCKED_ACCOUNT} If account is locked
     * @throws {BANNED_ACCOUNT} If account is banned
     * @throws {EMAIL_NOT_VERIFIED} If email needs verification
     * @throws {EMAIL_COOLDOWN} If verification email was recently sent
     * @throws {INTERNAL_SERVER_ERROR} If an unexpected error occurs
     */
    publicRouter.post("/session", authLimiter, async (req, res, next) => {
        const { email, password, isTauri } = req.body;
        if (isTauri !== undefined && typeof isTauri !== 'boolean') return next(INVALID_REQUEST);

        try {
            const user = await Users.getUserByEmail(email.toLowerCase().trim());
            if (!user) {
                await bcrypt.compare(password, "$2b$12$dummy.hash.to.prevent.timing.attacks");
                return next(INVALID_CREDENTIALS);
            };

            const isMatch = await bcrypt.compare(password, user.hashedPassword);
            if (!isMatch) {
                logger.warn(`${email} tried to login but failed due to invalid password.`);
                return next(INVALID_CREDENTIALS);
            };

            if (user.status.inactiveAccount) return next(INACTIVE_ACCOUNT);
            if (user.status.locked) return next(LOCKED_ACCOUNT);
            if (user.status.banned) return next(BANNED_ACCOUNT);
            if (user.status.testAccount && !req.isBypassing) return next(ACCOUNT_NOT_AVAILABLE)

            // Admins bypass email verification
            if (!user.status.emailVerified && !user.status.admin) {
                const now = Date.now();
                if (user.status.emailVerificationSentDate &&
                    now - user.status.emailVerificationSentDate < config.EMAIL_COOLDOWN) {
                    return next(EMAIL_COOLDOWN);
                }

                await sendVerificationEmail(user, "verify-email");
                return next(EMAIL_NOT_VERIFIED);
            }

            // Check 2FA requirement (bypassed when request comes from Harbour via S2S)
            const isStaff = user.status.admin || user.status.moderator;
            const requires2FA = (user.status.twoFactorEnabled || isStaff) && !utils.isLocal() && !req.isBypassing;

            if (requires2FA) {
                // Return a temporary 2FA token instead of a full session
                const tfaToken = token.generate({
                    uid: user.userId,
                    tfa: true,
                    setup: !user.status.twoFactorEnabled,
                    exp: Date.now() + (1000 * 60 * 10) // 10 minutes
                });

                return res.json({
                    success: true,
                    twoFactorRequired: true,
                    setupRequired: !user.status.twoFactorEnabled,
                    twoFactorToken: tfaToken,
                    userId: user.userId
                });
            }

            await Users.updateLastPing(user.userId);

            return res.json({
                success: true,
                session: session.createSession(user, req.body.isTauri === true)
            });

        } catch (err) {
            logger.error({ err, endpoint: "session", email: email?.toLowerCase()?.trim() });
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/forgot-password
     * @description Sends a password reset email to the user.
     * @param {Object} req.body - Request body
     * @param {string} req.body.email - User's email
     * @returns {Object} JSON response with success status
     */
    publicRouter.post("/forgot-password", generalLimiter, async (req, res, next) => {
        try {
            const { email } = req.body;
            const user = await Users.getUserByEmail(email);
            if (!user) {
                return next(USER_NOT_FOUND);
            }

            await sendResetPasswordEmail(user);
            return res.json(PASSWORD_RESET_SUCCESSFUL);
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR)
        }
    });

    /**
     * @route POST /auth/v1/resend-verification
     * @description Resends the email verification link to the user.
     * @param {Object} req.body - Request body
     * @param {string} req.body.email - User's email
     * @returns {Object} JSON response with success status
     */
    publicRouter.post("/resend-verification", generalLimiter, async (req, res, next) => {
        try {
            const { email } = req.body;
            const user = await Users.getUserByEmail(email);
            if (!user) {
                return next(USER_NOT_FOUND);
            }

            if (user.status.emailVerified) {
                return next(EMAIL_ALREADY_VERIFIED);
            }

            await sendVerificationEmail(email, user.username);
            return res.json({})
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /*
     * @route GET /auth/v1/discord
     * @description Redirects to Discord OAuth2 authorization page.
     * @param {string} req.query.token - Optional session token for linking
     */
    publicRouter.get("/discord", (req, res) => {
        const state = req.query.token ? encodeURIComponent(req.query.token) : "";
        res.redirect(DiscordOAuth.getAuthorizationUrl(state));
    });

    /*
     * @route GET /auth/v1/patreon
     * @description Redirects to Patreon OAuth2 authorization page.
     * @param {string} req.query.token - Optional session token for linking
     */
    publicRouter.get("/patreon", (req, res) => {
        const state = req.query.token ? encodeURIComponent(req.query.token) : "";
        res.redirect(PatreonOAuth.getAuthorizationUrl(state));
    });

    /**
     * @route GET /auth/v1/discord/callback
     * @description Handles Discord OAuth2 callback.
     *              The state param can be a JSON with { token, desktop } to control redirect destination.
     */
    publicRouter.get("/discord/callback", async (req, res, next) => {
        const { code, state } = req.query;
        if (!code) return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=no_code`);

        // Parse state to detect desktop mode and linking token
        let currentUserId = null;
        let isDesktop = false;

        if (state) {
            try {
                const stateData = JSON.parse(decodeURIComponent(state));
                isDesktop = stateData.desktop === true;
                if (stateData.token) {
                    const { verified, payload } = session.verifySession(stateData.token);
                    if (verified) currentUserId = payload.uid;
                }
            } catch {
                // Legacy state format: just a raw session token
                const { verified, payload } = session.verifySession(decodeURIComponent(state));
                if (verified) currentUserId = payload.uid;
            }
        }

        // Determine redirect base URL (custom scheme for desktop, web URL otherwise)
        const redirectBase = isDesktop ? 'jdmo://auth/callback' : `${config.FRONTEND_URL}/auth/callback`;

        try {
            const tokenData = await DiscordOAuth.getAccessToken(code);
            const discordUser = await DiscordOAuth.getUserProfile(tokenData.access_token);
            if (!discordUser.id) return next(DISCORD_NOT_FOUND);

            if (currentUserId) {
                // Link Discord account to current user
                const existingDiscordUser = await Users.getUserByDiscordId(discordUser.id);
                if (existingDiscordUser && existingDiscordUser.userId !== currentUserId) {
                    return res.redirect(`${redirectBase}?error=discord_already_linked`);
                }

                await Users.linkDiscordAccount(currentUserId, {
                    id: discordUser.id,
                    username: discordUser.username
                });

                return res.redirect(`${redirectBase}?success=linked`);
            }

            // Not logged in: Login or Register
            let user = await Users.getUserByDiscordId(discordUser.id);

            if (!user) {
                // Check if email is already in use
                user = await Users.getUserByEmail(discordUser.email);
                if (user) {
                    // Link Discord to existing account with same email
                    await Users.linkDiscordAccount(user.userId, {
                        id: discordUser.id,
                        username: discordUser.username
                    });
                } else {
                    // Register new user
                    let username = discordUser.username;
                    const existingUser = await Users.getUserByUsernameOrEmail(username, "");
                    if (existingUser) {
                        username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
                    }

                    const userId = uuid();
                    const hashedPassword = await bcrypt.hash(uuid(), 10); // Random password for Discord users

                    user = await Users.createUser({
                        userId,
                        username,
                        email: discordUser.email,
                        nameOnPlatform: username,
                        hashedPassword: hashedPassword,
                        emailVerified: true,
                        hasAcceptedLegalOptins: true,
                        discord: {
                            id: discordUser.id,
                            username: discordUser.username,
                            linkedAt: new Date()
                        }
                    });
                }
            }

            // Create session
            const sessionData = session.createSession(user);
            await Users.updateLastPing(user.userId);
            return res.redirect(`${redirectBase}?token=${sessionData.token}`);

        } catch (err) {
            logger.error({ err, endpoint: "discord/callback" });
            return res.redirect(`${redirectBase}?error=auth_failed`);
        }
    });

    /*
     * @route POST /auth/v1/discord/exchange
     * @description Exchanges a Discord OAuth code for a session token (desktop Tauri deep-link flow).
     *              The desktop app receives the code via a custom scheme redirect (jdmo://auth/callback),
     *              then sends it here to complete OAuth server-side.
     * @body {string} code - The Discord authorization code
     * @body {string} [redirect_uri] - The redirect URI used in the OAuth request (e.g. jdmo://auth/callback)
     * @returns {Object} { token: string } or { error: string }
     */
    publicRouter.post("/discord/exchange", async (req, res, next) => {
        const { code, redirect_uri } = req.body;
        if (!code) return res.status(400).json({ error: "no_code" });

        try {
            const tokenData = await DiscordOAuth.getAccessToken(code, redirect_uri || undefined);
            const discordUser = await DiscordOAuth.getUserProfile(tokenData.access_token);
            if (!discordUser.id) return res.status(500).json({ error: "discord_not_found" });

            // Check for session token in state (Linking)
            // For desktop linking flow, the state can be sent alongside the exchange request
            const { state } = req.body;
            let currentUserId = null;
            if (state) {
                const tokenValue = decodeURIComponent(state);
                const { verified, payload } = session.verifySession(tokenValue);
                if (verified) currentUserId = payload.uid;
            }

            if (currentUserId) {
                const existingDiscordUser = await Users.getUserByDiscordId(discordUser.id);
                if (existingDiscordUser && existingDiscordUser.userId !== currentUserId) {
                    return res.status(409).json({ error: "discord_already_linked" });
                }
                await Users.linkDiscordAccount(currentUserId, {
                    id: discordUser.id,
                    username: discordUser.username
                });
                return res.json({ success: "linked" });
            }

            // Login or Register
            let user = await Users.getUserByDiscordId(discordUser.id);

            if (!user) {
                user = await Users.getUserByEmail(discordUser.email);
                if (user) {
                    await Users.linkDiscordAccount(user.userId, {
                        id: discordUser.id,
                        username: discordUser.username
                    });
                } else {
                    let username = discordUser.username;
                    const existingUser = await Users.getUserByUsernameOrEmail(username, "");
                    if (existingUser) {
                        username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
                    }
                    const userId = uuid();
                    const hashedPassword = await bcrypt.hash(uuid(), 10);
                    user = await Users.createUser({
                        userId,
                        username,
                        email: discordUser.email,
                        nameOnPlatform: username,
                        hashedPassword,
                        emailVerified: true,
                        hasAcceptedLegalOptins: true,
                        discord: {
                            id: discordUser.id,
                            username: discordUser.username,
                            linkedAt: new Date()
                        }
                    });
                }
            }

            const sessionData = session.createSession(user);
            await Users.updateLastPing(user.userId);
            return res.json({ token: sessionData.token });
        } catch (err) {
            logger.error({ err, endpoint: "discord/exchange" });
            return res.status(500).json({ error: "auth_failed" });
        }
    });

    /**
     * @route GET /auth/v1/patreon/check
     * @description Checks whether the current user is eligible to connect a Patreon account.
     *              The frontend should call this before showing the "Connect Patreon" button.
     * @returns {Object} { eligible: boolean, discordConnected: boolean, inDiscordServer: boolean, errors?: string[] }
     */
    publicRouter.get("/patreon/check", tokenRequired, async (req, res, next) => {
        try {
            const errors = [];
            let discordConnected = false;
            let inDiscordServer = false;

            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            if (user.discord && user.discord.id) {
                discordConnected = true;

                const guildId = config.PATREON.DISCORD_SERVER_ID;
                const botToken = config.PATREON.DISCORD_BOT_TOKEN;
                if (guildId && botToken) {
                    inDiscordServer = await DiscordOAuth.isMemberOfGuild(
                        user.discord.id, guildId, botToken
                    );
                } else {
                    // No server configured — skip check
                    inDiscordServer = true;
                }
            } else {
                errors.push(USER_DISCORD_NOT_CONNECTED.message);
            }

            if (discordConnected && !inDiscordServer) {
                errors.push(USER_NOT_ON_SERVER.message);
            }

            const eligible = discordConnected && inDiscordServer;

            return res.json({
                eligible,
                discordConnected,
                inDiscordServer,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (err) {
            logger.error({ err: err.message }, "Patreon eligibility check failed");
            return res.status(500).json({
                eligible: false,
                discordConnected: false,
                inDiscordServer: false,
                errors: ["Failed to check Patreon eligibility. Please try again."]
            });
        }
    });

    /**
     * @route GET /auth/v1/patreon/refresh
     * @description Checks the Patreon API for the current user's subscription status
     *              and updates the database. The frontend should call this on each
     *              profile visit, then fetch /me for the updated status.
     * @returns {Number} 200 on success, error otherwise
     */
    publicRouter.get("/patreon/refresh", tokenRequired, async (req, res, next) => {
        try {
            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            if (!user.patreon || !user.patreon.id) {
                return res.sendStatus(200);
            }

            const accessToken = config.PATREON.ACCESS_TOKEN;

            if (!accessToken) {
                return res.sendStatus(200);
            }

            let patronStatus, chargeStatus;

            // Prefer direct member lookup if we have the memberId stored
            if (user.patreon.memberId) {
                const url = `https://www.patreon.com/api/oauth2/v2/members/${user.patreon.memberId}?fields[member]=patron_status,last_charge_status,currently_entitled_amount_cents`;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const memberData = response.data?.data;
                patronStatus = memberData?.attributes?.patron_status;
                chargeStatus = memberData?.attributes?.last_charge_status;
            } else {
                // Fallback: filter campaign members by user ID
                const campaignId = config.PATREON.CAMPAIGN_ID;
                if (!campaignId) return res.sendStatus(200);

                const url = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members` +
                    `?fields[member]=patron_status,last_charge_status` +
                    `&filter[user_id]=${user.patreon.id}`;

                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                // A user may have multiple memberships (e.g. old lapsed + new active).
                // Prefer the one where patron_status === "active_patron".
                const members = response.data?.data || [];
                let bestMember = null;
                for (const m of members) {
                    if (!bestMember || m.attributes?.patron_status === "active_patron") {
                        bestMember = m;
                    }
                }

                patronStatus = bestMember?.attributes?.patron_status;
                chargeStatus = bestMember?.attributes?.last_charge_status;

                // Store the correct memberId for future lookups
                if (bestMember?.id) {
                    await User.collection.updateOne(
                        { userId: req.userId },
                        { $set: { "patreon.memberId": bestMember.id } }
                    );
                }
            }

            const isSubscribed = patronStatus === "active_patron" && (chargeStatus === "Paid" || chargeStatus === null);

            // Update the database
            await User.collection.updateMany(
                { userId: req.userId },
                {
                    $set: {
                        "patreon.isSubscribed": isSubscribed,
                        "patreon.lastCheckedAt": new Date()
                    }
                }
            );

            return res.sendStatus(200);
        } catch (err) {
            logger.error({ message: "Patreon refresh failed", details: { err: err.message } });
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /auth/v1/patreon/callback
     * @description Handles Patreon OAuth2 callback.
     */
    publicRouter.get("/patreon/callback", async (req, res, next) => {
        const { code, state } = req.query;
        if (!code) return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=no_code`);

        try {
            const tokenData = await PatreonOAuth.getAccessToken(code);
            const patreonUser = await PatreonOAuth.getUserProfile(tokenData.access_token);

            if (!patreonUser.id) return next(PATREON_NOT_FOUND);

            // Check for session token in state (Linking)
            let currentUserId = null;
            if (state) {
                const tokenValue = decodeURIComponent(state);
                const { verified, payload } = session.verifySession(tokenValue);
                if (verified) currentUserId = payload.uid;
            }

            if (currentUserId) {
                // Link Patreon account to current user
                const existingPatreonUser = await Users.getUserByPatreonId(patreonUser.id);
                if (existingPatreonUser && existingPatreonUser.userId !== currentUserId) {
                    return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=patreon_already_linked`);
                }

                // Discord must be connected
                const linkingUser = await Users.getUserById(currentUserId);
                if (!linkingUser || !linkingUser.discord || !linkingUser.discord.id) {
                    return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=discord_not_connected`);
                }

                // User must be a member of the Discord server
                const guildId = config.PATREON.DISCORD_SERVER_ID;
                const botToken = config.PATREON.DISCORD_BOT_TOKEN;
                if (guildId && botToken) {
                    const isMember = await DiscordOAuth.isMemberOfGuild(linkingUser.discord.id, guildId, botToken);
                    if (!isMember) {
                        return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=not_on_discord_server`);
                    }
                }

                await Users.linkPatreonAccount(currentUserId, {
                    id: patreonUser.id,
                    email: patreonUser.email,
                    fullName: patreonUser.full_name,
                    imageUrl: patreonUser.image_url || patreonUser.thumb_url,
                    vanity: patreonUser.vanity
                });

                return res.redirect(`${config.FRONTEND_URL}/auth/callback?success=patreon_linked`);
            }

            // Not logged in: log in if they already have a linked Patreon account
            const user = await Users.getUserByPatreonId(patreonUser.id);

            if (!user) {
                // Patreon is not linked to any account — redirect them to log in and link it
                return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=patreon_not_linked`);
            }

            // Create session
            const sessionData = session.createSession(user);
            await Users.updateLastPing(user.userId);
            return res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${sessionData.token}`);

        } catch (err) {
            console.error(err)
            logger.error({ message: "Patreon auth failed", details: {
                err, endpoint: "patreon/callback"
            } });
            return res.redirect(`${config.FRONTEND_URL}/auth/callback?error=patreon_auth_failed`);
        }
    });

    /**
     * @route POST /auth/v1/patreon/webhook
     * @description Handles Patreon webhook events for pledge changes.
     *              Verifies the request via query guard secret and HMAC-MD5 signature,
     *              then updates the user's patreon.isSubscribed status accordingly.
     *              Always responds 200 to prevent Patreon retries.
     */
    publicRouter.post("/patreon/webhook", async (req, res, next) => {
        // Guard: verify HMAC-MD5 signature
        const signature = req.headers["x-patreon-signature"];
        if (!signature) {
            return next(UNAUTHORIZED);
        }

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expectedSig = crypto
            .createHmac("md5", config.PATREON.WEBHOOK_SECRET)
            .update(rawBody)
            .digest("hex");

        if (signature !== expectedSig) {
            logger.warn({ message: "Patreon webhook: invalid signature", details: {
                ip: req.ip,
                signature,
                headers,
                body: req.body
            }});
            return next(UNAUTHORIZED);
        }

        const event = req.headers["x-patreon-event"];
        const payload = req.body;

        // Only process pledge events
        if (!event?.startsWith("members:pledge:")) {
            return res.sendStatus(200);
        }

        try {
            const patreonUserId = payload?.data?.relationships?.user?.data?.id;
            if (!patreonUserId) {
                logger.warn({ message: "Patreon webhook: missing user ID in payload", details: { event } });
                return res.sendStatus(200);
            }

            const patronStatus = payload.data.attributes.patron_status;
            const chargeStatus = payload.data.attributes.last_charge_status;
            const isSubscribed = patronStatus === "active_patron" && (chargeStatus === "Paid" || chargeStatus === null);

            await User.collection.updateMany(
                { "patreon.id": patreonUserId },
                {
                    $set: {
                        "patreon.isSubscribed": isSubscribed,
                        "patreon.lastCheckedAt": new Date()
                    }
                }
            );

            logger.info({
                message: "Patreon webhook processed",
                details: {
                    event,
                    patreonUserId,
                    isSubscribed,
                    patronStatus,
                    chargeStatus
                }
            });
        } catch (err) {
            logger.error({ message: "Patreon webhook error", details: {
                err: err.message, event
            } });
        }

        // Always respond 200 so Patreon doesn't retry
        return res.sendStatus(200);
    });

    /**
     * @route POST /auth/v1/change-password
     * @description Changes the user's password after authentication.
     * @param {Object} req.body - Request body
     * @param {string} req.body.oldPassword - Current password
     * @param {string} req.body.newPassword - New password
     * @returns {Object} JSON response with success status
     */
    privateRouter.post("/change-password", tokenRequired, async (req, res, next) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const user = await Users.getUserByEmail(req.email);

            if (!user) {
                return next(USER_NOT_FOUND);
            }

            const isPasswordValid = await bcrypt.compare(oldPassword, user.hashedPassword);
            if (!isPasswordValid) {
                return next(INVALID_CREDENTIALS);
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await Users.changePassword(req.email, hashedPassword);

            return res.send({ success: true });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route DELETE /auth/v1/discord
     * @description Unlinks the user's Discord account.
     * @description Requires a valid token.
     */
    privateRouter.delete("/discord", tokenRequired, async (req, res, next) => {
        try {
            const user = await Users.unlinkDiscordAccount(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            logger.info({
                message: "User unlinked Discord account",
                details: { userId: req.userId }
            });

            return res.send({ success: true });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route DELETE /auth/v1/patreon
     * @description Unlinks the user's Patreon account.
     * @description Requires a valid token.
     */
    privateRouter.delete("/patreon", tokenRequired, async (req, res, next) => {
        try {
            const user = await Users.unlinkPatreonAccount(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            logger.info({
                message: "User unlinked Patreon account",
                details: { userId: req.userId }
            });

            return res.send({ success: true });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/2fa/verify
     * @description Verifies a 2FA code using a temporary 2FA token and returns a full session.
     */
    publicRouter.post("/2fa/verify", twoFactorTokenRequired, async (req, res, next) => {
        const { code } = req.body;
        const userId = req.userId;

        try {
            const User = require("../lib/models/user");
            const user = await User.findOne({ userId });
            if (!user) return next(USER_NOT_FOUND);

            if (!user.status.twoFactorEnabled) {
                return next(TWO_FACTOR_NOT_ENABLED);
            }

            const verified = speakeasy.totp.verify({
                secret: user.status.twoFactorSecret,
                encoding: 'base32',
                token: code
            });

            if (!verified) {
                return next(INVALID_TWO_FACTOR_CODE);
            }

            await Users.updateLastPing(user.userId);

            return res.json({
                success: true,
                message: "2FA verified successfully.",
                session: session.createSession(user)
            });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /auth/v1/2fa/setup
     * @description Generates a 2FA secret and QR code for the authenticated user.
     */
    publicRouter.get("/2fa/setup", (req, res, next) => {
        const isTfa = req.headers["x-2fa-token"] || req.body?.twoFactorToken;
        if (isTfa) return twoFactorTokenRequired(req, res, next);
        return tokenRequired(req, res, next);
    }, async (req, res, next) => {
        try {
            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            if (user.status.twoFactorEnabled) {
                return next(TWO_FACTOR_ALREADY_ENABLED);
            }

            const devText = config.ENV.toLowerCase() === "prod" ? "Hub" : `Hub ${config.ENV.toUpperCase()}`;

            const secret = speakeasy.generateSecret({
                name: `JDMO ${devText} (${user.username})`,
                issuer: `JDMO ${devText}`
            });

            // Store secret temporarily in user object (not enabled yet)
            user.status.twoFactorSecret = secret.base32;
            await user.save();

            const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

            res.json({
                secret: secret.base32,
                qrCodeUrl
            });
        } catch (err) {
            logger.error(err);
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/2fa/enable
     * @description Verifies and enables 2FA for the authenticated user.
     */
    publicRouter.post("/2fa/enable", (req, res, next) => {
        const isTfa = req.headers["x-2fa-token"] || req.body?.twoFactorToken;
        if (isTfa) return twoFactorTokenRequired(req, res, next);
        return tokenRequired(req, res, next);
    }, async (req, res, next) => {
        try {
            const { code } = req.body;
            if (!code) return next(INVALID_REQUEST);

            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            if (user.status.twoFactorEnabled) {
                return next(TWO_FACTOR_ALREADY_ENABLED);
            }

            if (!user.status.twoFactorSecret) {
                return next(INVALID_REQUEST);
            }

            const verified = speakeasy.totp.verify({
                secret: user.status.twoFactorSecret,
                encoding: 'base32',
                token: code
            });

            if (!verified) {
                return next(INVALID_TWO_FACTOR_CODE);
            }

            user.status.twoFactorEnabled = true;
            await user.save();

            const response = {
                success: true,
                message: "Two-factor authentication enabled successfully."
            };

            // If they were in setup mode (no full session yet), give them a session now
            if (req.is2FASetup) {
                response.session = session.createSession(user);
            }

            return res.json(response);
        } catch (err) {
            logger.error(err);
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/2fa/disable
     * @description Disables 2FA for the authenticated user.
     */
    publicRouter.post("/2fa/disable", tokenRequired, async (req, res, next) => {
        try {
            const { code } = req.body;
            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            if (!user.status.twoFactorEnabled) {
                return next(TWO_FACTOR_NOT_ENABLED);
            }

            const verified = speakeasy.totp.verify({
                secret: user.status.twoFactorSecret,
                encoding: 'base32',
                token: code
            });

            if (!verified) {
                return next(INVALID_TWO_FACTOR_CODE);
            }

            user.status.twoFactorEnabled = false;
            user.status.twoFactorSecret = null;
            await user.save();

            res.json({ success: true });
        } catch (err) {
            logger.error(err);
            next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route GET /auth/v1/get-auth-file
     * @description Returns a base64-encoded INI file for booting the game in the launcher.
     * @param {string} [req.query.savePath] - Custom save path for the game
     * @param {string} [req.query.language] - Game language (defaults to user's preferred language)
     * @returns {Object} JSON with base64-encoded INI data
     */
    publicRouter.get("/get-auth-file", tokenRequired, async (req, res, next) => {
        try {
            const user = await Users.getUserById(req.userId);
            if (!user) return next(USER_NOT_FOUND);

            // Generate an auth file password on first request, or if missing
            if (!user.status.authFilePassword) {
                user.status.authFilePassword = Users.generateAuthFilePassword();
                await user.save();
            }

            const passwordB64 = Buffer.from(user.status.authFilePassword, "utf8").toString("base64");
            const userIdB64 = Buffer.from(user.userId, "utf8").toString("base64");
            const usernameB64 = Buffer.from(user.username, "utf8").toString("base64");

            // Build TickedId: JDMO: + encrypted(base64(userId):userId:base64(username):email:base64(password):exp)
            const exp = Date.now() + 5 * 60 * 1000;
            const rawTicket = `${userIdB64}:${user.userId}:${usernameB64}:${user.email}:${passwordB64}:${exp}`;
            const tickedId = `JDMO:${authFile.encryptTicket(rawTicket)}`;

            const payload = {
                Username: user.username,
                Email: user.email,
                Password: "dummy",
                SavePath: req.query.savePath || "Default",
                Language: req.query.language || user.preferredLanguage || "en-US",
                UserId: user.userId,
                TickedId: tickedId,
                // Hidden metadata for verification (the game will ignore these)
                passwordChangedAt: user.status.passwordChangedAt
                    ? user.status.passwordChangedAt.getTime()
                    : "",
                signedAt: Date.now()
            };

            const encoded = authFile.encrypt(payload);

            return res.json({
                success: true,
                data: encoded
            });
        } catch (err) {
            logger.error(err);
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/verify-auth-file
     * @description Verifies an encrypted auth payload and returns the decrypted data.
     * Checks that the password hasn't changed since the auth file was issued.
     * @param {Object} req.body - Request body
     * @param {string} req.body.data - Base64-encoded encrypted auth payload
     * @returns {Object} JSON with decrypted payload
     */
    publicRouter.post("/verify-auth-file", async (req, res, next) => {
        try {
            const { data } = req.body;

            const payload = authFile.decrypt(data);
            if (!payload || !payload.UserId) {
                logger.warn({
                    message: "Auth file verification failed: invalid or tampered payload",
                    ip: req.ip
                });
                return next(INVALID_AUTH_FILE);
            }

            // Check if the payload has expired (e.g., older than 5 minutes)
            if (!utils.isLocal() && (payload.signedAt && Date.now() - Number(payload.signedAt) > 5 * 60 * 1000)) {
                logger.warn({
                    message: "Auth file verification failed: expired",
                    userId: payload.UserId,
                    signedAt: payload.signedAt
                });
                return next(AUTH_FILE_EXPIRED);
            }

            // Look up the user and verify password hasn't changed since auth file was issued
            const user = await Users.getUserById(payload.UserId);
            if (!user) {
                logger.warn({
                    message: "Auth file verification failed: user not found",
                    userId: payload.UserId
                });
                return next(USER_NOT_FOUND);
            }

            const payloadPasswordChangedAt = payload.passwordChangedAt
                ? Number(payload.passwordChangedAt)
                : null;
            const currentPasswordChangedAt = user.status.passwordChangedAt
                ? user.status.passwordChangedAt.getTime()
                : null;

            if (payloadPasswordChangedAt !== currentPasswordChangedAt) {
                logger.warn({
                    message: "Auth file verification failed: password changed since auth file was issued",
                    userId: payload.UserId,
                    payloadPasswordChangedAt,
                    currentPasswordChangedAt
                });
                return next(AUTH_FILE_PASSWORD_CHANGED);
            }

            logger.info({
                message: "Auth file verified successfully",
                userId: payload.UserId
            });

            return res.json({
                success: true,
                payload: {
                    UserId: user.userId,
                    Username: user.username,
                    Email: user.email
                }
            });
        } catch (err) {
            logger.error({ err: err.message, stack: err.stack }, "Auth file verification error");
            return next(INTERNAL_SERVER_ERROR);
        }
    });

    /**
     * @route POST /auth/v1/verify-ticket
     * @description Verifies the TickedId from an auth file. Decrypts, parses, and validates
     * that the user exists and the auth file password matches.
     * @param {Object} req.body - Request body
     * @param {string} req.body.ticket - The full TickedId string (JDMO:{encrypted})
     * @returns {Object} JSON with success and user info
     */
    publicRouter.post("/verify-ticket", async (req, res, next) => {
        try {
            const { ticket } = req.body;
            if (!ticket || !ticket.startsWith("JDMO:")) {
                logger.warn({ message: "Ticket verification failed: invalid format", ip: req.ip });
                return next(INVALID_AUTH_FILE);
            }

            // Strip JDMO: prefix and decrypt
            const encryptedPart = ticket.slice(5);
            const decrypted = authFile.decryptTicket(encryptedPart);
            if (!decrypted) {
                logger.warn({ message: "Ticket verification failed: decryption error", ip: req.ip });
                return next(INVALID_AUTH_FILE);
            }

            // Parse the colon-separated fields
            const parts = decrypted.split(":");
            if (parts.length < 6) {
                logger.warn({ message: "Ticket verification failed: malformed data" });
                return next(INVALID_AUTH_FILE);
            }

            const [userIdB64, userId, usernameB64, email, passwordB64, exp] = parts;

            // Check expiration
            if (!utils.isLocal && Date.now() > Number(exp)) {
                logger.warn({ message: "Ticket verification failed: expired", userId, exp });
                return next(AUTH_FILE_EXPIRED);
            }

            // Verify user exists
            const user = await Users.getUserById(userId);
            if (!user) {
                logger.warn({ message: "Ticket verification failed: user not found", userId });
                return next(USER_NOT_FOUND);
            }

            // Verify the auth file password matches
            const expectedPasswordB64 = Buffer.from(user.status.authFilePassword || "", "utf8").toString("base64");
            if (passwordB64 !== expectedPasswordB64) {
                logger.warn({ message: "Ticket verification failed: password mismatch", userId });
                return next(UNAUTHORIZED);
            }

            // logger.info({ message: "Ticket verified successfully", userId });

            return res.json({
                success: true,
                payload: {
                    UserId: user.userId,
                    Username: user.username,
                    Email: user.email
                }
            });
        } catch (err) {
            logger.error({ err: err.message, stack: err.stack }, "Ticket verification error");
            return next(INTERNAL_SERVER_ERROR);
        }
    });
};