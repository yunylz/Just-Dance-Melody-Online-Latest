
import { Request } from 'express';
import { registerProcessor } from "../registry";
import songs from '../../songs';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';
import cache from '../../cache';
import { createLogger } from '../../logger';

const logger = createLogger({ service: "SmartSongRequest-processor" });

registerProcessor("JD_CarouselSmartSongRequestDesc", async (requestDesc: any, req: Request) => {
    const filters = { ...(requestDesc.filters || {}) };

    // Handle array filters for originalJDVersion
    if (filters.originalJDVersion && Array.isArray(filters.originalJDVersion)) {
        filters.originalJDVersion = { $in: filters.originalJDVersion };
    }
    if (filters.originalJdVersions) {
        const versions = filters.originalJdVersions;
        delete filters.originalJdVersions;
        filters.originalJDVersion = Array.isArray(versions) ? { $in: versions } : versions;
    }

    const limit = requestDesc.maxCount || 24;
    const order = requestDesc.order || "title";

    // Fetch songs from database using the filters
    const queryOptions: any = { limit };
    if (order === "releaseDate") queryOptions.sort = { releaseDate: -1 };
    else if (order === "title") queryOptions.sort = { title: 1 };
    else if (order === "popularity") queryOptions.sort = { playCount: -1 }; // playCount might not exist yet, but stubbing it

    const { success, songs: songDocs, total, errorMessage } = await songs.getAllSongs(filters, queryOptions);

    if (!success || !songDocs) {
        logger.error(`Failed to fetch songs for SmartSongRequest: ${errorMessage}`);
        return { items: [], actionLists: {} };
    }

    const rules = (req as any).carouselRules || (await cache.get("carousel:rules")).value;

    const actionListName = requestDesc.actionListName;
    const actionListNameUpsell = requestDesc.actionListNameUpsell || "_None";

    let actionList = actionListName ? rules?.actionLists?.[actionListName] : null;
    if (actionList) {
        actionList = carouselLib.getFormattedActions(req, actionList);
    }

    let actionListUpsell = actionListNameUpsell ? rules?.actionLists?.[actionListNameUpsell] : null;
    if (actionListUpsell) {
        actionListUpsell = carouselLib.getFormattedActions(req, actionListUpsell);
    }

    const items = songDocs.map(song => {
        const mapName = song.mapName;
        const isc = requestDesc.isc || (song.tags?.indexOf("JustShine") !== -1 ? "grp_justshine_item" : "grp_cover");

        return carouselLib.formatItem({
            isc: isc,
            act: requestDesc.act || "ui_component_base",
            components: [{
                __class: CarouselClass.JD_CarouselContentComponent_Song,
                mapName: mapName
            }]
        });
    });

    const actionLists: Record<string, any> = {};
    const carouselVersion = (req as any).carouselVersion || 2;

    // Build songdb map for O(1) bannerTheme lookup
    const songdb: Record<string, any> = {};
    songDocs.forEach((s: any) => { songdb[s.mapName] = s; });

    for (const item of items) {
        const mapName = item.components[0].mapName;

        let currentActionList = actionList;
        let currentActionListName = actionListName;

        const bannerTheme = songdb[mapName]?.bannerTheme;
        if (bannerTheme && currentActionList) {
            const clonedActionList = JSON.parse(JSON.stringify(currentActionList));
            clonedActionList.actions.forEach((a: any) => a.bannerTheme = bannerTheme);
            const key = `${currentActionListName}_${mapName}`;
            actionLists[key] = clonedActionList;
            if (carouselVersion >= 2) item.actionList = key;
            else item.actions = clonedActionList.actions;
        } else if (currentActionList) {
            actionLists[currentActionListName] = currentActionList;
            if (carouselVersion >= 2) item.actionList = currentActionListName;
            else item.actions = currentActionList.actions;
        }
    }

    carouselLib.addNewTag(items, req);

    if (carouselVersion >= 2) {
        return {
            items,
            actionLists
        };
    } else {
        return items;
    }
});
