
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import ugcClient from '../../ugc-client';

registerProcessor("JD_CarouselUgcRequestDesc", async (requestDesc: any, req: Request) => {
    if (!(req as any).ticket || !req.sku) return { items: [], actionLists: {} };

    const { value: rules } = await cache.get("carousel:rules");

    const getActionList = (name: string) => {
        const list = rules?.actionLists?.[name];
        if (!list) throw new Error(`No action list with name ${name}`);
        return carouselLib.getFormattedActions(req, list);
    };

    const actionList = getActionList(requestDesc.actionListName);
    const actionListSelf = getActionList(requestDesc.actionListNameSelf);
    const actionListUpsell = getActionList(requestDesc.actionListNameUpsell);

    if (requestDesc.offline) {
        return carouselLib.makeOfflineRequest({
            requestDescClass: "JD_CarouselUgcRequest",
            requestDesc: requestDesc,
            request: req,
            actionListName: requestDesc.actionListName
        });
    }

    const ugcType = requestDesc.ugcType || "ad";
    const sku = req.sku as any;
    const profileId = (req as any).profileId;

    const result = await ugcClient.getItems({
        type: ugcType,
        platform: sku.platform,
        gameVersion: sku.gameVersion,
        profileId,
        maxCount: requestDesc.maxCount || 50,
        display: requestDesc.display || "ugc",
        friendIds: requestDesc.friendIds || [],
        availableSongs: requestDesc.availableSongs || [],
        actions: actionList,
        actionListName: requestDesc.actionListName,
        actionsSelf: actionListSelf,
        actionListNameSelf: requestDesc.actionListNameSelf,
        actionsUpsell: actionListUpsell,
        actionListNameUpsell: requestDesc.actionListNameUpsell,
        carouselVersion: (req as any).carouselVersion || 2,
        featured: requestDesc.featured,
        mostLiked: requestDesc.mostLiked,
        mostViewed: requestDesc.mostViewed,
        profileIds: requestDesc.profileIds,
        tags: requestDesc.tags,
        currentContestOnly: requestDesc.currentContestOnly,
        platformList: requestDesc.platformList,
    });

    return result;
});
