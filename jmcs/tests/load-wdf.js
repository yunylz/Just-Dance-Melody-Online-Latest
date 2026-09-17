/**
 * CLI test script: loads the WDF server JSON config files into MongoDB
 * (the `WdfConfig` collection that the dashboard manages).
 *
 * Run from the jmcs root:
 *   npx ts-node tests/load-wdf.ts
 *
 * It reads the four WDF data files from the local world-dance-floor checkout
 * and upserts them into the DB. The dashboard / WDF server then use the DB,
 * not these files.
 */
import "dotenv/config";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import mongoose from "mongoose";
global.root = path.join(__dirname, "..");
import config from "../src/config";
import WdfConfigModel from "../src/lib/models/wdf-config";
import { createLogger } from "../src/lib/logger";
const logger = createLogger({ service: "load-wdf" });
// Location of the WDF server data files (local checkout).
const WDF_DATA_PATH = "/Users/batin/Documents/_JDMO/world-dance-floor/src/data";
const WDF_FILES = ["config", "schedule", "rooms", "bosses"];
async function main() {
    logger.info("Connecting to MongoDB...");
    await mongoose.connect(config.MONGODB_URI);
    const imported = [];
    const missing = [];
    for (const name of WDF_FILES) {
        const filePath = path.join(WDF_DATA_PATH, `${name}.json`);
        if (!existsSync(filePath)) {
            logger.warn(`File not found: ${filePath}`);
            missing.push(filePath);
            continue;
        }
        const data = JSON.parse(readFileSync(filePath, "utf-8"));
        await WdfConfigModel.updateOne({ name }, { $set: { name, data, updatedAt: Date.now(), updatedBy: "cli" } }, { upsert: true });
        imported.push(name);
        logger.info(`Loaded "${name}" from ${filePath}`);
    }
    console.log(JSON.stringify({ success: true, imported, missing }, null, 2));
    await mongoose.disconnect();
    logger.info("Done.");
}
main().catch((err) => {
    console.error("Failed to load WDF configs:", err);
    process.exit(1);
});
