
import { Request } from 'express';
import { registerProcessor } from "../registry";
import carouselLib from '../carousel';

registerProcessor("JD_CarouselGenericOfflineRequest", async (requestDesc: any, req: Request) => {
    if (!requestDesc.payloadClass) throw new Error("payloadClass is expected for JD_CarouselGenericOfflineRequest");

    return carouselLib.makeOfflineRequest({
        requestDescClass: requestDesc.payloadClass,
        requestDesc: requestDesc.payload || {},
        request: req,
        actionListName: requestDesc.payload?.actionListName
    });
});
