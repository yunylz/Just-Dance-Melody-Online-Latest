
import fs from "node:fs/promises";
import path from "node:path";
import skus from "./skus";
import cache from "./cache";
import cacheKeys from "./cache-keys";

import { CarouselRule, CarouselItemList, ActionList } from "./models/carousel";

import { createLogger } from "./logger";

const logger = createLogger({ service: "jmcs-helper" });

class JMCS {
    constructor() { };

    /**
     * Main boot entry, where skus are loaded and set in cache for the whole server to use.
     */
    async boot() {
        await this.loadCarouselData();
    };

    async loadCarouselData() {
        try {
            logger.info("Loading carousel data from MongoDB...");

            // 1. Rules & Action Lists
            const [rules, actionLists] = await Promise.all([
                CarouselRule.find({}),
                ActionList.find({})
            ]);

            if (rules.length > 0) {
                const rulesObj: Record<string, any> = {};
                rules.forEach(r => {
                    rulesObj[r.pageName] = {
                        __class: "CarouselRule",
                        onlineOnly: r.onlineOnly,
                        categories: r.categories
                    };
                });

                const actionListsObj: Record<string, any> = {};
                actionLists.forEach(a => {
                    actionListsObj[a.name] = {
                        __class: "ActionList",
                        actions: a.actions
                    };
                });

                const fullRules = {
                    __class: "JD_CarouselRules",
                    actionLists: actionListsObj,
                    rules: rulesObj
                };

                await cache.set(cacheKeys.CAROUSEL_RULES, fullRules);
                logger.info(`Loaded ${rules.length} carousel rules from DB.`);
            } else {
                logger.warn("No carousel rules in DB, falling back to JSON.");
                await this.loadCarouselFromJson("carousel-rules.json", cacheKeys.CAROUSEL_RULES);
            }

            // 2. Item Lists
            const itemLists = await CarouselItemList.find({});
            if (itemLists.length > 0) {
                const itemListsObj: Record<string, any> = {};
                itemLists.forEach(i => {
                    itemListsObj[i.name] = {
                        __class: "SongItemList",
                        actionListName: (i as any).actionListName,
                        upsellActionListName: (i as any).upsellActionListName,
                        list: i.items
                    };
                });
                await cache.set(cacheKeys.CAROUSEL_ITEM_LISTS, itemListsObj);
                logger.info(`Loaded ${itemLists.length} item lists from DB.`);
            } else {
                await this.loadCarouselFromJson("carousel-item-lists.json", cacheKeys.CAROUSEL_ITEM_LISTS);
            }

            // 3. Static Files (Packages) - still from JSON
            await this.loadCarouselFromJson("carousel-packages.json", cacheKeys.CAROUSEL_PACKAGES);

        } catch (err) {
            logger.error("Failed to load carousel data from MongoDB:", err);
            // Emergency fallback
            await this.loadCarouselFromJson("carousel-rules.json", cacheKeys.CAROUSEL_RULES);
            await this.loadCarouselFromJson("carousel-item-lists.json", cacheKeys.CAROUSEL_ITEM_LISTS);
        }
    }

    async loadCarouselFromJson(filename: string, cacheKey: string) {
        const contentDir = path.resolve((global as any).root, "content");
        const filePath = path.join(contentDir, filename);
        try {
            const data = await fs.readFile(filePath, "utf-8");
            const json = JSON.parse(data);
            await cache.set(cacheKey, json);
            logger.info(`Loaded ${filename} from JSON into cache.`);
        } catch (err) {
            logger.warn(`Could not load ${filename} from JSON: ${err}`);
        }
    }
};

export default new JMCS();