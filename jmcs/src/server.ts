(global as any).root = __dirname;

import "dotenv/config";
import express, { Request, Response } from 'express';
import maxmind from "maxmind";
import fs from "node:fs";
import path from "node:path";

import validateConfig from "./config/validator";
import config from './config';

import { createLogger } from "./lib/logger";
import loadServices from "./lib/load-services";
import loadClients from "./lib/load-clients";
import httpMiddleware from "./lib/http-middleware";
import liveClient from "./lib/live-client";
import jmcs from "./lib/jmcs-helper";
import { recordRequest } from "./lib/metrics-store";
import { syncStoreToPrometheus } from "./lib/prometheus-metrics";
import promClient from "prom-client";
import recommendation from "./lib/recommendation";
import utils from "./lib/utils";
import wdfBootstrap from "./lib/wdf-bootstrap";
import questBootstrap from "./lib/quest-bootstrap";

const app = express();
const logger = createLogger({ service: "server" });

// Hardcoded bearer token for /metrics endpoint — not a critical secret, just basic access control.
const METRICS_TOKEN = "jmcs-prometheus-token";

// Middleware
httpMiddleware.init(app, logger);

// Docsify documentation, only available for dev or local
if (utils.isDev() || utils.isLocal()) {
    app.use("/docs", express.static(path.join(__dirname, "docs")));
};

// Entry
(async () => {
    logger.info("JMCS is starting...");

    // Validate configuration
    validateConfig(config);

    // If server is not under Cloudflare, we check for local mmdb path for Geo library to work.
    let lookup = null;
    if (!config.IS_CLOUDFLARE) {
        const mmdbPath = config.MMDB_PATH as string;
        const { exists: dbExists } = utils.ensureDbExists(mmdbPath);

        // If the .mmdb file doesn't exist, throw an error and exit the server.
        if (!dbExists) {
            logger.error({
                message: `JMCS started with IS_CLOUDFLARE as disabled and GeoLite .mmdb is missing. Please make sure "MMDB_PATH" in environment is set to an existing file.`
            });
            process.exit(1);
        }

        lookup = await maxmind.open(mmdbPath);
    }

    app.use(httpMiddleware.getClientCountry(config.IS_CLOUDFLARE, lookup));

    // Request tracking middleware — records every request for the /metrics endpoint
    app.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
            recordRequest({
                method: req.method,
                path: req.route?.path ?? req.originalUrl,
                status: res.statusCode,
                latencyMs: Date.now() - start,
                ip: req.ip ?? "",
                timestamp: new Date().toISOString(),
            });
        });
        next();
    });

    if (utils.isLocal() || utils.isDev()) {
        const logFile = path.join(__dirname, 'requests.log');
        const logFileAdmin = path.join(__dirname, 'requests-admin.log');

        logger.info("HTTP request logging enabled.");

        app.use((req, res, next) => {
            const start = Date.now();

            res.on('finish', () => {
                const duration = Date.now() - start;
                const logEntry = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms\n | Headers: ${JSON.stringify(req.headers, null, 2)} | Body: ${JSON.stringify(req.body, null, 2)}`;

                if (req.originalUrl.startsWith('/v1/admin')) {
                    fs.appendFile(logFileAdmin, logEntry, (err) => { if (err) console.error('Failed to write admin log:', err); });
                } else {
                    fs.appendFile(logFile, logEntry, (err) => { if (err) console.error('Failed to write log:', err); });
                }
            });

            next();
        });
    }

    await loadClients();
    // Seed WDF configs from src/config/wdf-data on first boot (prod DB is empty).
    await wdfBootstrap();
    // Seed the quest database from src/config/quest-data on first boot.
    await questBootstrap();
    await loadServices(app);
    await jmcs.boot();
    liveClient.init();
    recommendation.init();

    // Auth middleware for /metrics
    app.use("/metrics", (req, res, next) => {
        const auth = req.headers.authorization;
        const requiresAuth = !utils.isLocal();
        if (requiresAuth) {
            if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== METRICS_TOKEN) {
                return res.status(401).set("WWW-Authenticate", "Bearer").end();
            }
        }
        next();
    });

    app.get("/metrics", async (_req, res, next) => {
        try {
            await syncStoreToPrometheus();
            res.setHeader("Content-Type", promClient.register.contentType);
            return res.end(await promClient.register.metrics());
        } catch (err) {
            return next(err);
        }
    });

    // 404 handler middleware
    app.use(httpMiddleware.notFound);

    // Start server
    app.listen(config.PORT, () => {
        const FQDN = config.FQDN ?? `http://localhost:${config.PORT}`;
        logger.info(`JMCS has started on port ${config.PORT} in ${config.ENV} mode`);
        logger.info(`Visit ${FQDN} to see the API in action`);
    });

    // Setup error handler middleware
    app.use(httpMiddleware.errorHandler);
})();

// Process error handler
process.on("uncaughtException", (err: any) => {
    console.error(err);
    logger.error({
        message: "JMCS has crashed due to an uncaught exception.",
        error: {
            message: utils.stripAnsi(err?.message ?? String(err)),
            stack: utils.stripAnsi(err?.stack ?? ""),
        },
    });
    process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
    console.error(reason);
    logger.error({
        message: "Unhandled promise rejection.",
        error: {
            message: utils.stripAnsi(reason?.message ?? String(reason)),
            stack: utils.stripAnsi(reason?.stack ?? ""),
        },
    });
    process.exit(1);
});