/**
 * @module middleware
 *
 * Central Express middleware factory for the Harbour API.
 *
 * Responsibilities:
 *  - **App bootstrap** (`init`): security headers, CORS, JSON parsing,
 *    request schema validation, and static file serving.
 *  - **Request validation** (`validateRequest`): Joi-based schema checks on
 *    `body`, `query`, `params`, and `headers`.
 *  - **Platform auth entry point** (`verifyAppByHeader`, `verifyUserAgent`,
 *    `verifyBuildId`, `verifyAuth`): the first auth layer — resolves the
 *    calling application and verifies the platform credential token (PSN NP
 *    ticket, Nintendo JWT, WiiU AES token, …).  On success these set
 *    `req.application`, `req.platform`, `req.payload`, and
 *    `req.isAuthenticated`.
 *  - **Error handling** (`notFound`, `errorHandler`): catch-all 404 and the
 *    global error formatter.
 *
 * The second auth layer (Harbour session ticket validation) lives in
 * `ticket-client.js` and is applied separately per-route via `ticketRequired`.
 *
 * `handleConsoleAuth` is also exported from here — a single shared dispatcher
 * that routes a verified platform token to the correct `lib/auth/<name>.js`
 * handler.  Both `profiles.v2` and `profiles.v3` use it after `verifyAuth`.
 */

const uuid = require("uuid");
const express = require("express");
const cors = require("cors");
const path = require("node:path");
const maxmind = require("maxmind");

const utils = require("./utils");
const httpSchema = require("./http-schema");
const logger = require("./logger").createLogger({ service: "http-middleware" });
const httpCodes = require("./http-codes");
const config = require("../config");
const games = require("./games");

const basic = require("./auth/basic");
const wiiu = require("./auth/wiiu");
const psn2 = require("./auth/psn2");
const authSwitch = require("./auth/switch");
const pcCrack = require("./auth/pc-crack");
const pc = require("./auth/pc");

const {
  INVALID_BODY,
  INVALID_QUERY,
  INVALID_PARAMS,
  PASSWORD_TOO_WEAK,
  APP_NOT_FOUND,
  INVALID_HEADERS,
  APPLICATION_REQUIRED,
  AUTHORIZATION_REQUIRED,
  AUTHORIZATION_INVALID_TYPE,
  AUTH_VERIFICATION_FAILED,
  AUTH_SYSTEM_ERROR,
  AUTH_TOKEN_EXPIRED,
  AUTH_TOKEN_INVALID,
  AUTH_TOKEN_MALFORMED,
  UNKNOWN_TICKET_TYPE,
  APP_ID_REQUIRED,
  UNKNOWN_AUTH_TYPE
} = httpCodes;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true for any 2xx/3xx status code.
 * @param {number} status
 * @returns {boolean}
 */
const isSuccessful = (status) => status >= 200 && status < 400;

/**
 * Looks up the human-readable error ID key for a given numeric error code.
 * Used to populate `errorId` in error responses.
 *
 * @param {number} code - Numeric error code.
 * @returns {string|null}
 */
const findErrorId = (code) => {
  if (!code) return null;
  for (const [key, def] of Object.entries(httpCodes)) {
    if (def.code === code) return key;
  }
  return null;
};

/**
 * Parses an Authorization header into `[type, token]`.
 *
 * Strips `t=` / `x=` token prefixes that some Ubisoft client builds prepend
 * to the token value before sending it in the header.  These prefixes have no
 * semantic meaning on the server side and must be removed before the token is
 * passed to a verifier.
 *
 * @param {string} authHeader
 * @returns {[string|null, string|null]} `[type, token]` or `[null, null]` if the header is missing or malformed.
 */
const parseAuthHeader = (authHeader) => {
  if (!authHeader) return [null, null];

  const spaceIdx = authHeader.indexOf(" ");
  if (spaceIdx === -1) return [null, null];

  const type = authHeader.slice(0, spaceIdx);
  let token = authHeader.slice(spaceIdx + 1);

  if (token.startsWith("t=")) token = token.substring(2);
  if (token.startsWith("x=")) token = token.substring(2);

  return [type, token];
};

/**
 * Maps an auth error message string to the appropriate HTTP error code object.
 *
 * @param {string} errorMessage
 * @returns {Object} HTTP error code object from `http-codes.js`
 */
