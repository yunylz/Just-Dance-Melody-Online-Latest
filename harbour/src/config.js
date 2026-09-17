const project = require("../package.json")

module.exports = {
    ENV: process.env.NODE_ENV || "local",
    HTTP_PORT: process.env.HTTP_PORT || 80,
    HTTPS_PORT: process.env.HTTPS_PORT || 443,
    VERSION: process.env.APP_VERSION || project.version,
    HOSTNAME: process.env.HOSTNAME || "localhost",
    PORT: process.env.PORT || 3000,
    MMDB_PATH: process.env.MMDB_PATH,
    IS_HTTPS: process.env.IS_HTTPS == "true",
    IS_CLOUDFLARE: process.env.IS_CLOUDFLARE == "true",
    DEFAULT_COUNTRY: "US",
    DEFAULT_LANGUAGE: "en",
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URI: process.env.REDIS_URI,
    HARBOUR_TICKET: {
        SECRET: process.env.HARBOUR_TICKET_SECRET,
        SESSION_TTL: 1000 * 60 * 60 * 3,          // 3 hours
        SESSION_TTL_REMEMBER_ME: 1000 * 60 * 60 * 24 * 30,    // 30 days
        SESSION_TTL_S2S: 1000 * 60 * 60 * 24,         // 24 hours
    },
    UBISERVICES: {
        FQDN: process.env.UBISERVICES_FQDN,
    },
    SESSION_SECRET: process.env.SESSION_SECRET || "harbour-default-session-secret",
    PRIVATE_ROUTES: process.env.PRIVATE_ROUTES == "true" || false,
    HEADERS: {
        APP_ID: "ubi-appid",
        BUILD_ID: "ubi-appbuildid"
    },
    HUB: {
        API_FQDN: process.env.HUB_API_FQDN,
        S2S_TOKEN: process.env.HUB_S2S_TOKEN,
        AUTH_BYPASS_HEADER: process.env.HUB_AUTH_SLOWDOWN_BYPASS_HEADER,
        AUTH_BYPASS_VALUE: process.env.HUB_AUTH_SLOWDOWN_BYPASS_VALUE
    },
    CACHE: {},
    PRETENDO: {
        SECRET_KEY: Buffer.from(process.env.PRETENDO_TOKEN_SECRET_KEY, 'hex'),
        IV: Buffer.from(process.env.PRETENDO_TOKEN_IV, 'hex')
    },
    ADMIN_EMAILS: process.env.AD_EMAILS?.split(",") || [],
    LOG_HTTP_REQUESTS: process.env.LOG_HTTP_REQUESTS == "true" || false,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    OIDC: {
        CLIENT_ID: process.env.OIDC_CLIENT_ID || "",
        CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || "",
        AUTHORIZE_URL: process.env.OIDC_AUTHORIZE_URL || "",
        TOKEN_URL: process.env.OIDC_TOKEN_URL || "",
        USERINFO_URL: process.env.OIDC_USERINFO_URL || "",
        LOGOUT_URL: process.env.OIDC_LOGOUT_URL || "",
        REDIRECT_URI: process.env.OIDC_REDIRECT_URI || ""
    },
    BACKOFFICE_TOKEN: process.env.BACKOFFICE_TOKEN,
    JMCS: {
        ENVS: {
            DEV: "http://jmcs-main.c0llydoll.dev",
            PROD: "http://jmcs-main.c0llydoll.dev",
        }
    }
}