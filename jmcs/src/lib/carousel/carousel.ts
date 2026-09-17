
import { Request } from 'express';
import { createLogger } from '../logger';
import filter from './filter';
import { ICarouselItem, ICarouselCategory, ICarouselRules, ICarouselRule } from '../../types/carousel';
import { CarouselClass } from '../enums/carousel';
import cache from '../cache';

const logger = createLogger({ service: "carousel-lib" });

// Registry of processors will be imported here
import { executeRequestProcessor } from './registry';

export const getTranslatedActions = (req: Request, actionList: any) => {
    const language = (req.query.language as string) || (req as any).language || 'en';

    if (language === "zh") {
        actionList.actions = actionList.actions.filter((action: any) => {
            return action.type !== "share-autodance-facebook" &&
                action.type !== "share-autodance-jdtv-facebook";
        });
    }

    actionList.actions.forEach((action: any) => {
        if (action.hasOwnProperty("titleId")) {
            action.title = (req as any).getLocalisation?.(action.titleId) || action.titleId;
            action.onlineTitleId = action.titleId;
            delete action.titleId;
        }
    });

    return actionList;
};

export const getFilteredActions = (req: Request, actionList: any) => {
    actionList.actions = actionList.actions.filter((action: any) => {
        if (action.filters) return filter.process(req, action.filters);
        return true;
    });
    actionList.actions.forEach((action: any) => {
        delete action.filters;
    });
    return actionList;
};

export const getFormattedActions = (req: Request, actionList: any) => {
    if (!actionList) return null;
    const cloned = JSON.parse(JSON.stringify(actionList));
    const filtered = getFilteredActions(req, cloned);
    return getTranslatedActions(req, filtered);
};

export const availabilityFilter = (items: any[], req: Request) => {
    if (!items) return [];
    return items;
};

export const addMetadataComponent = (items: ICarouselItem[]) => {
    return items.map(item => {
        if (item.components) {
            item.components.push({
                __class: "JD_CarouselContentComponent_Metadata",
                ...item.metadata
            });
        }
        return item;
    });
};

export const processRequest = async (requestDesc: any, req: Request): Promise<any> => {
    try {
        let results = await executeRequestProcessor(requestDesc, req);
        const carouselVersion = (req as any).carouselVersion || 2;

        if (carouselVersion >= 2) {
            if (results.items) {
                results.items = availabilityFilter(results.items, req);
            } else if (results.categories) {
                results.categories.forEach((category: any) => {
                    category.items = availabilityFilter(category.items, req);
                });
            }
        } else {
            if (!results.categories) {
                results = availabilityFilter(results, req);
            } else {
                results.categories.forEach((category: any) => {
                    category.items = availabilityFilter(category.items, req);
                });
            }
        }

        return results;
    } catch (err) {
        logger.error(`Error processing request: ${err}`);
        throw err;
    }
};

export const makeOfflineRequest = async (options: {
    request: Request,
    requestDesc: any,
    requestDescClass: string,
    actionListName?: string
}) => {
    // This requires rules from cache
    const { success, value: rules } = await cache.get("carousel:rules") as { success: boolean, value: ICarouselRules };

    let actionList = null;
    if (options.actionListName && rules?.actionLists) {
        actionList = getFormattedActions(options.request, rules.actionLists[options.actionListName]);
    }

    const offlineRequest = JSON.parse(JSON.stringify(options.requestDesc));
    offlineRequest.__class = options.requestDescClass;

    const carouselVersion = (options.request as any).carouselVersion || 2;

    if (carouselVersion >= 2) {
        const retval: any = {
            items: [{
                __class: CarouselClass.Item,
                offlineRequest: offlineRequest
            }],
            actionLists: {}
        };
        if (options.actionListName && actionList) {
            retval.actionLists[options.actionListName] = actionList;
        }
        return retval;
    } else {
        offlineRequest.actions = [];
        if (options.actionListName && actionList) {
            offlineRequest.actions = actionList.actions;
            delete offlineRequest.actionListName;
        }
        return [{
            __class: CarouselClass.Item,
            offlineRequest: offlineRequest
        }];
    }
};

export const addNewTag = (items: ICarouselItem[], req?: Request) => {
    // Use the songdb already pre-fetched onto req by the service layer
    const allSongs: any[] = req ? ((req as any).allSongs || []) : [];
    if (!allSongs.length) return items;

    const songdb: Record<string, any> = {};
    allSongs.forEach((s: any) => { songdb[s.mapName] = s; });

    // Carousel puts new tag on songs that were released in the past 7 days.
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const item of items) {
        if (!item.components) continue;
        for (const component of item.components) {
            const mapName = component.mapName;
            const releaseDate = songdb[mapName]?.releaseDate;
            if (releaseDate && new Date(releaseDate).getTime() > sevenDaysAgo) {
                component.isNewSong = true;
            }
        }
    }

    return items;
};


export const formatComponent = (comp: any) => {
    if (comp.__class === CarouselClass.JD_CarouselContentComponent_Song && comp.song) {
        return {
            __class: comp.__class,
            mapName: comp.song.mapName
        };
    }
    return comp;
};

export const formatItem = (item: any, options: any = {}) => {
    const formatted: any = {
        __class: CarouselClass.Item,
        isc: item.isc || options.defaultIsc || "grp_cover",
        act: item.act || options.defaultAct || "ui_component_base",
        actionList: item.actionList || options.defaultActionList || "",
        ...item
    };

    if (formatted.filters && formatted.filters.length === 0) delete formatted.filters;

    if (formatted.components) {
        formatted.components = formatted.components.map((comp: any) => formatComponent(comp));
    }

    return formatted;
};

export default {
    processRequest,
    makeOfflineRequest,
    getFormattedActions,
    getFilteredActions,
    getTranslatedActions,
    availabilityFilter,
    addNewTag,
    addMetadataComponent,
    formatItem,
    formatComponent
};
