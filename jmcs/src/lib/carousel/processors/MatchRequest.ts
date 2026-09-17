
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import challengeMatch from '../../challenge-match';

registerProcessor("JD_CarouselMatchRequestDesc", async (requestDesc: any, req: Request) => {
    if (!requestDesc.matchType || ["friendly", "ranked"].indexOf(requestDesc.matchType) === -1)
        throw new Error(`Incorrect MatchType in requestDesc - ${requestDesc.matchType}`);

    if (!requestDesc.matchState || ["playerTurn", "waitingTurn", "completed"].indexOf(requestDesc.matchState) === -1)
        throw new Error(`Incorrect matchState in requestDesc - ${requestDesc.matchState}`);

    const { value: rules } = await cache.get("carousel:rules");
    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);

    const pid = (req as any).profileId;
    if (!pid) return { items: [], actionLists: {} };

    const actions = carouselLib.getFormattedActions(req, actionList);
    const result = await challengeMatch.getCarouselMatchItems({
        pid,
        matchType: requestDesc.matchType,
        matchState: requestDesc.matchState,
        actionListName: requestDesc.actionListName,
        actions,
    });

    return result;
});