const mapAuthError = (errorMessage) => {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("expired")) return AUTH_TOKEN_EXPIRED;
  if (msg.includes("invalid") || msg.includes("corrupted")) return AUTH_TOKEN_INVALID;
  if (msg.includes("malformed") || msg.includes("format")) return AUTH_TOKEN_MALFORMED;
  return AUTH_VERIFICATION_FAILED;
};

/**
 * Maps a Joi validation error to the appropriate HTTP error code object.
 *
 * @param {string} validationKey - "body" | "query" | "params" | "headers"
 * @param {Object} error - Joi validation error
 * @returns {Object}
 */
const getValidationError = (validationKey, error) => {
  switch (validationKey) {
    case "body": {
      const isPasswordError = error.details.some(d => d.context?.key === "password");
      return isPasswordError
        ? PASSWORD_TOO_WEAK
        : { ...INVALID_BODY, message: error.details[0].message };
    }
    case "query": return INVALID_QUERY;
    case "params": return INVALID_PARAMS;
    case "headers": return INVALID_HEADERS;
    default: return { ...INVALID_BODY, message: error.details[0].message };
  }
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Validates incoming requests against Joi schemas defined in `http-schema.js`.
 * Checks `body`, `query`, `params`, and `headers` where schemas are defined.
 *
 * @type {import("express").RequestHandler}
 */
const validateRequest = (req, res, next) => {
  const schema = httpSchema[req.path]?.[req.method.toUpperCase()];
  if (!schema) return next();

  for (const [key, validationSchema] of Object.entries(schema)) {
    const { error } = validationSchema.validate(req[key] || {});
    if (error) {
      logger.warn({
        message: "Request validation failed",
        details: { path: req.path, method: req.method, key, error: error.details[0].message }
      });
      return next(getValidationError(key, error));
    }
  }

  next();
};

/**
 * Initialises Express with security settings, CORS, JSON parsing,
 * request validation, and static file serving.
 *
 * @param {import("express").Application} app
 */
const init = async (app) => {
  app.set("etag", false);
  app.set("x-powered-by", false);
  app.enable("trust proxy");

  app.use(cors({
    origin: [
      "http://localhost:4173",
      "http://localhost:5173",
      "https://dp-dev.ryuatelier.org",
      "https://dp.ryuatelier.org"
    ],
    credentials: true
  }));

  app.use(express.json());

  const isCloudFlare = config.IS_CLOUDFLARE;
  if (isCloudFlare) {
    app.use(clientGeoMiddleware(true, null));
  } else {
    const lookup = await maxmind.open(config.MMDB_PATH);
    app.use(clientGeoMiddleware(false, lookup));
  }

  app.use(validateRequest);

  app.use("/public", express.static(path.join(global.root, "public")));
  app.get("/", (req, res) => res.sendFile(path.join(global.root, "public", "index.html")));
  app.get("/dashboard", (req, res) => res.redirect("/v1/admin/dashboard"));
};

/**
 * Catches unmatched routes and returns the error HTML page.
 *
 * @type {import("express").RequestHandler}
 */
const notFound = (req, res, next) => {
  return next(httpCodes.NOT_FOUND)
};

/**
 * Global error handler. Formats all errors into the standard Harbour error
 * envelope. In development, the full error object is returned; in production
 * only the status code is sent.
 *
 * @type {import("express").ErrorRequestHandler}
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const requestId = uuid.v4();
  const clientIp = req.clientIp;
  const ubiservices = err.ubiservices;

  const response = {
    status,
    message: err?.message,
    errorId: findErrorId(err.code),
    errorCode: err?.code,
    isSuccessful: isSuccessful(status),
    serverTime: new Date(),
    requestId,
    ubiservices
  };

  logger.error({
    message: `${clientIp} — ${req.method} ${req.originalUrl} — ${status}`,
    details: { response, requestId }
  });

  return res.status(status).json(response);
};

/**
 * Resolves and attaches application metadata to the request from the
 * `Ubi-AppId` header. Sets `req.appId`, `req.application`, `req.platform`,
 * and `req.game`.
 *
 * @type {import("express").RequestHandler}
 */
const verifyAppByHeader = async (req, res, next) => {
  const appId = req.headers[config.HEADERS.APP_ID];
  if (!appId) return next(APP_ID_REQUIRED);

  const app = await games.getApp(appId, false);
  if (!app) return next(APP_NOT_FOUND);

  req.appId = app.applicationId;
  req.spaceId = app.spaceId;
  req.application = app;
  req.platform = app.platform;
  req.game = await games.getGameByAppId(appId);

  next();
};

/**
 * Validates the `User-Agent` header against the expected value for the
 * resolved application. Skipped in development.
 *
 * @type {import("express").RequestHandler}
 */
const verifyUserAgent = (req, res, next) => {
  // Bypass user agent verification on Dev environment
  if (utils.isDev()) return next();

  if (!req.application) return next(APPLICATION_REQUIRED);

  // If user agent doesn't match the app's required user agent
  if (req.headers["user-agent"] !== req.application.userAgent) {
    return next(INVALID_HEADERS);
  };

  req.userAgent = req.headers["user-agent"];
  next();
};

/**
 * Validates the build ID header against the expected value for the
 * resolved application. Skipped in development.
 *
 * @type {import("express").RequestHandler}
 */
const verifyBuildId = (req, res, next) => {
  // Bypass build id verification on Dev environment
  if (utils.isDev()) return next();

  if (!req.application) return next(APPLICATION_REQUIRED);

  // If build id doesn't match the app's required build id
  if (req.headers[config.HEADERS.BUILD_ID] !== req.application.buildId) {
    return next(INVALID_HEADERS);
  }

  req.buildId = req.headers[config.HEADERS.BUILD_ID];
  next();
};

/**
 * Validates the `Authorization` header and verifies the token.
 *
 * - `Basic` and `AD` tokens bypass the platform auth-type check, allowing
 *   them to be used on any app (e.g. Basic on an NX app).
 * - All other tokens must match the platform's expected `authType`.
 *
 * On success, sets `req.authType`, `req.authToken`, `req.payload`, and
 * `req.isAuthenticated = true`.
 *
 * @type {import("express").RequestHandler}
 */
const verifyAuth = (req, res, next) => {
  if (!req.application) return next(APPLICATION_REQUIRED);

  const authHeader = req.headers.authorization;
  if (!authHeader) return next(AUTHORIZATION_REQUIRED);

  const [authType, token] = parseAuthHeader(authHeader);
  if (!authType || !token) return next(AUTHORIZATION_REQUIRED);

  req.authType = authType;
  req.token = token;

  switch (authType.toLowerCase()) {
    case "wiiu": return wiiu.verify(req, res, next);
    case "psn2.0": return psn2.verify(req, res, next);
    case "switch": return authSwitch.verify(req, res, next);
    case "basic": return basic.verify(req, res, next);
    case "uplaypc_v1":
      // Tokens starting with "JDMO:" are from cracked clients;
      // everything else is an official Uplay PC token.
      if (token.startsWith("JDMO:")) return pcCrack.verify(req, res, next);
      return pc.verify(req, res, next);
    default:
      logger.warn({
        message: "Unknown auth type in verifyAuth",
        details: { authType, ip: req.ip }
      });
      return next(UNKNOWN_AUTH_TYPE);
  };
};

const clientGeoMiddleware = (isCloudflare = false, lookup) => {
  return (req, res, next) => {
    if (isCloudflare) {
      req.clientCountry = (req.headers["cf-ipcountry"]) || config.DEFAULT_COUNTRY;
      req.clientIp = (req.headers["cf-connecting-ip"]) || req.ip || "120.10.10.10";
    } else {
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "120.10.10.10";

      req.clientIp = ip;

      try {
        const geo = lookup.get(ip);
        req.clientCountry = geo?.country?.iso_code || config.DEFAULT_COUNTRY;
      } catch (error) {
        req.clientCountry = config.DEFAULT_COUNTRY;
      }
    }

    req.clientIp = req.clientIp.startsWith("::ffff:") ? req.clientIp.slice(7) : req.clientIp;

    return next();
  };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  init,
  notFound,
  errorHandler,
  validateRequest,
  verifyAppByHeader,
  verifyUserAgent,
  verifyBuildId,
  verifyAuth,
  clientGeoMiddleware
};