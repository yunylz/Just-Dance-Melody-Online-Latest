import { Request, Response, NextFunction } from "express";
import SongModel from "../models/song";
import { Tag } from "../models/tag";

export default {
    run: async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Fetch all songs as plain objects to prevent Mongoose from stripping invalid string tags
            const songs = await SongModel.find({}).lean();
            const uniqueTags = new Set<string>();

            // 2. Collect unique string tags
            for (const song of songs) {
                for (const tag of (song.tags || [])) {
                    if (typeof tag === "string") {
                        uniqueTags.add(tag);
                    }
                }
            }

            // 3. Ensure all unique tags exist in the DB
            const tagMap = new Map<string, any>(); // Map string name -> ObjectId
            for (const tagName of uniqueTags) {
                let tagDoc = await Tag.findOne({ name: tagName });
                if (!tagDoc) {
                    tagDoc = new Tag({ name: tagName });
                    await tagDoc.save();
                }
                tagMap.set(tagName, tagDoc._id);
            }

            // 4. Update songs with ObjectIds using bulk operations
            let updatedCount = 0;
            const bulkOps = [];
            
            for (const song of songs) {
                let needsUpdate = false;
                const newTags: any[] = [];

                for (const tag of (song.tags || [])) {
                    if (typeof tag === "string" && tagMap.has(tag)) {
                        newTags.push(tagMap.get(tag));
                        needsUpdate = true;
                    } else if (typeof tag === "string") {
                        // In case it's already a 24-byte hex string ObjectId but just passed through as string
                        newTags.push(tag);
                    } else {
                        // Already an ObjectId or object
                        newTags.push(tag);
                    }
                }

                if (needsUpdate) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: song._id },
                            update: { $set: { tags: newTags } }
                        }
                    });
                    updatedCount++;
                }
            }

            if (bulkOps.length > 0) {
                await SongModel.bulkWrite(bulkOps);
            }

            return res.json({ 
                success: true, 
                message: `Migration complete. Created/Verified ${tagMap.size} tags. Updated ${updatedCount} songs.` 
            });

        } catch (err: any) {
            return next({ status: 500, message: err.message, error: err });
        }
    }
};
