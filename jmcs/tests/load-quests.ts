/**
 * CLI script: imports the quest database from `src/config/quest-data/quests.json`
 * into MongoDB (the `Quest` collection served by `/questdb/v1/quests`).
 *
 * Run from the jmcs root:
 *   npx tsx tests/load-quests.ts
 *
 * Idempotent: existing quests are upserted by `id`, so re-running just refreshes.
 */
import "dotenv/config";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import mongoose from "mongoose";

(global as any).root = path.join(__dirname, "..");

import config from "../src/config";
import QuestModel from "../src/lib/models/quest";
import { createLogger } from "../src/lib/logger";

const logger = createLogger({ service: "load-quests" });

// In-repo seed data (shipped with the project).
const QUEST_DATA_PATH = path.join(__dirname, "..", "src", "config", "quest-data", "quests.json");

async function main() {
    logger.info("Connecting to MongoDB...");
    await mongoose.connect(config.MONGODB_URI as string);

    if (!existsSync(QUEST_DATA_PATH)) {
        console.error(`File not found: ${QUEST_DATA_PATH}`);
        process.exit(1);
    }

    const { quests } = JSON.parse(readFileSync(QUEST_DATA_PATH, "utf-8"));
    let imported = 0;

    for (const quest of quests) {
        await QuestModel.updateOne(
            { id: quest.id },
            {
                $set: {
                    id: quest.id,
                    title: quest.title,
                    locked: quest.locked ?? 0,
                    playlist: quest.playlist ?? [],
                    assetUrls: quest.assetUrls ?? {},
                    updatedAt: Date.now(),
                    updatedBy: "cli",
                },
            },
            { upsert: true }
        );
        imported += 1;
        logger.info(`Imported quest "${quest.id}" (${quest.title})`);
    }

    console.log(JSON.stringify({ success: true, imported }, null, 2));

    await mongoose.disconnect();
    logger.info("Done.");
}

main().catch((err) => {
    console.error("Failed to import quests:", err);
    process.exit(1);
});
