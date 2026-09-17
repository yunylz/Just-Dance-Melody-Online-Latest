const fs = require("node:fs");
const Joi = require("joi");
const uuid = require("uuid");
const express = require("express");
const expressip = require('express-ip');
const cors = require("cors");

const utils = require("./utils");
const httpSchema = require("./http-schema");
const { INVALID_BODY, INVALID_QUERY, PASSWORD_TOO_WEAK } = require("./http-codes");
const path = require("node:path");
const logger = require("./logger").createLogger({ service: "http" });
const httpCodes = require("./http-codes");

/**
 * Determines if an HTTP status code represents a successful response
 * 
 * @param {number} status - HTTP status code to check
 * @returns {boolean} True if status is between 201-399 (successful), false otherwise
 * 
 * @example
 * isSuccessful(200); // true
 * isSuccessful(404); // false
 * isSuccessful(301); // true
 */
const isSuccessful = (status) => status > 200 && status < 400;

/**
 * Initializes Express application with essential middleware and security settings
 * Configures basic app settings for production readiness
 * 
 * @param {Object} app - Express application instance
 * @param {Object} logger - Logger instance for HTTP service
 * 
 * @description Applies the following configurations:
 * - Disables ETag generation for responses
 * - Removes X-Powered-By header for security
 * - Enables trust proxy for proper IP detection behind reverse proxies
 * 
 * @example
 * const app = express();
 * const logger = require('./logger').createLogger({ service: 'http' });
 * httpMiddleware.init(app, logger);
 */
module.exports.init = (app, logger) => {
  app.set("etag", false);
  app.set("x-powered-by", false);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'))

  const ALLOWED_ORIGINS = ["http://localhost:4173", "http://localhost:5173", "https://hub.dnceprty.co", "https://dnceprty.co", "https://jdmo-hub.dnceprty.co", "https://hub.c0llydoll.dev", "https://hub.c0llydoll.com", "https://c0llydoll.dev", "https://test.dnceprty.co", "tauri://localhost", "https://hub-api.c0llydoll.dev"];
  const LOCAL_NETWORK_PATTERN = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl)
        if (!origin) return callback(null, true);
        // Allow explicit origins
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // Allow local network IPs in dev
        if (utils.isDev() && LOCAL_NETWORK_PATTERN.test(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    })
  );

  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(this.validateRequest);
  app.use("/public", express.static(path.join(global.root, "public")));
};

/**
 * Express middleware for handling 404 Not Found errors
 * Returns a simple 404 status without response body
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} HTTP 404 response with empty body
 * 
 * @example
 * // Use as final middleware to catch unmatched routes
 * app.use('*', httpMiddleware.notFound);
 */
module.exports.notFound = (req, res, next) => {
  return res.status(404).end();
};

/**
 * Express error handling middleware for processing and responding to server errors
 * Provides different error details based on environment (development vs production)
 * Logs all errors with request context for debugging
 * 
 * @param {Object|Error} err - Error object containing status, message, and optional error details
 * @param {number} [err.status=500] - HTTP status code for the error
 * @param {string} err.message - Error message to display
 * @param {Object} [err.error] - Additional error object with details
 * @param {Object} req - Express request object
 * @param {string} req.ip - Client IP address
 * @param {string} req.method - HTTP method
 * @param {string} req.originalUrl - Original request URL
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON error response in development, empty response in production
 * 
 * @description Response structure in development:
 * - status {number} - HTTP status code
 * - message {string} - Error message
 * - error {Object} - Error details object
 * - errorMessage {string} - Nested error message if available
 * - isSuccessful {boolean} - Always false for errors
 * - serverTime {Date} - Timestamp when error occurred
 * - requestId {string} - Unique UUID for tracking this error
 * 
 * @example
 * // Use as Express error handler (must be last middleware)
 * app.use(httpMiddleware.errorHandler);
 * 
 * // Trigger from route handler
 * app.get('/api/test', (req, res, next) => {
 *   return next({
 *     status: 400,
 *     message: 'Invalid request',
 *     error: new Error('Details here')
 *   });
 * });
 */
module.exports.errorHandler = (err, req, res, next) => {
  const status = (err.status || 500);
  let response = {
    status,
    message: err?.message,
    error: err?.error,
    errorId: null,
    errorCode: err?.code,
    errorMessage: err?.error?.message,
    isSuccessful: isSuccessful(status),
    serverTime: new Date(),
    requestId: uuid.v4()
  };

  if (err.code && err.message && err.status) {
    for (const [key, errs] of Object.entries(httpCodes)) {
      if (errs.code === err.code) {
        response.errorId = key;
        break;
      }
    }
  }

  logger.error(`${req.ip} - ${req.method} - ${req.originalUrl} - ${status}: ${JSON.stringify(response, null, 2)}`);

  return res.status(status).send(response);
};

module.exports.validateRequest = (req, res, next) => {
  const path = req.path;
  const method = req.method.toUpperCase();

  const schemaForPath = httpSchema[path];
  if (!schemaForPath) return next();

  const schema = schemaForPath[method];
  if (!schema) return next();

  const toValidate = Object.keys(schema);

  for (let i = 0; i < toValidate.length; i++) {
    const key = toValidate[i];
    // Default req[key] to {} if undefined
    const valueToValidate = req[key] || {};

    const { error } = schema[key].validate(valueToValidate);

    if (error) {
      logger.error({ path, method, error: error.details, [key]: req[key] });

      if (key === "body") {
        const passwordError = error.details.find(d => d.context?.key === "password");
        if (passwordError) return next(PASSWORD_TOO_WEAK);
        return next({ ...INVALID_BODY, message: error.details[0].message });
      }

      if (key === "query") return next(INVALID_QUERY);
      if (key === "params") return next(INVALID_PARAMS);
    }
  }

  next();
};
