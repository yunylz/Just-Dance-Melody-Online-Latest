
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import ugcClient from '../../ugc-client';

registerProcessor("JD_CarouselChallengesV2RequestDesc", async (requestDesc: any, req: Request) => {
    if (!req.sku) return { items: [], actionLists: {} };

    const { value: rules } = await cache.get("carousel:rules");

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);
    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);

    const sku = req.sku as any;
    const pid = (req as any).profileId;
    const friendIds = ((req.body as any)?.friendIds || []) as string[];
    const profileIds = requestDesc.friendPids ? friendIds : undefined;

    const result = await ugcClient.getItems({
        type: "ch",
        platform: sku.platform,
        gameVersion: sku.gameVersion,
        profileId: pid,
        excludeProfileId: pid,
        maxCount: requestDesc.maxCount || 50,
        display: "challenge",
        friendIds,
        actions: actionListFormatted,
        actionListName: requestDesc.actionListName,
        carouselVersion: (req as any).carouselVersion || 2,
        featured: requestDesc.featured,
        mostLiked: requestDesc.mostLiked,
        mostViewed: requestDesc.mostViewed,
        profileIds,
    });

    return result;
});
