/**
 * Standalone CLI entry point for migrating JDMO JSON dumps into MongoDB.
 *
 * Most of the logic lives in src/lib/migrate/songdb.ts so it can be
 * reused by the admin API (manage-songs.ts → SSE stream).
 */
import "dotenv/config";
import { migrateOnce } from "../src/lib/migrate/songdb";

migrateOnce().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});