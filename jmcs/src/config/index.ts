export default {
    PORT: process.env.PORT || 3000,
    ENV: process.env.NODE_ENV || 'local',
    PRIVATE_ROUTERS: process.env.PRIVATE_ROUTERS === "true",
    IS_CLOUDFLARE: process.env.IS_CLOUDFLARE === "true",
    MMDB_PATH: process.env.MMDB_PATH,
    DEFAULT_COUNTRY: "UBI",
    DEFAULT_LANGUAGE: "en",
    LANGUAGES: ["en", "ja", "ko", "nl", "fr", "de", "es", "da", "fi", "nb", "sv", "pt-br", "it", "zh-cn", "ru", "zh-tw"],
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || "",
    FQDN: process.env.FQDN,
    HOSTNAME: process.env.HOSTNAME,
    IS_HTTPS: process.env.IS_HTTPS === "true",
    METRICS: {
        job: process.env.METRICS_JOB,
        env: process.env.METRICS_ENV
    },
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URI: process.env.REDIS_URI,
    HUB: {
        FQDN: process.env.HUB_FQDN,
        S2S_TOKEN: process.env.HUB_S2S_TOKEN
    },
    // S2s tokens that can access JMCS
    S2S_TOKENS: [
        process.env.S2S_TOKEN_HUB, // For Hub to access JMCS
        process.env.S2S_TOKEN_WDF // For WDF server to access JMCS
    ],
    MORGAN_SKIPS: [],
    S3: {
        FQDN: process.env.S3_FQDN,
        ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        BUCKET: process.env.S3_BUCKET,
        REGION: process.env.S3_REGION,
        ENDPOINT: process.env.S3_ENDPOINT,
        SONGDB_PATH: process.env.S3_SONGDB_PATH,
        LOCALIZATION_PATH: process.env.S3_LOCALIZATION_PATH,
        RELATED_PATH: process.env.S3_RELATED_PATH
    },
    UGC_S3: {
        FQDN: process.env.UGC_S3_FQDN,
        ACCESS_KEY_ID: process.env.UGC_S3_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: process.env.UGC_S3_SECRET_ACCESS_KEY,
        BUCKET: process.env.UGC_S3_BUCKET,
        REGION: process.env.UGC_S3_REGION,
        ENDPOINT: process.env.UGC_S3_ENDPOINT
    },
    HARBOUR_TICKET_SECRET: process.env.HARBOUR_TICKET_SECRET || "",
    OIDC: {
        CLIENT_ID: process.env.OIDC_CLIENT_ID || "",
        CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || "",
        AUTHORIZE_URL: process.env.OIDC_AUTHORIZE_URL || "",
        TOKEN_URL: process.env.OIDC_TOKEN_URL || "",
        USERINFO_URL: process.env.OIDC_USERINFO_URL || "",
        LOGOUT_URL: process.env.OIDC_LOGOUT_URL || "",
        REDIRECT_URI: process.env.OIDC_REDIRECT_URI || ""
    },
    SESSION_SECRET: process.env.SESSION_SECRET || "fallback-secret-for-dev",
    LIVE_CLEAN_INTERVAL: 60 * 60 * 1000, // offline players are removed every hour
    LIVE_TIMEOUT: 6 * 60, // players are live up to 6 minutes after their last request
    BACKOFFICE: {
        APP_ID: "1917492b-1320-4bb8-94f9-29c751a44779",
        BYPASS_TOKEN: process.env.BACKOFFICE_BYPASS_TOKEN || "iloveyunyl69"
    },

    PACKAGE_MANAGER_TOKEN: process.env.PACKAGE_MANAGER_TOKEN,
    HMAC_SECRET: process.env.HMAC_SECRET,
    LOKI_HOST: process.env.LOKI_HOST,
    SERVICE_NAME: "jmcs"
}