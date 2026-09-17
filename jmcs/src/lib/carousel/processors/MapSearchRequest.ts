
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import songs from '../../songs';
import { CarouselClass } from '../../enums/carousel';

registerProcessor("JD_CarouselMapSearchRequestDesc", async (requestDesc: any, req: Request) => {
    const rules = (req as any).carouselRules || (await cache.get("carousel:rules")).value;

    const allSongs = (req as any).allSongs || (await songs.getAllSongs()).songs;
    const songdb: Record<string, any> = {};
    const songNames: string[] = [];
    allSongs?.forEach((s: any) => {
        songdb[s.mapName] = s;
        songNames.push(s.mapName);
    });

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    const actionListUpsell = rules?.actionLists?.[requestDesc.actionListNameUpsell];

    if (!actionList || !actionListUpsell) throw new Error("Missing action lists");

    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);
    const actionListUpsellFormatted = carouselLib.getFormattedActions(req, actionListUpsell);

    const retval: any = { categories: [], actionLists: {} };

    if (!req.body) req.body = {}

    const searchTags = (req.body as any).searchTags || [];
    const searchString = ((req.body as any).searchString || "").toLowerCase();

    const createItem = (mapName: string) => {
        const currentActionList = actionListFormatted;
        const currentActionListName = requestDesc.actionListName;

        const item = carouselLib.formatItem({
            isc: "grp_cover",
            act: "ui_component_base",
            components: [{
                __class: CarouselClass.JD_CarouselContentComponent_Song,
                mapName: mapName
            }]
        }, {
            defaultActionList: currentActionListName
        });

        const carouselVersion = (req as any).carouselVersion || 2;
        if (carouselVersion >= 2) {
            retval.actionLists[currentActionListName] = currentActionList;
        } else {
            item.actions = currentActionList.actions;
        }
        return item;
    };

    if (searchTags.length) {
        for (const tag of searchTags) {
            let categoryTitle = tag;
            if (requestDesc.prefixCategoryTitle) categoryTitle = `${requestDesc.prefixCategoryTitle} ${tag}`;

            const category: any = {
                __class: "Category",
                title: categoryTitle,
                items: []
            };

            for (const mapName of songNames) {
                const song = songdb[mapName];
                const isValid = song.tags?.indexOf(tag) !== -1;
                if (isValid) category.items.push(createItem(mapName));
            }

            category.items.sort((a: any, b: any) => songdb[a.components[0].mapName].title.localeCompare(songdb[b.components[0].mapName].title));
            if (requestDesc.maxLength && category.items.length > requestDesc.maxLength) category.items.length = requestDesc.maxLength;

            retval.categories.push(category);
        }
    }

    if (searchString) {
        const category: any = {
            __class: "Category",
            title: requestDesc.prefixCategoryTitle ? `${requestDesc.prefixCategoryTitle} ${req.body.searchString}` : req.body.searchString,
            items: []
        };

        const matches: string[] = [];
        for (const mapName of songNames) {
            const song = songdb[mapName];
            const title = (song.title || "").toLowerCase();
            const artist = (song.artist || "").toLowerCase();

            if (title.includes(searchString) || artist.includes(searchString)) {
                matches.push(mapName);
            }
        }

        matches.sort((a, b) => songdb[a].title.localeCompare(songdb[b].title));
        if (requestDesc.maxLength && matches.length > requestDesc.maxLength) matches.length = requestDesc.maxLength;

        matches.forEach(m => category.items.push(createItem(m)));
        retval.categories.push(category);
    }

    for (const cat of retval.categories) {
        carouselLib.addNewTag(cat.items, req);
    }

    return retval;
});
