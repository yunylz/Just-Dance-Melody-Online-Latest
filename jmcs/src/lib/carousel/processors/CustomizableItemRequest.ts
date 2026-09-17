
import { Request } from 'express';
import { registerProcessor } from "../registry";
import carouselLib from '../carousel';

registerProcessor("JD_CarouselCustomizableItemRequestDesc", async (requestDesc: any, req: Request) => {
    return carouselLib.makeOfflineRequest({
        requestDescClass: "JD_CarouselCustomizableItemRequest",
        requestDesc: requestDesc,
        request: req
    });
});
