const axios = require("axios");
const crypto = require("crypto");
const config = require("../config");
const { CANT_ENCRYPT_PRETENDO_TOKEN, INTERNAL_SERVER_ERROR } = require("../lib/http-codes");
const utils = require("../lib/utils");

const getHeaders = (headers = {
    "x-nintendo-device-type": "",
}) => {
    return {
        deviceType: headers["x-nintendo-device-type"] || "",
        deviceId: headers["x-nintendo-device-id"] || "",
        serial: headers["x-nintendo-serial-number"] || "",
        region: headers["x-nintendo-region"] || "",
        country: headers["x-nintendo-country"] || "",
        titleId: headers["x-nintendo-title-id"] || "",
        applicationVersion: headers["x-nintendo-application-version"] || "",
        clientId: headers["x-nintendo-client-id"] || "",
        clientSecret: headers["x-nintendo-client-secret"] || "",
        authorization: headers["authorization"] ? (headers["authorization"].split(" ")[1] || "") : "",
        timestamp: Math.floor(Date.now() / 1000)
    }
};

module.exports = (app, publicRouter, privateRouter, logger) => {

    // log all requests to see what we receive
    publicRouter.use((req, res, next) => {
        logger.info(`Received request: ${req.method} ${req.originalUrl}`);
        next();
    });

    // Encryption function
    function encryptToken(payload) {
        try {
            const cipher = crypto.createCipheriv('aes-128-cbc', config.PRETENDO.SECRET_KEY, config.PRETENDO.IV);
            let encrypted = cipher.update(payload, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        } catch (error) {
            logger.error('Error encrypting token:', error);
            return '';
        }
    }

    function serviceTokenRoute(req, res, next) {
        try {
            // Parse client_id from query parameters
            const clientId = req.query.client_id || null;

            // Extract Nintendo headers
            const nintendoHeaders = {};
            Object.keys(req.headers).forEach(key => {
                key = key.toLowerCase()
                if (key.startsWith('x-nintendo-') || key == "authorization") nintendoHeaders[key] = req.headers[key];
            });

            // Build token payload
            const tokenPayload = getHeaders(nintendoHeaders);

            // Encrypt the token
            const tokenStr = JSON.stringify(tokenPayload);
            const encryptedToken = encryptToken(tokenStr);

            if (!encryptedToken) {
                logger.error('Failed to encrypt token');
                return next(CANT_ENCRYPT_PRETENDO_TOKEN)
            }

            // Generate XML response
            const xmlResponse = `<service_token><token>${encryptedToken}</token></service_token>`;

            logger.info(`Generated service token for deviceId: ${tokenPayload.deviceId}`);

            // Send response
            res.set({
                'Content-Type': 'application/xml',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            return res.send(xmlResponse);
        } catch (error) {
            logger.error('Error processing service token request:', error);
            return next(INTERNAL_SERVER_ERROR);
        }
    }

    // Helper function to proxy service_token requests to Pretendo
    async function proxyServiceTokenToPretendo(req, res) {
        try {
            const targetUrl = `https://account.pretendo.cc${req.originalUrl}`;

            logger.info(`Proxying service_token to Pretendo: ${req.method} ${targetUrl}`);

            // Prepare the request configuration
            const axiosConfig = {
                method: req.method.toLowerCase(),
                url: targetUrl,
                headers: {
                    ...req.headers,
                    // Remove host header to avoid conflicts
                    host: undefined,
                    connection: 'close'
                },
                data: req.body,
                // Don't follow redirects automatically
                maxRedirects: 0,
                // Handle response validation
                validateStatus: () => true
            };

            // Make the request to the target server
            const response = await axios(axiosConfig);

            // Copy response headers (excluding some that shouldn't be forwarded)
            const headersToExclude = ['content-encoding', 'transfer-encoding', 'connection'];
            Object.keys(response.headers).forEach(header => {
                if (!headersToExclude.includes(header.toLowerCase())) {
                    res.set(header, response.headers[header]);
                }
            });

            // Set status and send response
            res.status(response.status).send(response.data);

        } catch (error) {
            logger.error('Proxy error:', error.message);
            res.status(500).json({
                error: 'Proxy request failed',
                message: error.message
            });
        }
    }

    // Only handle /provider/service_token/@me endpoint
    publicRouter.all('/provider/service_token/@me', async (req, res, next) => {
        // Only handle GET and POST methods
        if (req.method === 'GET' || req.method === 'POST') {

            // Only return service token route if we are handling a JD title ID.
            // This is added on Dec 9 2025, before this date all titleIds (even non-JD) were accepted.
            // This caused some Pretendo services to fail and not work since they can't handle our custom token.
            const headers = getHeaders(req.headers);
            const titleId = headers.titleId;

            if (utils.isJDTitleId(titleId)) {
                logger.info(`Handling service_token locally for JD title: ${titleId}`);
                return serviceTokenRoute(req, res, next);
            } else {
                // Non-JD titles should be forwarded to Pretendo
                logger.info(`Forwarding service_token to Pretendo for non-JD title: ${titleId}`);
                return proxyServiceTokenToPretendo(req, res);
            }
        } else {
            // For other methods, return method not allowed
            return res.status(405).json({
                error: 'Method not allowed',
                allowed: ['GET', 'POST']
            });
        }
    });

    // All other routes return 404
    publicRouter.all('/*path', (req, res) => {
        logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
        res.status(404).json({
            error: 'Not Found',
            message: 'This endpoint only handles /provider/service_token/@me'
        });
    });
};