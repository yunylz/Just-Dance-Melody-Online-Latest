/**
 * Auto-loads the quest database JSON into MongoDB on first boot.
 *
 * In production (Docker / Coolify) the database starts empty, so on startup we
 * seed the `Quest` collection from `src/config/quest-data/quests.json` the first
 * time the server runs. Once any quests exist, seeding is skipped so dashboard
 * edits are never overwritten on restart.
 */
import fs from "node:fs";
import path from "node:path";

import QuestModel from "./models/quest";
import { createLogger } from "./logger";

const logger = createLogger({ service: "quest-bootstrap" });

// In dev (tsx/ts-node) __dirname is src/lib  -> src/config/quest-data.
// In prod (compiled, Dockerfile copies the folder) __dirname is dist/src/lib
// -> dist/src/config/quest-data.
const DEV_DATA_DIR = path.join(__dirname, "..", "config", "quest-data");
const PROD_DATA_DIR = path.join(process.cwd(), "src", "config", "quest-data");
const DATA_DIR = fs.existsSync(DEV_DATA_DIR) ? DEV_DATA_DIR : PROD_DATA_DIR;

/**
 * Seeds the quest collection only when it's completely empty. Safe to call on
 * every startup; does nothing once any quests exist in the DB.
 */
export default async function questBootstrap(): Promise<void> {
    try {
        const count = await QuestModel.countDocuments();
        if (count > 0) {
            logger.info(`Quest collection already has ${count} quests, skipping auto-load.`);
            return;
        }

        const filePath = path.join(DATA_DIR, "quests.json");
        if (!fs.existsSync(filePath)) {
            logger.warn(`Quest data file not found: ${filePath}`);
            return;
        }

        const { quests } = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!Array.isArray(quests) || quests.length === 0) {
            logger.warn("Quest seed file contains no quests, skipping.");
            return;
        }

        logger.info(`Seeding ${quests.length} quests from ${filePath}`);
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
                        updatedBy: "bootstrap",
                    },
                },
                { upsert: true }
            );
        }
        logger.info("Quest auto-load complete.");
    } catch (err) {
        // Never crash the server because seeding failed.
        logger.error("Failed to auto-load quests:", err);
    }
}
