const winston = require("winston");
const LokiTransport = require("winston-loki");

const config = require("../config");
const utils = require("./utils");

/**
 * Creates a logger with given service name
 * @param {String} service
 * @returns {winston}
 */
module.exports.createLogger = ({ service }) => {
    if (!service) throw new Error(`A service name is required in order to create a logger.`);

    const levels = {
        error: 0,
        warn: 1,
        info: 2,
        success: 3,
        http: 4,
        cheat: 5,
        debug: 6,
    };

    const colors = {
        error: "red",
        warn: "yellow",
        info: "cyan",
        success: "green",
        http: "magenta",
        cheat: "redBG",
        debug: "white",
    };

    winston.addColors(colors);

    const level =
        config?.LOG_LEVEL || process.env.LOG_LEVEL || utils.isDev()
            ? "debug"
            : "info";

    // Shared JSON format for Loki (no colorize, clean JSON)
    const jsonFormat = winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD_HH:mm:ss" }),
        winston.format.printf((info) => {
            const { timestamp, level, message, error = null, details = null } = info;
            const msg = typeof message === "string" ? message : JSON.stringify(message);
            const payload = {
                date: timestamp,
                service,
                level,
                message: msg,
            };
            if (error !== null)
                payload.error =
                    error instanceof Error
                        ? { message: error.message, stack: error.stack }
                        : error;
            if (details !== null) payload.details = details;
            return JSON.stringify(payload);
        })
    );

    const transports = [
        new winston.transports.Console({ format: jsonFormat }),
    ];

    // Ship to Loki if configured
    const lokiHost = config?.LOKI_HOST || process.env.LOKI_HOST;
    if (lokiHost) {
        transports.push(
            new LokiTransport({
                host: lokiHost,
                // Labels appear as filter dimensions in Grafana's Loki explorer
                labels: {
                    job: "hub-api",        // top-level grouping — always the API name
                    service,               // sub-component within the API
                    env: config?.ENV || process.env.NODE_ENV || "production",
                },
                // Send each log as a JSON string so all fields are queryable in Loki
                format: winston.format.combine(
                    winston.format.timestamp({ format: "YYYY-MM-DD_HH:mm:ss" }),
                    winston.format.json()
                ),
                json: true,
                batching: true,
                interval: 5, // flush every 5 seconds
                replaceTimestamp: true,
                onConnectionError: (err) =>
                    console.error(`[loki] connection error: ${err.message}`),
            })
        );
    } else {
        if (!utils.isLocal()) {
            console.warn(`[logger] LOKI_HOST not set — logs will not be shipped to Loki`);
        };
    };

    return winston.createLogger({
        level,
        levels,
        format: jsonFormat,
        transports,
    });
};