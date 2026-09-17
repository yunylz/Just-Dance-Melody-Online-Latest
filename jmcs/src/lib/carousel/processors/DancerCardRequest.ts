
import { Request } from 'express';
import { registerProcessor } from "../registry";
import carouselLib from '../carousel';

registerProcessor("JD_CarouselDancerCardRequestDesc", async (requestDesc: any, req: Request) => {
    return carouselLib.makeOfflineRequest({
        requestDescClass: "JD_CarouselDancerCardRequest",
        requestDesc: requestDesc,
        request: req,
        actionListName: (requestDesc.hasOwnProperty("isSaveItem") ? undefined : requestDesc.actionListName)
    });
});
