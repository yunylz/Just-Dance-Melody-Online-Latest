
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import { CarouselClass } from '../../enums/carousel';

registerProcessor("JD_CarouselComVideoRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    const getActionList = (name: string) => {
        const list = rules?.actionLists?.[name];
        if (!list) throw new Error(`No action list with name ${name}`);
        return carouselLib.getFormattedActions(req, list);
    };

    const actionList = getActionList(requestDesc.actionListName);

    // TODO: implement com-videos filtering
    return {
        items: [],
        actionLists: {}
    };
});
