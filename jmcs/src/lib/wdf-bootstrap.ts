/**
 * Auto-loads the WDF data JSON files into MongoDB on first boot.
 *
 * In production (Docker / Coolify) the database starts empty and nobody runs the
 * manual CLI import, so on startup we seed the `WdfConfig` collection from the
 * JSON files shipped in `src/config/wdf-data`.
 *
 * Idempotent: configs that already exist in the DB are left untouched, so
 * dashboard edits are never overwritten on restart.
 */
import fs from "node:fs";
import path from "node:path";

import WdfConfigModel from "./models/wdf-config";
import { createLogger } from "./logger";

const logger = createLogger({ service: "wdf-bootstrap" });

/** The four WDF configs managed by the dashboard. */
const WDF_NAMES = ["config", "schedule", "rooms", "bosses"] as const;

// In dev (tsx/ts-node) __dirname is src/lib  -> src/config/wdf-data.
// In prod (compiled, Dockerfile copies the folder) __dirname is dist/src/lib
// -> dist/src/config/wdf-data.
const DEV_DATA_DIR = path.join(__dirname, "..", "config", "wdf-data");
const PROD_DATA_DIR = path.join(process.cwd(), "src", "config", "wdf-data");
const DATA_DIR = fs.existsSync(DEV_DATA_DIR) ? DEV_DATA_DIR : PROD_DATA_DIR;

/**
 * Seeds any missing WDF configs from the JSON files. Safe to call on every
 * startup; does nothing once all four configs exist in the DB.
 */
export default async function wdfBootstrap(): Promise<void> {
    try {
        const existing = await WdfConfigModel.find({ name: { $in: [...WDF_NAMES] } })
            .select("name")
            .lean();

        const existingNames = new Set(existing.map((d) => (d as { name: string }).name));
        const missing = WDF_NAMES.filter((name) => !existingNames.has(name));

        if (missing.length === 0) {
            logger.info("WDF configs already in DB, skipping auto-load.");
            return;
        }

        logger.info(`Seeding missing WDF configs: ${missing.join(", ")}`);
        for (const name of missing) {
            const filePath = path.join(DATA_DIR, `${name}.json`);
            if (!fs.existsSync(filePath)) {
                logger.warn(`WDF data file not found: ${filePath}`);
                continue;
            }

            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            await WdfConfigModel.updateOne(
                { name },
                { $set: { name, data, updatedAt: Date.now(), updatedBy: "bootstrap" } },
                { upsert: true }
            );
            logger.info(`Loaded "${name}" from ${filePath}`);
        }
    } catch (err) {
        // Never crash the server because seeding failed; the dashboard/WDF
        // server can still be configured manually.
        logger.error("Failed to auto-load WDF configs:", err);
    }
}
