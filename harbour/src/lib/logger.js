const fs = require("node:fs");
const path = require("node:path");
const winston = require("winston");
const LokiTransport = require("winston-loki");

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
        debug: 6
    };
    const colors = {
        error: "red",
        warn: "yellow",
        info: "cyan",
        success: "green",
        http: "magenta",
        cheat: "redBG",
        debug: "white"
    };

    winston.addColors(colors);

    const level = global.config?.LOG_LEVEL || process.env.LOG_LEVEL || utils.isDev() ? "debug" : "info";

    const format = winston.format.combine(
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
            if (error !== null) payload.error = error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error;
            if (details !== null) payload.details = details;

            return JSON.stringify(payload);
        })
    );

    const transports = [
        // Allow the use the console to print the messages
        new winston.transports.Console(),
        // Allow to write logs to file
        // new LokiTransport({
        //     host: "http://127.0.0.1:3100",
        //     labels: {
        //       job: global.config.METRICS.job,
        //       env: global.ENV
        //     }
        // })
    ];

    const logger = winston.createLogger({
        level,
        levels,
        format,
        transports
    });

    return logger;
};