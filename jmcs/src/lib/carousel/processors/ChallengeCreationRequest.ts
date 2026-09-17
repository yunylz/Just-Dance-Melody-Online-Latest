
import { Request } from 'express';
import { registerProcessor } from "../registry";
import cache from '../../cache';
import carouselLib from '../carousel';
import songs from '../../songs';
import challengeMatch from '../../challenge-match';
import config from '../../../config';
import { acceptsFilters } from '../filter';
import { buildRecommendedItems } from '../recommended';

registerProcessor("JD_CarouselChallengeCreationRequestDesc", async (requestDesc: any, req: Request) => {
    const { value: rules } = await cache.get("carousel:rules");

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    const actionListUpsell = rules?.actionLists?.[requestDesc.actionListUpsellName];

    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);

    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);
    const actionListUpsellFormatted = actionListUpsell ? carouselLib.getFormattedActions(req, actionListUpsell) : null;

    // ── fetchFromParty: mirror the /party page, rewired to this action list ──
    if (requestDesc.fetchFromParty) {
        const partyRule = rules?.rules?.["/party"];
        if (!partyRule) throw new Error("No /party rule found for fetchFromParty");

        const carouselVersion = (req as any).carouselVersion || 2;
        const actionLists: Record<string, any> = {
            [requestDesc.actionListName]: actionListFormatted,
        };
        if (requestDesc.actionListUpsellName && actionListUpsellFormatted) {
            actionLists[requestDesc.actionListUpsellName] = actionListUpsellFormatted;
        }

        // Every item from /party points at the create-challenge action list.
        const rewire = (items: any[]) => {
            for (const item of items) {
                if (carouselVersion >= 2) {
                    item.actionList = requestDesc.actionListName;
                    delete item.actions;
                } else if (actionListFormatted) {
                    item.actions = actionListFormatted.actions;
                }
            }
        };

        const categories: any[] = [];
        for (const partyCategory of partyRule.categories || []) {
            if (partyCategory.filters && !acceptsFilters(req, partyCategory.filters)) continue;

            const outCategory: any = {
                __class: "Category",
                title: partyCategory.hasOwnProperty("titleId")
                    ? (req as any).getLocalisation?.(partyCategory.titleId) || partyCategory.title
                    : partyCategory.title,
                act: partyCategory.act,
                isc: partyCategory.isc,
                items: [],
            };
            if (partyCategory.logoUrl) outCategory.logoUrl = partyCategory.logoUrl;
            if (partyCategory.order) outCategory.order = partyCategory.order;

            if (partyCategory.categoryType === "recommended") {
                const recActionListName = partyCategory.requests?.find((r: any) => r.actionListName)?.actionListName;
                const rec = await buildRecommendedItems(req, { actionListName: recActionListName });
                outCategory.items.push(...rec.items);
            } else {
                for (const reqDesc of partyCategory.requests || []) {
                    const result = await carouselLib.processRequest(reqDesc, req);
                    if (result.categories) {
                        if (!outCategory.categories) outCategory.categories = [];
                        outCategory.categories.push(...result.categories);
                    } else if (Array.isArray(result)) {
                        outCategory.items.push(...result);
                    } else if (result.items) {
                        outCategory.items.push(...result.items);
                    }
                }
            }

            rewire(outCategory.items);
            if (outCategory.categories) {
                for (const sub of outCategory.categories) rewire(sub.items || []);
            }

            categories.push(outCategory);
        }

        return { categories, actionLists };
    }

    if (!actionListUpsell) throw new Error(`No action list with name ${requestDesc.actionListUpsellName}`);

    const actionLists: Record<string, any> = {};
    actionLists[requestDesc.actionListName] = actionListFormatted;
    actionLists[requestDesc.actionListUpsellName] = actionListUpsellFormatted;

    // Validate categories
    if (!requestDesc.categories || !Array.isArray(requestDesc.categories)) {
        return { categories: [], actionLists };
    }

    for (const cat of requestDesc.categories) {
        if (!cat.title && !cat.titleId) throw new Error("Missing title/titleId in category");
        if (!cat.hasOwnProperty("existingPerformance")) throw new Error("Missing existingPerformance in category");
        if (cat.existingPerformance && (!cat.existingPerformance.hasOwnProperty("maxScore") || !cat.existingPerformance.hasOwnProperty("minScore")))
            throw new Error("minScore and maxScore expected in existingPerformance");
    }

    const outCategories = requestDesc.categories.map((cat: any) => ({
        __class: "Category",
        title: cat.hasOwnProperty("titleId") ? (req as any).getLocalisation?.(cat.titleId) || cat.title : cat.title,
        existingPerformance: cat.existingPerformance,
        jduMaps: !!cat.jduMaps,
        items: [],
    }));

    const allSongs = (req as any).allSongs || (await songs.getAllSongs()).songs;
    const songdb: Record<string, any> = {};
    const songNames: string[] = [];
    (allSongs || []).forEach((s: any) => {
        songdb[s.mapName] = s;
        songNames.push(s.mapName);
    });

    const pid = (req as any).profileId;
    const gameVersion = (req.sku as any)?.gameVersion;

    const challengesByMap = pid && gameVersion
        ? await challengeMatch.getChallengesByMapForPid({ pid, gameVersion })
        : {};

    // Sort songs alphabetically by title
    const orderedList = [...songNames].sort((a, b) => {
        const titleA = songdb[a]?.title || a;
        const titleB = songdb[b]?.title || b;
        return titleA.localeCompare(titleB);
    });

    orderedList.forEach((mapName: string) => {
        const songdbMap = songdb[mapName];
        const tags: string[] = songdbMap?.tags?.map?.((t: any) => t?.name || t) || [];

        // All songs are available — no subscription filtering
        if (tags.indexOf("Main") === -1 && tags.indexOf("Alternate") === -1) return;

        const challenges = challengesByMap[mapName];

        if (!challenges) {
            // No challenge — put in the first "no performance" category (jduMaps=false)
            for (let i = 0; i < outCategories.length; i++) {
                if (!outCategories[i].existingPerformance && !outCategories[i].jduMaps) {
                    outCategories[i].items.push({
                        __class: "Item",
                        isc: "grp_cover",
                        act: "ui_component_base",
                        components: [{
                            __class: "JD_CarouselContentComponent_Song",
                            mapName,
                        }],
                        actionList: requestDesc.actionListName,
                    });
                    break;
                }
            }
        } else {
            // Has a performance — put in the matching score category
            const score = challenges[0].value[1];
            const hasVideo = challenges[0].value[2];
            const ugcId = challenges[0].value[3];

            for (let i = 0; i < outCategories.length; i++) {
                const reqPerf = outCategories[i].existingPerformance;
                if (reqPerf && score >= reqPerf.minScore && score <= reqPerf.maxScore) {
                    const item: any = {
                        __class: "Item",
                        isc: "grp_cover",
                        act: "ui_component_base",
                        components: [{
                            __class: "JD_CarouselContentComponent_Song",
                            mapName,
                        }],
                        actionList: requestDesc.actionListName,
                    };
                    item.components.push({
                        __class: "JD_CarouselContentComponent_ChallengePerformance",
                        score,
                        videoThumbnailUrl: hasVideo
                            ? `${config.UGC_S3.FQDN}/${config.ENV.toLowerCase()}/ugc/${ugcId}/challenge_t0_m0.jpg`
                            : "",
                    });
                    outCategories[i].items.push(item);
                    break;
                }
            }
        }
    });

    const finalCategories = outCategories.filter((cat: any) => cat.items.length > 0);
    finalCategories.forEach((cat: any) => {
        delete cat.existingPerformance;
        delete cat.jduMaps;
    });

    return { categories: finalCategories, actionLists };
});
