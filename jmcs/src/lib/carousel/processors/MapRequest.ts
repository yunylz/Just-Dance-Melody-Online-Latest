
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';
import profiles from '../../profiles';
import songs from '../../songs';
import { createLogger } from '../../logger';
import infos from '../../../config/infos';

const logger = createLogger({ service: "MapRequest-processor" });

registerProcessor("JD_CarouselMapRequestDesc", async (requestDesc: any, req: Request) => {
    const rules = (req as any).carouselRules || (await cache.get("carousel:rules")).value;

    // In new project, we get songs from database/cache
    const allSongs = (req as any).allSongs || (await songs.getAllSongs()).songs;
    const infosData = infos;

    const songdb: Record<string, any> = {};
    const mapList: string[] = [];
    allSongs?.forEach((s: any) => {
        songdb[s.mapName] = s;
        mapList.push(s.mapName);
    });
    Object.values(infosData).forEach(i => {
        songdb[i.mapName] = i;
        mapList.push(i.mapName);
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
            requestDescClass: "JD_CarouselMapRequest",
            requestDesc: requestDesc,
            request: req,
            actionListName: requestDesc.actionListName
        });
    }

    const pid = (req as any).ticket?.pid || (req as any).profileId;
    let favorites: string[] = [];
    let history: Record<string, any> = {};

    if (requestDesc.favorites && pid) {
        const profile = await profiles.getProfile(pid);
        if (profile) {
            favorites = profile.favorites || [];
            history = profile.history || {};
        }
    }

    // Songs' `tags` are populated Tag documents ({_id, name, ...}), so reduce
    // them to names before comparing against the filter's tag strings.
    const getTagNames = (doc: any): string[] =>
        (doc?.tags || []).map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean);

    const filterByOption: Record<string, (mapName: string, doc: any, optionValue: any) => boolean> = {
        customTags: (mapName, doc, optionValue) => {
            const tags = getTagNames(doc);
            if (!tags.length) return false;
            return tags.some((tag: string) => optionValue.indexOf(tag) !== -1);
        },
        excludedCustomTags: (mapName, doc, optionValue) => {
            const tags = getTagNames(doc);
            if (!tags.length) return true;
            return !tags.some((tag: string) => optionValue.indexOf(tag) !== -1);
        },
        excludedTags: (mapName, doc, optionValue) => {
            const tags = getTagNames(doc);
            return !optionValue.some((tag: string) => tags.indexOf(tag) !== -1);
        },
        includedTags: (mapName, doc, optionValue) => {
            const tags = getTagNames(doc);
            return optionValue.every((tag: string) => tags.indexOf(tag) !== -1);
        },
        optionalTags: (mapName, doc, optionValue) => {
            const tags = getTagNames(doc);
            return optionValue.some((tag: string) => tags.indexOf(tag) !== -1);
        },
        subscribed: (mapName, doc, optionValue) => {
            return true;
        },
        localTracks: (mapName, doc, optionValue) => {
            if (optionValue) return ((req as any).localTracks || []).indexOf(mapName) !== -1;
            return true;
        },
        includedRegex: (mapName, doc, optionValue) => {
            return songdb[mapName]?.[optionValue.key]?.match(new RegExp(optionValue.regex));
        },
        excludedRegex: (mapName, doc, optionValue) => {
            return !songdb[mapName]?.[optionValue.key]?.match(new RegExp(optionValue.regex));
        },
        includedVersion: (mapName, doc, optionValue) => {
            if (!doc.skuIds) return false;
            // Simplified version check
            return doc.skuIds.some((s: string) => s.includes(optionValue));
        },
        excludedVersion: (mapName, doc, optionValue) => {
            if (!doc.skuIds) return true;
            return !doc.skuIds.some((s: string) => s.includes(optionValue));
        },
        streamedMaps: (mapName, doc) => {
            // Logic: if not in current SKU's native list
            return true; // TODO: implement properly
        },
        searchTags: (mapName, doc, optionValue) => {
            if (!optionValue) return true;
            const tags = (req.body as any)?.searchTags || [];
            const docTags = getTagNames(doc);
            return tags.some((tag: string) => docTags.indexOf(tag) !== -1);
        },
        favorites: (mapName) => {
            if (favorites.length > 0) return favorites.indexOf(mapName) !== -1;
            return history.hasOwnProperty(mapName);
        },
        artist: (mapName, doc, optionValue) => {
            return doc.artist === optionValue;
        },
        after: (mapName, doc, optionValue) => {
            const releaseDate = doc?.releaseDate;
            return releaseDate && releaseDate >= optionValue;
        },
        originalJDVersion: (mapName, doc, optionValue) => {
            if (Array.isArray(optionValue)) {
                return optionValue.indexOf(doc.originalJDVersion) !== -1;
            }
            return doc.originalJDVersion === optionValue;
        },
        originalJdVersions: (mapName, doc, optionValue) => {
            if (Array.isArray(optionValue)) {
                return optionValue.indexOf(doc.originalJDVersion) !== -1;
            }
            return doc.originalJDVersion === optionValue;
        }
    };

    const filterSong = (mapName: string, doc: any) => {
        return Object.keys(requestDesc).every(option => {
            const filterFn = filterByOption[option];
            if (filterFn) return filterFn(mapName, doc, requestDesc[option]);
            if (doc.hasOwnProperty(option)) return doc[option] === requestDesc[option];
            return true;
        });
    };

    const items: any[] = [];
    for (const mapName of mapList) {
        const songDoc = songdb[mapName];
        if (filterSong(mapName, songDoc)) {
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

    // Sort items
    if (requestDesc.order === "title") {
        items.sort((a, b) => songdb[a.components[0].mapName].title.localeCompare(songdb[b.components[0].mapName].title));
    } else if (requestDesc.order === "reverse-title") {
        items.sort((a, b) => songdb[b.components[0].mapName].title.localeCompare(songdb[a.components[0].mapName].title));
    } else if (requestDesc.order === "shuffle") {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
    } else if (requestDesc.order === "release-date") {
        items.sort((a, b) => {
            const dateA = songdb[a.components[0].mapName]?.releaseDate || "";
            const dateB = songdb[b.components[0].mapName]?.releaseDate || "";
            return dateB.localeCompare(dateA);
        });
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
