
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import QuestModel from '../../models/quest';

registerProcessor("JD_CarouselQuestRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    const startAction = rules?.actionLists?.[requestDesc.startAction];
    if (!startAction) throw new Error(`No action list with name ${requestDesc.startAction}`);
    const actionListSubscribed = carouselLib.getFormattedActions(req, startAction);

    // `upsellAction` only exists on non-offline rows (e.g. "Just Dance
    // Unlimited"). Offline rows are served with just `startAction`.
    let actionListUnsubscribed: any;
    if (requestDesc.upsellAction) {
        const upsellAction = rules?.actionLists?.[requestDesc.upsellAction];
        if (!upsellAction) throw new Error(`No action list with name ${requestDesc.upsellAction}`);
        actionListUnsubscribed = carouselLib.getFormattedActions(req, upsellAction);
    }

    if (requestDesc.offline) {
        const offlineRequest = await carouselLib.makeOfflineRequest({
            requestDescClass: "JD_CarouselQuestRequest",
            requestDesc: requestDesc,
            request: req,
            actionListName: requestDesc.startAction
        });
        // Minor tweaks for v2 as per original code
        const carouselVersion = (req as any).carouselVersion || 2;
        if (carouselVersion >= 2) {
            const item = (offlineRequest as any).items[0];
            delete item.offlineRequest.startAction;
            item.offlineRequest.actionListName = requestDesc.startAction;
        }
        return offlineRequest;
    }

    // Private server: everyone is treated as subscribed, so quests use the
    // "start" action list. Ported from the OG JD_CarouselQuestRequestDesc.
    const hasSubscription = true;
    const carouselVersion = (req as any).carouselVersion || 2;
    const actionLists: Record<string, any> = {};

    const quests = await QuestModel.find({}).sort({ id: 1 }).lean();

    const items = quests.map((quest) => {
        const outItem: any = {
            __class: "Item",
            isc: "quest_item",
            act: "ui_component_base",
            components: [
                {
                    __class: "JD_CarouselContentComponent_Quest",
                    questId: quest.id,
                },
            ],
        };

        if (carouselVersion >= 2) {
            const actionListName = hasSubscription ? requestDesc.startAction : requestDesc.upsellAction;
            const actions = hasSubscription ? actionListSubscribed : actionListUnsubscribed;
            outItem.actionList = actionListName;
            if (actionListName && actions) {
                actionLists[actionListName] = actions;
            }
        } else {
            outItem.actions = (hasSubscription ? actionListSubscribed : actionListUnsubscribed).actions;
        }

        return outItem;
    });

    return { items, actionLists };
});
