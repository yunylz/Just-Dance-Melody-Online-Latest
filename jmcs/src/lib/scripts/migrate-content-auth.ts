import fs from 'node:fs/promises';
import path from 'node:path';
import { Request, Response } from 'express';
import Song from '../models/song';
import { createLogger } from '../logger';

const logger = createLogger({ service: 'migrate-content-auth' });

export default {
    run: async (req: Request, res: Response) => {
        // No longer used.
        return res.sendStatus(503);

        // try {
        //     const contentAuthMaps = path.resolve(process.cwd(), "_old_jdmo/data/maps");
            
        //     logger.info(`Starting content auth migration from ${contentAuthMaps}`);
            
        //     let content: string[];
        //     try {
        //         content = await fs.readdir(contentAuthMaps);
        //     } catch (err) {
        //         logger.error(`Failed to read directory ${contentAuthMaps}: ${err}`);
        //         return res.status(500).json({ success: false, error: `Directory not found: ${contentAuthMaps}` });
        //     }

        //     let processedCount = 0;
        //     let updatedCount = 0;

        //     for (const file of content) {
        //         if (!file.endsWith(".json")) continue;

        //         const mapName = file.replace(".json", "");
        //         const filePath = path.join(contentAuthMaps, file);

        //         try {
        //             const fileContent = await fs.readFile(filePath, "utf-8");
        //             const data = JSON.parse(fileContent);

        //             if (!data.urls) continue;

        //             const song = await Song.findOne({ mapName });
        //             if (!song) {
        //                 logger.warn(`Song not found in DB for mapName: ${mapName}`);
        //                 continue;
        //             }

        //             if (!song.urls) {
        //                 song.urls = {};
        //             }

        //             let updated = false;

        //             for (const key of Object.keys(song.urls)) {
        //                 if (!key.startsWith("jmcs://")) {
        //                     delete song.urls[key];
        //                     updated = true;
        //                 }
        //             }

        //             for (const [key, value] of Object.entries(data.urls)) {
        //                 if (key.startsWith("jmcs://")) {
        //                     song.urls[key] = value;
        //                     updated = true;
        //                 }
        //             }

        //             if (updated) {
        //                 song.markModified("urls");
        //                 await song.save();
        //                 logger.info(`Migrated URLs for ${mapName}`);
        //                 updatedCount++;
        //             }
        //             processedCount++;
        //         } catch (err) {
        //             logger.error(`Error processing ${file}: ${err}`);
        //         }
        //     }

        //     logger.info(`Migration finished. Processed ${processedCount} files, updated ${updatedCount} songs.`);
        //     return res.json({ 
        //         success: true, 
        //         message: "Migration completed successfully.",
        //         details: {
        //             processed: processedCount,
        //             updated: updatedCount
        //         }
        //     });
        // } catch (err: any) {
        //     logger.error(`Migration failed: ${err.message}`);
        //     return res.status(500).json({ success: false, error: err.message });
        // }
    }
};
