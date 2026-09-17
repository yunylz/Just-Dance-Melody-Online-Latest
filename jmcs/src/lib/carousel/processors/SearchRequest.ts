
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';

registerProcessor("JD_CarouselSearchRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);
    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);

    const item: any = {
        __class: CarouselClass.Item,
        act: "ui_component_base",
        components: []
    };

    if (requestDesc.tags) {
        item.isc = "grp_search_preset";
        const component: any = {
            __class: "JD_CarouselContentComponent_SearchPreset",
            presetTags: []
        };

        if (requestDesc.titleId) {
            component.presetTitle = (req as any).getLocalisation?.(requestDesc.titleId) || requestDesc.titleId;
            component.trackingTitle = component.presetTitle;
        } else {
            component.presetTitle = requestDesc.title || "Missing Title";
            component.trackingTitle = component.presetTitle;
        }

        requestDesc.tags.forEach((preset: any) => {
            if (preset.tagLocId) component.presetTags.push((req as any).getLocalisation?.(preset.tagLocId) || preset.tagLocId);
            else if (preset.tag) component.presetTags.push(preset.tag);
        });

        item.components.push(component);
    } else {
        item.isc = "grp_search";
    }

    const carouselVersion = (req as any).carouselVersion || 2;
    if (carouselVersion >= 2) {
        const actionLists: Record<string, any> = {};
        actionLists[requestDesc.actionListName] = actionListFormatted;
        item.actionList = requestDesc.actionListName;
        return {
            items: [item],
            actionLists: actionLists
        };
    } else {
        item.actions = actionListFormatted.actions;
        return [item];
    }
});
