
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import profiles from '../../profiles';
import { CarouselClass } from '../../enums/carousel';

registerProcessor("JD_CarouselFriendRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);
    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);

    const friendIds = (req.body as any).friendIds || [];
    let profileIds: string[] = [];

    if (requestDesc.queryPid) profileIds = [req.query.pid as string];
    else if (requestDesc.friendPids) profileIds = friendIds;

    const carouselVersion = (req as any).carouselVersion || 2;
    if (!profileIds.length) {
        return carouselVersion >= 2 ? { items: [], actionLists: {} } : [];
    }

    const items: any[] = [];
    const actionLists: Record<string, any> = {};

    const profileDocs = await profiles.getProfiles(profileIds);

    for (const friendId of profileIds) {
        const doc = profileDocs[friendId];
        if (!doc) continue;

        const dancerComponent: any = {
            __class: "JD_CarouselContentComponent_Friend_Dancer",
            avatar: doc.avatar,
            country: doc.country,
            name: doc.name,
            profileId: friendId,
            progression: doc.progression || {},
            platformId: doc.platformId || ""
        };

        if (doc.scores) {
            dancerComponent.scores = doc.scores;
        }

        const gameVersion = req.sku?.gameVersion || "jd2017";
        if (doc.stats && doc.stats[gameVersion]) {
            dancerComponent.stats = doc.stats[gameVersion];
            dancerComponent.stats.__class = "ProfileStats";
        }

        if (doc.skin) dancerComponent.skin = doc.skin;
        if (doc.jdPoints) dancerComponent.jdPoints = doc.jdPoints[gameVersion];

        if (friendIds.indexOf(friendId) !== -1) dancerComponent.friend = 1;

        const item: any = {
            __class: CarouselClass.Item,
            isc: "dancercard_item_default",
            act: "ui_component_base",
            components: [dancerComponent],
        };

        if (carouselVersion >= 2) {
            item.actionList = requestDesc.actionListName;
            actionLists[requestDesc.actionListName] = actionListFormatted;
        } else {
            item.actions = actionListFormatted.actions;
        }
        items.push(item);
    }

    // Sort by live status (simplified)
    items.sort((a, b) => (b.components[0].live || 0) - (a.components[0].live || 0));

    if (carouselVersion >= 2) {
        return { items, actionLists };
    } else {
        return items;
    }
});
