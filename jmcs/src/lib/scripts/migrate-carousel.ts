import fs from 'node:fs/promises';
import path from 'node:path';
import { Request, Response, NextFunction } from 'express';
import { CarouselRule, CarouselItemList, ActionList } from '../models/carousel';
import { createLogger } from '../logger';

const logger = createLogger({ service: 'migrate-carousel' });

export default {
    run: async (req: Request, res: Response) => {
        try {
            const contentDir = path.resolve((global as any).root, "content");
            
            // 1. Migrate Action Lists (from carousel-rules.json)
            const rulesPath = path.join(contentDir, "carousel-rules.json");
            const rulesData = JSON.parse(await fs.readFile(rulesPath, "utf-8"));
            
            if (rulesData.actionLists) {
                logger.info("Migrating Action Lists...");
                for (const [name, data] of Object.entries(rulesData.actionLists)) {
                    await ActionList.findOneAndUpdate(
                        { name },
                        { name, actions: (data as any).actions },
                        { upsert: true }
                    );
                }
                logger.info(`Migrated ${Object.keys(rulesData.actionLists).length} Action Lists.`);
            }

            // 2. Migrate Carousel Rules (Pages)
            if (rulesData.rules) {
                logger.info("Migrating Carousel Rules...");
                for (const [pageName, data] of Object.entries(rulesData.rules)) {
                    await CarouselRule.findOneAndUpdate(
                        { pageName },
                        { 
                            pageName, 
                            onlineOnly: (data as any).onlineOnly || false,
                            categories: (data as any).categories || []
                        },
                        { upsert: true }
                    );
                }
                logger.info(`Migrated ${Object.keys(rulesData.rules).length} Carousel Rules.`);
            }

            // 3. Migrate Item Lists
            const itemListsPath = path.join(contentDir, "carousel-item-lists.json");
            try {
                const itemListsData = JSON.parse(await fs.readFile(itemListsPath, "utf-8"));
                logger.info("Migrating Item Lists...");
                for (const [name, data] of Object.entries(itemListsData)) {
                    await CarouselItemList.findOneAndUpdate(
                        { name },
                        { 
                            name, 
                            actionListName: (data as any).actionListName,
                            upsellActionListName: (data as any).upsellActionListName,
                            items: (data as any).list || [] 
                        },
                        { upsert: true }
                    );
                }
                logger.info(`Migrated ${Object.keys(itemListsData).length} Item Lists.`);
            } catch (err) {
                logger.warn(`Could not migrate item lists: ${err}`);
            }

            return res.json({ success: true, message: "Migration completed successfully." });
        } catch (err: any) {
            logger.error(`Migration failed: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
};
