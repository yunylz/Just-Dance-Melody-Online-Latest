
import { Request } from 'express';
import { registerProcessor, executeRequestProcessor } from '../registry';
import cache from '../../cache';
import carouselLib from '../carousel';
import abTesting from '../ab-testing';
import algoRecommendations from '../algo-recommendations';
import { CarouselClass } from '../../enums/carousel';
import config from '../../../config';

registerProcessor("JD_CarouselAutoRecommendationRequestDesc", async (requestDesc: any, req: Request) => {
    const population = await abTesting.getPopulation(req);

    let populationConfig = {
        manual: true,
        automatic: true
    };

    if (population) {
        const recommendationPopulation = population.populations.find((p: any) => p.subject === "Recommendation");
        if (recommendationPopulation) populationConfig = recommendationPopulation.obj;
    }

    const getManualRecommendation = async () => {
        if (populationConfig.manual && requestDesc.manualRecommendationItemList) {
            const embeddedRequest = {
                __class: "JD_CarouselItemRequestDesc",
                itemList: requestDesc.manualRecommendationItemList
            };
            return executeRequestProcessor(embeddedRequest, req);
        }
        return { items: [], actionLists: {} };
    };

    const getAutomaticRecommendation = async () => {
        const result: { items: any[], actionLists: Record<string, any> } = { items: [], actionLists: {} };
        const lastMapPlayed = req.body.lastMapPlayed;
        if (!populationConfig.automatic || !lastMapPlayed) return result;

        const rules = (req as any).carouselRules || (await cache.get("carousel:rules")).value;
        const actionList = rules?.actionLists?.[requestDesc.actionListName];
        const actionListUpsell = rules?.actionLists?.[requestDesc.actionListNameUpsell];

        if (!actionList || !actionListUpsell) return result;

        const recommendedSongs = algoRecommendations.get(lastMapPlayed);

        for (const songName of recommendedSongs) {
            const isAvailable = ((req as any).availableSongs || []).indexOf(songName) !== -1;
            const actionListName = isAvailable ? requestDesc.actionListName : requestDesc.actionListNameUpsell;
            const currentActionList = isAvailable ? actionList : actionListUpsell;

            (result.actionLists as any)[actionListName] = carouselLib.getFormattedActions(req, currentActionList);

            result.items.push({
                __class: CarouselClass.Item,
                isc: "grp_cover",
                act: "ui_component_base",
                components: [{
                    __class: CarouselClass.JD_CarouselContentComponent_Song,
                    mapName: songName
                }],
                actionList: actionListName
            });
        }

        return result;
    };

    const [manual, auto] = await Promise.all([getManualRecommendation(), getAutomaticRecommendation()]);

    // Interleave and remove duplicates
    const removeDuplicatedItems = (manualItems: any[], autoItems: any[]) => {
        const uniqueSongs = new Set<string>();
        const filterUnique = (items: any[]) => {
            return items.filter(item => {
                const songName = item.components?.[0]?.mapName;
                if (!songName) return true;
                if (uniqueSongs.has(songName)) return false;
                uniqueSongs.add(songName);
                return true;
            });
        };
        // This is a bit simplified compared to original which interleaves then removes
        return {
            manual: filterUnique(manualItems),
            auto: filterUnique(autoItems)
        };
    };

    const { manual: manualFiltered, auto: autoFiltered } = removeDuplicatedItems(manual.items, auto.items);

    const manualAvailable = carouselLib.availabilityFilter(manualFiltered, req);
    const autoAvailable = carouselLib.availabilityFilter(autoFiltered, req);

    // Add metadata
    manualAvailable.forEach(item => {
        item.components.push({
            __class: CarouselClass.JD_CarouselContentComponent_Metadata,
            recommendationSource: "manual"
        });
    });
    autoAvailable.forEach(item => {
        item.components.push({
            __class: CarouselClass.JD_CarouselContentComponent_Metadata,
            recommendationSource: "automatic"
        });
    });

    // Interleave
    const finalItems: any[] = [];
    const maxLen = Math.max(manualAvailable.length, autoAvailable.length);
    for (let i = 0; i < maxLen; i++) {
        if (manualAvailable[i]) finalItems.push(manualAvailable[i]);
        if (autoAvailable[i]) finalItems.push(autoAvailable[i]);
    }

    if (requestDesc.maxCount) {
        finalItems.length = Math.min(requestDesc.maxCount, finalItems.length);
    }

    await carouselLib.addNewTag(finalItems);

    return {
        items: finalItems,
        actionLists: { ...manual.actionLists, ...auto.actionLists }
    };
});
