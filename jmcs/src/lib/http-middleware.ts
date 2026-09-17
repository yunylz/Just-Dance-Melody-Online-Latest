import { v4 as uuidv4 } from "uuid";
import express, { NextFunction } from "express";
import path from "node:path";
import * as core from "express-serve-static-core";
import winston from "winston";
import { match } from "path-to-regexp";

import config from "../config";

import utils from "./utils";
import httpSchema from "./http-schema";
import { INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, INVALID_S2S_TOKEN, SESSION_REQUIRED, UNAUTHORIZED } from "./http-codes";
import project from "../../package.json";
import liveClient from "./live-client";

const logger = require("./logger").createLogger({ service: "http" });

const isSuccessful = (status: number) => status >= 200 && status < 400;

/**
 * Initializes the Express app with essential middleware and security hardening.
 * Must be called before any routes are registered.
 *
 * Applies:
 * - ETag disabled (avoids 304 caching issues)
 * - X-Powered-By removed (security hardening)
 * - Trust proxy enabled (correct IP behind reverse proxy)
 * - JSON + URL-encoded body parsers
 * - Request schema validation
 * - Static file serving from /public
 */
const init = (app: core.Express, logger: winston.Logger) => {
    const root = (global as any).root;

    app.set("etag", false);
    app.set("x-powered-by", false);
    app.enable("trust proxy");
    app.set("view engine", "ejs");

    // Setup CORS for the dashboard
    app.use((req: express.Request, res: express.Response, next: NextFunction) => {
        const allowedOrigins = ["https://jmcs-dashboard.c0llydoll.dev", "http://localhost:5173", "http://localhost:5174"];
        const origin = req.headers.origin;

        if (origin && allowedOrigins.includes(origin)) {
            res.header("Access-Control-Allow-Origin", origin);
            res.header("Vary", "Origin");
        }

        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }

        next();
    });


    app.use((req, res, next) => {
        res.setHeader("Server", `${project.name}-${project.version}`);
        next();
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(liveClient.middleware);
    app.use(validateRequest);
    app.use("/public", express.static(path.join(root, "public")));
};

/**
 * Catches unmatched routes and returns a bare 404.
 * Register this after all route handlers.
 */
const notFound = (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    return res.status(404).end();
};

/**
 * Central error handler. Must be registered last with `app.use`.
 *
 * In development, returns a full JSON error body.
 * In production, returns an empty response with only the status code.
 *
 * Expected error shape passed to `next(err)`:
 * ```ts
 * {
 *   status: number;
 *   message: string;
 *   code?: number;
 *   error?: Error;
 * }
 * ```
 */
const errorHandler = (
    err: any,
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    const status: number = err?.status ?? 500;
    const requestId = uuidv4();
    const errorId = uuidv4();

    const body = {
        status,
        message: err?.message ?? "An unexpected error occurred.",
        errorId,
        errorCode: err?.code ?? null,
        isSuccessful: false,
        serverTime: new Date().toISOString(),
        requestId,
    };

    logger.error({
        message: `${req.method} ${req.originalUrl} → ${status}`,
        details: {
            ip: req.ip,
            method: req.method,
            path: req.originalUrl,
            status,
            requestId,
            errorId,
            errorMessage: err?.message ?? null,
            errorCode: err?.code ?? null,
            stack: utils.isDev() ? err?.stack ?? null : undefined,
        },
    });

    const showBody = utils.isDev() || utils.isLocal() || req.isAdmin || req.isPackageManager || req.isS2s;

    return res.status(status).json(body);
};

/**
 * Validates incoming request body, query, and params against the schema
 * defined in `http-schema.ts` for the matched route and method.
 *
 * Supports path-to-regexp patterns as schema keys (e.g. `/users/:id`).
 * Skips validation silently if no schema is found for the route.
 */
const validateRequest = (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    const method = req.method.toUpperCase();
    const schemaKeys = Object.keys(httpSchema);

    // ValidateRequest runs as global middleware BEFORE Express matches a route,
    // so req.params is always empty here. Extract the URL params from the
    // matched pattern instead (e.g. matchType from "/matches/:matchType").
    let matchedPattern: string | undefined;
    let matchedParams: Record<string, string> | undefined;

    for (const pattern of schemaKeys) {
        const result = match(pattern, { decode: decodeURIComponent })(req.path) as
            { params: Record<string, string> } | false;
        if (result) {
            matchedPattern = pattern;
            matchedParams = result.params;
            break;
        }
    }

    if (!matchedPattern) return next();

    const schema = (httpSchema as Record<string, any>)[matchedPattern]?.[method];
    if (!schema) return next();

    for (const key of Object.keys(schema)) {
        const data = key === "params" && matchedParams
            ? matchedParams
            : ((req as any)[key] ?? {});
        const { error, value } = schema[key].validate(data);

        if (error) {
            logger.warn({
                message: `Request validation failed on "${key}".`,
                details: {
                    path: req.path,
                    method,
                    key,
                    value: data,
                    errors: error.details.map((d: any) => d.message),
                },
            });

            if (key === "body") return next({ ...INVALID_BODY, message: error.details[0].message });
            if (key === "query") return next(INVALID_QUERY);
            if (key === "params") return next(INVALID_PARAMS);
        }

        // Reassign the validated (and potentially defaulted) value back to the request.
        // We use defineProperty because some properties like 'query' might be read-only getters in Express.
        Object.defineProperty(req, key, {
            value,
            configurable: true,
            enumerable: true,
            writable: true
        });
    }


    next();
};

const isAdmin = async (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    // Skip admin check on local env
    if (utils.isLocal()) return next();

    // 1. Check Session (Backward compatibility)
    const s = (req as any).session;
    if (s?.userId) {
        (req as any).userId = s.userId;
        return next();
    }

    // 2. Check Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const userRes = await fetch(config.OIDC.USERINFO_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (userRes.ok) {
                const userInfo = await userRes.json();
                (req as any).user = userInfo;
                (req as any).userId = userInfo.sub || userInfo.id;

                (req).isAdmin = true;

                return next();
            } else {
                const text = await userRes.text();
                logger.error(`Token validation failed: ${userRes.status} ${text}`);
            }
        } catch (err) {
            logger.error("Token validation error:", err);
        }
    } else {
        logger.warn(`No Bearer token found in request to ${req.url}`);
    }

    return next(SESSION_REQUIRED);
};

