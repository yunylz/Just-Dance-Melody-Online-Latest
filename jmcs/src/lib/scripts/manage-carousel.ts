import { Request, Response, NextFunction } from "express";
import { CarouselRule, CarouselItemList, ActionList } from '../models/carousel';
import cache from '../cache';
import cacheKeys from '../cache-keys';
import { createLogger } from '../logger';

const logger = createLogger({ service: "manage-carousel" });

export default {
    // --- Rules (Pages) ---
    listRules: async (req: Request, res: Response) => {
        const rules = await CarouselRule.find({}, { pageName: 1, updatedAt: 1 });
        return res.json({ success: true, items: rules });
    },
    getRule: async (req: Request, res: Response) => {
        const rule = await CarouselRule.findOne({ pageName: req.params.id });
        if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
        return res.json({ success: true, item: rule });
    },
    updateRule: async (req: Request, res: Response) => {
        const rule = await CarouselRule.findOneAndUpdate(
            { pageName: req.params.id },
            { ...req.body },
            { upsert: true, new: true }
        );
        return res.json({ success: true, item: rule });
    },
    deleteRule: async (req: Request, res: Response) => {
        await CarouselRule.deleteOne({ pageName: req.params.id });
        return res.json({ success: true });
    },

    // --- Item Lists ---
    listItemLists: async (req: Request, res: Response) => {
        const lists = await CarouselItemList.find({});
        return res.json({ success: true, items: lists });
    },
    updateItemList: async (req: Request, res: Response) => {
        const list = await CarouselItemList.findOneAndUpdate(
            { name: req.params.id },
            { ...req.body, name: req.params.id },
            { upsert: true, new: true }
        );
        return res.json({ success: true, item: list });
    },
    deleteItemList: async (req: Request, res: Response) => {
        await CarouselItemList.deleteOne({ name: req.params.id });
        return res.json({ success: true });
    },

    // --- Action Lists ---
    listActionLists: async (req: Request, res: Response) => {
        const lists = await ActionList.find({});
        return res.json({ success: true, items: lists });
    },
    updateActionList: async (req: Request, res: Response) => {
        const list = await ActionList.findOneAndUpdate(
            { name: req.params.id },
            { ...req.body, name: req.params.id },
            { upsert: true, new: true }
        );
        return res.json({ success: true, item: list });
    },
    deleteActionList: async (req: Request, res: Response) => {
        await ActionList.deleteOne({ name: req.params.id });
        return res.json({ success: true });
    },

    // --- Publish ---
    publish: async (req: Request, res: Response) => {
        try {
            logger.info("Publishing carousel changes to Redis...");
            const [rules, actionLists] = await Promise.all([
                CarouselRule.find({}),
                ActionList.find({})
            ]);

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

            const itemLists = await CarouselItemList.find({});
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

            logger.info("Carousel changes published successfully.");
            return res.json({ success: true, message: "Published successfully to Redis cache." });
        } catch (err: any) {
            logger.error(`Publish failed: ${err}`);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
};
