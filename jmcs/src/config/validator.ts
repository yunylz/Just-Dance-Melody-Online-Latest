import Joi from "joi";
import { createLogger } from "../lib/logger";

const logger = createLogger({ service: "config-validator" });

const configSchema = Joi.object({
    PORT: Joi.number().required(),
    ENV: Joi.string().valid("local", "dev", "prod", "staging", "patreon", "uat").required(),
    PRIVATE_ROUTERS: Joi.boolean().default(false),
    IS_CLOUDFLARE: Joi.boolean().default(false),
    MMDB_PATH: Joi.string().default(""),
    DEFAULT_COUNTRY: Joi.string().required(),
    DEFAULT_LANGUAGE: Joi.string().required(),
    DISCORD_WEBHOOK_URL: Joi.string().uri().required(),
    FQDN: Joi.string().uri().required(),
    HOSTNAME: Joi.string().default("localhost").optional(),
    IS_HTTPS: Joi.boolean().required(),
    METRICS: {
        enabled: Joi.boolean().default(false).optional(),
        job: Joi.string().optional(),
        env: Joi.string().optional(),
    },
    MONGODB_URI: Joi.string().required(),
    REDIS_URI: Joi.string().uri({ scheme: [/redis/, /rediss/] }).required(),
    MORGAN_SKIPS: Joi.array().items(Joi.string()).default([]),
    S3: {
        FQDN: Joi.string().uri().required(),
        ACCESS_KEY_ID: Joi.string().required(),
        SECRET_ACCESS_KEY: Joi.string().required(),
        BUCKET: Joi.string().required(),
        REGION: Joi.string().required(),
        ENDPOINT: Joi.string().uri().required(),
        SONGDB_PATH: Joi.string().required(),
        LOCALIZATION_PATH: Joi.string().required(),
        RELATED_PATH: Joi.string().required(),
    },
    UGC_S3: {
        FQDN: Joi.string().uri().required(),
        ACCESS_KEY_ID: Joi.string().required(),
        SECRET_ACCESS_KEY: Joi.string().required(),
        BUCKET: Joi.string().required(),
        REGION: Joi.string().required(),
        ENDPOINT: Joi.string().uri().required(),
    },
    OIDC: {
        CLIENT_ID: Joi.string().required(),
        CLIENT_SECRET: Joi.string().required(),
        AUTHORIZE_URL: Joi.string().required(),
        TOKEN_URL: Joi.string().required(),
        USERINFO_URL: Joi.string().required(),
        LOGOUT_URL: Joi.string().required(),
        REDIRECT_URI: Joi.string().required(),
    },
    HARBOUR_TICKET_SECRET: Joi.string().required(),
    SESSION_SECRET: Joi.string().required(),
    HMAC_SECRET: Joi.string().required()
}).unknown(true)

export default (config: object) => {
    try {
        const { error } = configSchema.validate(config);
        if (error) {
            logger.error({
                message: "Configuration validation failed",
                details: error,
            });
            process.exit(1);
        }
    } catch (error) {
        logger.error({
            message: "Configuration validation error",
            details: error,
        });
        process.exit(1);
    }
};