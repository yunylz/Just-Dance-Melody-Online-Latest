
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import challengers from '../../challengers';

registerProcessor("JD_CarouselLatestChallengesRequestDesc", async (requestDesc: any, req: Request) => {
    if (!req.sku) return { items: [], actionLists: {} };

    const { value: rules } = await cache.get("carousel:rules");

    const getActionList = (name: string) => {
        const list = rules?.actionLists?.[name];
        if (!list) throw new Error(`No action list with name ${name}`);
        return carouselLib.getFormattedActions(req, list);
    };

    const actionList = getActionList(requestDesc.actionListName);
    const actionListTaunt = getActionList(requestDesc.actionListNameTaunt);
    const actionListDefeat = getActionList(requestDesc.actionListNameDefeat);

    const sku = req.sku as any;
    const pid = (req as any).profileId;
    if (!pid) return { items: [], actionLists: {} };

    const availableSongs = ((req as any).allSongs || []).map((s: any) => s.mapName);

    return challengers.getLatestChallengeItems({
        profileId: pid,
        friendIds: (req.body as any)?.friendIds || [],
        authorizedFriendIds: (req.body as any)?.authorizedFriendIds || [],
        authorizedFriendsOnly: req.query.ugc === "false",
        country: requestDesc.country,
        top: requestDesc.top,
        challengeCount: requestDesc.challengeCount,
        videoScoreCount: requestDesc.videoScoreCount,
        nonvideoScoreCount: requestDesc.nonvideoScoreCount,
        platform: sku.platform,
        gameVersion: sku.gameVersion,
        onlyVictoryTaunts: requestDesc.onlyVictoryTaunts,
        onlyDefeatTaunts: requestDesc.onlyDefeatTaunts,
        availableSongs,
        actionListName: requestDesc.actionListName,
        actions: actionList,
        actionListNameTaunt: requestDesc.actionListNameTaunt,
        actionsTaunt: actionListTaunt,
        actionListNameDefeat: requestDesc.actionListNameDefeat,
        actionsDefeat: actionListDefeat,
        carouselVersion: (req as any).carouselVersion || 2,
    });
});
