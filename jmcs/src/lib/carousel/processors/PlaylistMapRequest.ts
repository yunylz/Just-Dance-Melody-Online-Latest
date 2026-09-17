import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';
import playlistDb from '../../playlistdb';
import songs from '../../songs';
import infos from '../../../config/infos';
import { createLogger } from '../../logger';

const logger = createLogger({ service: "PlaylistMapRequest-processor" });

registerProcessor("JD_CarouselPlaylistMapRequestDesc", async (requestDesc: any, req: Request) => {
    const rules = (req as any).carouselRules || (await cache.get("carousel:rules"))?.value;

    const allSongs = (req as any).allSongs || (await songs.getAllSongs()).songs;
    const infosData = infos;

    const songdb: Record<string, any> = {};
    allSongs?.forEach((s: any) => {
        songdb[s.mapName] = s;
    });
    Object.values(infosData).forEach(i => {
        songdb[i.mapName] = i;
    });

    const actionListName = requestDesc.actionListName;
    if (actionListName && !rules?.actionLists?.[actionListName]) {
        throw new Error(`No action list with name ${actionListName} Request UUID: ${requestDesc.uuid}`);
    }
    let actionList = actionListName ? rules?.actionLists?.[actionListName] : null;
    if (actionList) {
        actionList = carouselLib.getFormattedActions(req, actionList);
    }

    const actionListNameUpsell = requestDesc.actionListNameUpsell || "_None";
    if (actionListNameUpsell && !rules?.actionLists?.[actionListNameUpsell]) {
        throw new Error(`No action list with name ${actionListNameUpsell} Request UUID: ${requestDesc.uuid}`);
    }
    let actionListUpsell = actionListNameUpsell ? rules?.actionLists?.[actionListNameUpsell] : null;
    if (actionListUpsell) {
        actionListUpsell = carouselLib.getFormattedActions(req, actionListUpsell);
    }

    if (requestDesc.offline) {
        return carouselLib.makeOfflineRequest({
            requestDescClass: "JD_CarouselPlaylistMapRequest",
            requestDesc: requestDesc,
            request: req,
            actionListName: requestDesc.actionListName
        });
    }

    const pid = (req as any).ticket?.pid || (req as any).profileId;
    if (pid && !(req as any).profileId) {
        (req as any).profileId = pid;
    }
    
    let mapList: string[] = [];
    const playlists = await playlistDb.getPlaylistDb(req);
    const playlistId = requestDesc.playlistId;
    
    if (playlistId && playlists[playlistId]) {
        mapList = playlists[playlistId].maps || [];
    } else {
        logger.warn(`Playlist ${playlistId} not found for user ${pid}`);
    }

    const items: any[] = [];
    for (const mapName of mapList) {
        const songDoc = songdb[mapName];
        if (songDoc) {
            const isc = requestDesc.isc || (songDoc.tags?.indexOf("JustShine") !== -1 ? "grp_justshine_item" : "grp_cover");
            items.push(carouselLib.formatItem({
                isc: isc,
                act: requestDesc.act || "ui_component_base",
                components: [{
                    __class: CarouselClass.JD_CarouselContentComponent_Song,
                    mapName: mapName
                }]
            }));
        }
    }

    // Optional shuffle based on order or playlist config
    if (requestDesc.order === "shuffle" || (playlists[playlistId] && playlists[playlistId].fixedMapOrder === false && requestDesc.order !== "ordered")) {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
    }

    const limit = requestDesc.maxCount || items.length;
    const finalItems = items.slice(0, limit);

    const actionLists: Record<string, any> = {};
    const carouselVersion = (req as any).carouselVersion || 2;

    for (const item of finalItems) {
        const component = item.components[0];
        const mapName = component.song?.mapName || component.mapName;
        let currentActionList = actionList;
        let currentActionListName = requestDesc.actionListName;

        const bannerTheme = songdb[mapName]?.bannerTheme;
        if (bannerTheme) {
            const clonedActionList = JSON.parse(JSON.stringify(currentActionList));
            clonedActionList.actions.forEach((a: any) => a.bannerTheme = bannerTheme);
            const key = `${currentActionListName}_${mapName}`;
            actionLists[key] = clonedActionList;
            if (carouselVersion >= 2) item.actionList = key;
            else item.actions = clonedActionList.actions;
        } else {
            actionLists[currentActionListName] = currentActionList;
            if (carouselVersion >= 2) item.actionList = currentActionListName;
            else item.actions = currentActionList.actions;
        }
    }

    carouselLib.addNewTag(finalItems, req);

    if (carouselVersion >= 2) {
        return {
            items: finalItems,
            actionLists: actionLists
        };
    } else {
        return finalItems;
    }
});
