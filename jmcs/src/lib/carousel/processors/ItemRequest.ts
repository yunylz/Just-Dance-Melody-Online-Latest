
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';
import { acceptsFilters } from '../filter';

registerProcessor("JD_CarouselItemRequestDesc", async (requestDesc: any, req: Request) => {
    // Evaluate request-level filters — skip this request if filters don't match
    if (requestDesc.filters && !acceptsFilters(req, requestDesc.filters)) {
        return { items: [], actionLists: {}, itemLists: null };
    }

    const { value: itemLists } = await cache.get("carousel:item-lists");
    const itemList = itemLists?.[requestDesc.itemList];
    if (!itemList) throw new Error(`No item list with name ${requestDesc.itemList} Request UUID: ${requestDesc.uuid}`);

    const { value: rules } = await cache.get("carousel:rules");
    const actionListName = itemList.actionListName;
    if (actionListName && !rules?.actionLists?.[actionListName]) {
        throw new Error(`No action list with name ${actionListName} Request UUID: ${requestDesc.uuid}`);
    }
    const actionList = actionListName ? rules?.actionLists?.[actionListName] : null;

    const upsellActionListName = itemList.upsellActionListName;
    const upsellActionList = upsellActionListName ? rules?.actionLists?.[upsellActionListName] : null;

    const outActionLists: Record<string, any> = {};
    let outItemLists: any = null;
    const outItems: any[] = [];
    let endPos = requestDesc.endPos;

    const createItem = (itemDesc: any) => {
        const outItem: any = {
            __class: CarouselClass.Item,
            isc: itemDesc.isc,
            act: itemDesc.act,
            components: []
        };

        const attachActionList = (actionListName: string, actionListData: any) => {
            const carouselVersion = (req as any).carouselVersion || 2;
            if (carouselVersion >= 2) {
                if (actionListName) {
                    outItem.actionList = actionListName;
                    if (!outActionLists[actionListName]) {
                        outActionLists[actionListName] = carouselLib.getFormattedActions(req, actionListData);
                    }
                }
            } else {
                const formatted = carouselLib.getFormattedActions(req, actionListData);
                outItem.actions = formatted ? formatted.actions : [];
            }
        };

        if (endPos) outItem.endPos = endPos++;

        if (itemDesc.hasOwnProperty("mapName")) {
            outItem.components.push({
                __class: CarouselClass.JD_CarouselContentComponent_Song,
                mapName: itemDesc.mapName
            });
        } else if (itemDesc.hasOwnProperty("shuffle")) {
            outItem.components.push({
                __class: "JD_CarouselContentComponent_Shuffle"
            });
        }

        if (itemDesc.actionListName) {
            if (!rules.actionLists[itemDesc.actionListName]) throw new Error(`No action list with name ${itemDesc.actionListName}`);
            attachActionList(itemDesc.actionListName, rules.actionLists[itemDesc.actionListName]);
        } else {
            attachActionList(itemList.actionListName, actionList);
        }

        return outItem;
    };

    if (requestDesc.offline) {
        const offlineRequest = JSON.parse(JSON.stringify(requestDesc));
        offlineRequest.__class = "JD_CarouselItemRequest";
        outItems.push({
            __class: CarouselClass.Item,
            offlineRequest: offlineRequest
        });

        outItemLists = {};
        outItemLists[requestDesc.itemList] = JSON.parse(JSON.stringify(itemList));
        if (itemList.actionListName) outActionLists[itemList.actionListName] = carouselLib.getFormattedActions(req, actionList);
        if (upsellActionList) outActionLists[itemList.upsellActionListName] = carouselLib.getFormattedActions(req, upsellActionList);
    }

    for (const item of itemList.list) {
        if (requestDesc.offline) {
            if (item.actionListName) {
                if (!rules.actionLists[item.actionListName]) throw new Error(`No action list with name ${item.actionListName}`);
                outActionLists[item.actionListName] = carouselLib.getFormattedActions(req, rules.actionLists[item.actionListName]);
            }
        } else {
            const outItem = createItem(item);
            if (outItem && (outItem as any).error) throw (outItem as any).error;
            if (outItem) outItems.push(outItem);
        }
    }

    await carouselLib.addNewTag(outItems);

    const carouselVersion = (req as any).carouselVersion || 2;
    if (carouselVersion >= 2) {
        return {
            items: outItems,
            actionLists: outActionLists,
            itemLists: outItemLists
        };
    } else {
        return outItems;
    }
});