const isPackageManager = async (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    if (req.isAdmin) return next();
    const authorization = req.headers.authorization as string;
    if (!authorization) return next(SESSION_REQUIRED);

    const [type, token] = authorization.split(" ");
    if (type !== "Bearer") {
        return next(SESSION_REQUIRED);
    };

    if (token === config.PACKAGE_MANAGER_TOKEN) {
        (req as any).isPackageManager = true;
        return next();
    };

    return next(SESSION_REQUIRED);
};

const isAdminOrPackageManager = async (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    // Bypass on local environment
    if (utils.isLocal()) return next();

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        // 1. Package manager static token — fast path
        if (token === config.PACKAGE_MANAGER_TOKEN) {
            (req as any).isPackageManager = true;
            return next();
        };

        // 2. Admin OIDC token — validate with identity provider
        try {
            const userRes = await fetch(config.OIDC.USERINFO_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (userRes.ok) {
                const userInfo = await userRes.json();
                (req as any).user = userInfo;
                (req as any).userId = userInfo.sub || userInfo.id;
                (req).isAdmin = true;
                return next();
            };
        } catch (err) {
            logger.error("Token validation error (isAdminOrPackageManager):", err);
        };
    };

    return next(SESSION_REQUIRED);
};

const getClientCountry = (isCloudflare: boolean, lookup: any) => {
    return (req: express.Request, res: express.Response, next: NextFunction) => {
        if (isCloudflare) {
            req.clientCountry = (req.headers["cf-ipcountry"] as string) || config.DEFAULT_COUNTRY;
            req.clientIp = (req.headers["cf-connecting-ip"] as string) || req.ip || "120.10.10.10";
        } else {
            const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
                req.socket.remoteAddress ||
                "120.10.10.10";

            req.clientIp = ip;

            try {
                const geo = lookup?.get(ip);
                req.clientCountry = geo?.country?.iso_code || config.DEFAULT_COUNTRY;
            } catch (error) {
                req.clientCountry = config.DEFAULT_COUNTRY;
            }
        }

        return next();
    };
};

const isS2s = (
    req: express.Request,
    res: express.Response,
    next: core.NextFunction
) => {
    const authorization = req.headers.authorization as string;
    if (!authorization) return next(UNAUTHORIZED);

    const [type, token] = authorization.split(" ");
    if (type !== "Bearer") return next(INVALID_S2S_TOKEN);
    if (!config.S2S_TOKENS.includes(token)) return next(INVALID_S2S_TOKEN);

    req.isS2s = true;

    return next();
};

export default {
    init,
    notFound,
    errorHandler,
    validateRequest,
    getClientCountry,
    isAdmin,
    isPackageManager,
    isAdminOrPackageManager,
    isS2s,
};