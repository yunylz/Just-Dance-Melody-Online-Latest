
import { Express, Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

import { ICarouselContent } from '../types/carousel';
import { CarouselClass } from '../lib/enums/carousel';
import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';

import songs from '../lib/songs';
import cache from '../lib/cache';
import carouselLib from '../lib/carousel/carousel';
import localizationMiddleware from '../lib/localization-middleware';
import { acceptsFilters } from '../lib/carousel/filter';
import { buildRecommendedItems } from '../lib/carousel/recommended';

import '../lib/carousel/processors';

export default function (app: Express, publicRouter: Router, privateRouter: Router, logger: Logger) {
    const carouselVersion = 1;

    // V1 Routes
    publicRouter.post(/^\/pages(\/.*)/, ticketRequired, skuIdRequired, localizationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { value: rulesData } = await cache.get("carousel:rules");
            if (!rulesData) {
                logger.warn({
                    message: "No carousel rule",
                    details: {
                        pageName: req.params[0]
                    }
                });
                return res.status(404).end();
            };

            const pageName = req.params[0];
            const rule = rulesData.rules[pageName];
            if (!rule) return res.status(404).end();

            // Pre-fetch data for all processors
            const songsData = await songs.getAllSongs();
            (req as any).allSongs = songsData.songs;
            (req as any).carouselRules = rulesData;

            const categories = await Promise.all(rule.categories.map(async (category: any) => {
                const outCategory: any = {
                    __class: CarouselClass.Category,
                    title: category.hasOwnProperty("titleId") ? ((req as any).getLocalisation(category.titleId) || category.title) : category.title,
                    act: category.act,
                    isc: category.isc,
                    items: []
                };

                // Evaluate category-level SKU/country/time filters before doing any work
                if (category.filters && !acceptsFilters(req, category.filters)) return null;

                if (category.logoUrl) outCategory.logoUrl = category.logoUrl;
                if (category.order) outCategory.order = category.order;

                // Process each request in the category
                if (category.categoryType === "recommended") {
                    // Fill "Recommended for You" categories with the daily-rotating
                    // recommendation system instead of the static requests.
                    (req as any).carouselVersion = carouselVersion;
                    const actionListName = category.requests?.find((r: any) => r.actionListName)?.actionListName;
                    const rec = await buildRecommendedItems(req, { actionListName });
                    outCategory.items.push(...rec.items);
                } else {
                    for (const requestDesc of category.requests) {
                        (req as any).carouselVersion = carouselVersion;
                        const result = await carouselLib.processRequest(requestDesc, req);

                        if (result.categories) {
                            if (!outCategory.categories) outCategory.categories = [];
                            outCategory.categories.push(...result.categories);
                        } else if (Array.isArray(result)) {
                            outCategory.items.push(...result);
                        } else if (result.items) {
                            outCategory.items.push(...result.items);
                        }
                    }
                }

                // Always return the category — even when empty — so the client can
                // render the section (matches the OG). Only categories rejected by
                // the SKU/country/time filters above are dropped.
                if (outCategory.items.length && outCategory.categories) {
                    // Propagate parent items to sub-categories (if any)
                    outCategory.categories.forEach((subCat: any) => {
                        subCat.items.push(...outCategory.items);
                    });
                }
                return outCategory;
            }));

            const finalCategories: any[] = [];
            categories.forEach(category => {
                if (category !== null) {
                    if (category.categories) {
                        category.categories.forEach((cat: any) => {
                            if (category.order) cat.order = category.order;
                            cat.isc = category.isc;
                            cat.act = category.act;
                            finalCategories.push(cat);
                        });
                    } else {
                        finalCategories.push(category);
                    }
                }
            });

            const responseBody: ICarouselContent = {
                __class: CarouselClass.JD_CarouselContent,
                categories: finalCategories
            };

            return res.json(responseBody);
        } catch (err) {
            logger.error(`Error in pagesRoute (v1): ${err}`);
            return next(err);
        }
    });

    publicRouter.post("/packages", ticketRequired, skuIdRequired, async (req: Request, res: Response) => {
        const { value: packages } = await cache.get("carousel:packages");
        const packageIds = req.body.packageIds || [];
        const retval = {
            "__class": "PackageIds",
            "packageIds": [] as string[]
        };

        if (packages) {
            packageIds.forEach((packageId: string) => {
                if (packages.hasOwnProperty(packageId)) {
                    Object.keys(packages[packageId]).forEach((packageName: string) => {
                        // Simplified filtering for now
                        retval.packageIds.push(packageName);
                    });
                }
            });
        }

        return res.json(retval);
    });

    // Backoffice routes (privateRouter)
    privateRouter.get("/rules", async (req: Request, res: Response) => {
        const { value } = await cache.get("carousel:rules");
        return res.json(value);
    });

    privateRouter.get("/item-lists", async (req: Request, res: Response) => {
        const { value } = await cache.get("carousel:item-lists");
        return res.json(value);
    });
}
