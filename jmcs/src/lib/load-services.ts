
import { Router, Express } from "express";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import config from "../config";
import { createLogger } from "./logger";

const logger = createLogger({ service: "load-services" });

/**
 * Loads all available services in "./services" folder and creates a router for them.
 * We have both public and private routers, public is self explaining
 * meanwhile private is used for dev environments.
 * You can enable private routes with "PRIVATE_ROUTES" in config.
 */
export default function loadServices(app: Express): void {
    const servicesPath = path.resolve(__dirname, "../services");
    const content = readdirSync(servicesPath).filter((f) => !f.startsWith("_") && (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts"));

    if (content.length === 0) {
        logger.warn("No services found in the services folder.");
        return;
    }

    for (const filename of content) {
        const fullPath = path.resolve(servicesPath, filename);

        if (!statSync(fullPath).isFile()) continue;

        const [name, version] = filename.split(".");

        const route = `/${name}/${version}`;

        const publicRouter = Router({
            strict: true,
            caseSensitive: true,
        });

        const privateRouter = Router({
            strict: true,
            caseSensitive: true,
        });

        const serviceLogger = createLogger({ service: `${name}-${version}` });
        const serviceModule = require(fullPath).default;

        serviceModule(app, publicRouter, privateRouter, serviceLogger);

        app.use(route, publicRouter);

        logger.info({
            message: `Loaded service`,
            details: {
                name,
                version,
            }
        });

        if (config.PRIVATE_ROUTERS) {
            app.use(route, privateRouter);
        }
    }
}