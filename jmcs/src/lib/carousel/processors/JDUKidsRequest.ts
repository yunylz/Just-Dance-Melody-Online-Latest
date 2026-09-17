
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';

registerProcessor("JD_CarouselJDUKidsRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    // Use allSongs pre-fetched by the service layer
    const allSongs: any[] = (req as any).allSongs || [];
    const songdb: Record<string, any> = {};
    allSongs.forEach((s: any) => { songdb[s.mapName] = s; });

    const getActionList = (name: string) => {
        const list = rules?.actionLists?.[name];
        if (!list) throw new Error(`No action list with name ${name}`);
        return carouselLib.getFormattedActions(req, list);
    };

    const actionList = getActionList(requestDesc.actionListName);
    const upsellActionList = getActionList(requestDesc.upsellActionListName);
    const btnActionList = getActionList(requestDesc.btnActionListName);
    const btnUpsellActionList = getActionList(requestDesc.btnUpsellActionListName);

    const teaserMaps = Object.keys(songdb).filter(mapName => {
        return songdb[mapName]?.tags?.includes(requestDesc.teaserMapsTag);
    });

    const generatedItems: any[] = [];
    const generatedActionLists: Record<string, any> = {};

    const visibleSongs = (req as any).visibleSongs || [];
    const hasSubscription = true;

    teaserMaps.forEach(mapName => {

        const newItem: any = {
            __class: CarouselClass.Item,
            isc: requestDesc.isc,
            act: requestDesc.act,
            components: [{
                __class: CarouselClass.JD_CarouselContentComponent_Song,
                mapName: mapName
            }]
        };

        newItem.actionList = hasSubscription ? requestDesc.actionListName : requestDesc.upsellActionListName;
        generatedItems.push(newItem);
    });

    const attachRedirectAction = hasSubscription || (req as any).trialGranted === false;

    // Add expansion button
    generatedItems.push({
        __class: CarouselClass.Item,
        isc: requestDesc.btnIsc || "kids_grp_cover_plus",
        act: requestDesc.btnAct || "ui_component_base",
        components: [],
        actionList: attachRedirectAction ? requestDesc.btnActionListName : requestDesc.btnUpsellActionListName
    });

    if (attachRedirectAction) {
        generatedActionLists[requestDesc.btnActionListName] = btnActionList;
    }

    if (hasSubscription) {
        generatedActionLists[requestDesc.actionListName] = actionList;
    } else {
        generatedActionLists[requestDesc.upsellActionListName] = upsellActionList;
        generatedActionLists[requestDesc.btnUpsellActionListName] = btnUpsellActionList;
    }

    return {
        items: generatedItems,
        actionLists: generatedActionLists
    };
});
