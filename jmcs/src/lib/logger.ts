import winston from "winston";
import TransportStream from "winston-transport";
import LokiTransport from "winston-loki";
import utils from "./utils";
import config from "../config";
import * as webhook from "./webhook";

interface LoggerOptions {
  service: string;
  job?: string;
  logToFile?: boolean;
  logFilePath?: string;
}

export interface CustomLogger extends winston.Logger {
  error: winston.LeveledLogMethod;
  warn: winston.LeveledLogMethod;
  info: winston.LeveledLogMethod;
  success: winston.LeveledLogMethod;
  cheat: winston.LeveledLogMethod;
  debug: winston.LeveledLogMethod;
}

class CheatAlertTransport extends TransportStream {
  log(info: any, callback: () => void) {
    if (info.level !== "cheat") {
      callback();
      return;
    }
    const { message, details } = info;
    webhook.cheat(message, details);
    callback();
  }
}

/**
 * Creates a logger with given service name.
 * Cheat-level logs automatically send a Discord webhook alert.
 * Ships logs to Loki when LOKI_HOST env var is set.
 */
export function createLogger({
  service,
  logToFile = false,
  logFilePath = "./log.txt",
}: LoggerOptions): CustomLogger {
  if (!service) {
    throw new Error("A service name is required in order to create a logger.");
  }

  // job = top-level API name (e.g. "jmcs"), service = sub-component (e.g. "auth-file")
  const jobName = config.SERVICE_NAME;

  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    http: 4,
    cheat: 5,
    debug: 6,
  };

  const colors: Record<string, string> = {
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
    (global as any).config?.LOG_LEVEL ||
    process.env.LOG_LEVEL ||
    (utils.isDev() ? "debug" : "info");

  const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD_HH:mm:ss" }),
    winston.format.printf((info) => {
      const { timestamp, level, message, error = null, details = null } = info as any;
      const msg = typeof message === "string" ? message : JSON.stringify(message);
      const payload: Record<string, any> = {
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

  const transports: TransportStream[] = [
    new winston.transports.Console({ format: jsonFormat }),
    new CheatAlertTransport(),
  ];

  // Ship to Loki if configured
  const lokiHost = config.LOKI_HOST || process.env.LOKI_HOST;
  if (lokiHost) {
    transports.push(
      new LokiTransport({
        host: lokiHost,
        labels: {
          job: jobName,
          service,
          env: process.env.NODE_ENV || "production",
        },
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD_HH:mm:ss" }),
          winston.format.json()
        ),
        json: true,
        batching: true,
        interval: 5,
        replaceTimestamp: true,
        onConnectionError: (err: Error) =>
          console.error(`[loki] connection error: ${err.message}`),
      })
    );
  } else {
    if (!utils.isLocal()) {
        console.warn(`[logger] LOKI_HOST not set — logs will not be shipped to Loki`);
    }
  }

  if (logToFile) {
    transports.push(
      new winston.transports.File({
        filename: logFilePath,
        level,
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  return winston.createLogger({
    level,
    levels,
    format: jsonFormat,
    transports,
  }) as CustomLogger;
}