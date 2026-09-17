const project = require("../package.json")

module.exports = {
    ENV: process.env.NODE_ENV || "local",
    VERSION: process.env.APP_VERSION || project.version,
    HOSTNAME: process.env.HOSTNAME || "localhost",
    PORT: process.env.PORT || 3000,
    FQDN: process.env.FQDN || "http://localhost:3000",
    IS_CLOUDFLARE: process.env.IS_CLOUDFLARE == "true" || false,
    IS_HTTPS: process.env.IS_HTTPS || false,
    VERSIONS: [2015, 2016, 2017, 2018],
    PLATFORMS: ["wiiu", "pc", "ps4", "nx", "uplay"],
    MONGODB_URI: process.env.MONGODB_URI,
    TOKEN_SECRET: process.env.TOKEN_SECRET,
    PRIVATE_ROUTES: process.env.PRIVATE_ROUTES == "true" || false,
    // S2S Tokens that can access Hub API
    S2S_TOKENS: [
        process.env.S2S_TOKEN_HARBOUR,
        process.env.S2S_TOKEN_JMCS,
    ],
    HARBOUR: {
        FQDN: process.env.HARBOUR_FQDN,
        TOKEN: process.env.HARBOUR_BACKOFFICE_TOKEN
    },
    SPACEMAIL_USER: process.env.SPACEMAIL_USER,
    SPACEMAIL_PASS: process.env.SPACEMAIL_PASS,
    SPACEMAIL_USER_NAME: process.env.SPACEMAIL_USER_NAME,
    EMAIL_VERIFICATION_ENABLED: process.env.EMAIL_VERIFICATION_ENABLED == "true",
    AUTH_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    AUTH_RATE_LIMIT_MAX: 5, // 5 attempts
    GENERAL_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    GENERAL_RATE_LIMIT_MAX: 10, // 10 attempts
    EMAIL_COOLDOWN: 5 * 60 * 1000, // 5 minutes
    TOKEN_EXPIRATION: 60 * 60 * 1000, // 1 hour
    AUTH_FILE_SECRET: process.env.AUTH_FILE_SECRET,
    AUTH_SLOWDOWN_BYPASS_HEADER: process.env.AUTH_SLOWDOWN_BYPASS_HEADER || "x-auth-bypass",
    AUTH_SLOWDOWN_BYPASS_VALUE: process.env.AUTH_SLOWDOWN_BYPASS_VALUE || "letmein",
    JMCS: {
        FQDN: process.env.JMCS_FQDN || "http://localhost:4000",
        S2S_TOKEN: process.env.JMCS_S2S_TOKEN,
        USER_AGENT: process.env.JMCS_USER_AGENT || "JDMO Hub API"
    },
    S3: {
        FQDN: process.env.S3_FQDN,
        ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        REGION: process.env.S3_REGION || "auto",
        ENDPOINT: process.env.S3_ENDPOINT,
        BUCKET: process.env.S3_BUCKET || "hub"
    },
    DISCORD: {
        CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
        BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
        REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || `${process.env.FQDN}/auth/v1/discord/callback`
    },
    PATREON: {
        CLIENT_ID: process.env.PATREON_CLIENT_ID,
        CLIENT_SECRET: process.env.PATREON_CLIENT_SECRET,
        ACCESS_TOKEN: process.env.PATREON_ACCESS_TOKEN,
        CAMPAIGN_ID: process.env.PATREON_CAMPAIGN_ID,
        DISCORD_SERVER_ID: process.env.PATREON_DISCORD_SERVER_ID,
        DISCORD_BOT_TOKEN: process.env.PATREON_DISCORD_BOT_TOKEN,
        WEBHOOK_GUARD_SECRET: process.env.PATREON_WEBHOOK_GUARD_SECRET,
        WEBHOOK_SECRET: process.env.PATREON_WEBHOOK_SECRET,
        REDIRECT_URI: process.env.PATREON_REDIRECT_URI || `${process.env.FQDN}/auth/v1/patreon/callback`
    },
    PUSH: {
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY
    },
    FRONTEND_URL: process.env.FRONTEND_URL || "https://hub.c0llydoll.dev",
    LOKI_HOST: process.env.LOKI_HOST,
    GITHUB_PAT_TOKEN: process.env.GITHUB_PAT_TOKEN
}