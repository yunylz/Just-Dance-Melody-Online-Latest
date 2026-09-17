
import { Request } from 'express';
import { registerProcessor } from '../registry';
import cache from '../../cache';
import carouselLib from '../carousel';
import profiles from '../../profiles';
import playlistDb from '../../playlistdb';
import { CarouselClass } from '../../enums/carousel';
import config from '../../../config';
import { createLogger } from '../../logger';

const logger = createLogger({ service: "PlaylistsRequest-processor" });

const DISPLAY_METHOD_MANUAL = "manual";
const DISPLAY_METHOD_RECOMMENDED = "recommended";
const DISPLAY_METHOD_RANDOM = "random";

const DISPLAY_CODE_MANUAL = 1;
const DISPLAY_CODE_RECOMMENDED = 2;
const DISPLAY_CODE_RANDOM = 3;
const DISPLAY_CODE_CONDITIONAL = 4;

registerProcessor("JD_CarouselPlaylistsRequestDesc", async (requestDesc: any, req: Request) => {
    const rules = (req as any).carouselRules || (await cache.get("carousel:rules")).value;

    const actionList = rules?.actionLists?.[requestDesc.actionListName];
    if (!actionList) throw new Error(`No action list with name ${requestDesc.actionListName}`);
    const actionListFormatted = carouselLib.getFormattedActions(req, actionList);

    const actionListUpsell = rules?.actionLists?.[requestDesc.actionListNameUpsell];
    if (!actionListUpsell) throw new Error(`No action list upsell with name ${requestDesc.actionListNameUpsell}`);
    const actionListUpsellFormatted = carouselLib.getFormattedActions(req, actionListUpsell);

    if (requestDesc.offline) {
        return carouselLib.makeOfflineRequest({
            requestDescClass: "JD_CarouselPlaylistsRequest",
            requestDesc: requestDesc,
            request: req,
            actionListName: requestDesc.actionListName
        });
    }

    const retval: any = {
        items: [],
        actionLists: {}
    };

    // Simplified recommendation data for now
    let recommendation = {
        editorial: [] as string[],
        recommended: [] as string[]
    };

    const pid = (req as any).ticket?.pid || (req as any).profileId;
    const profileData = pid ? await profiles.getProfile(pid) : null;

    // Use playlistdb to get available playlists
    if (pid && !(req as any).profileId) {
        (req as any).profileId = pid;
    }
    const playlists = await playlistDb.getPlaylistDb(req);
    recommendation.editorial = Object.keys(playlists);

    const addPlaylist = (id: string, tracking?: any) => {
        if (!recommendation.editorial.includes(id) && !recommendation.recommended.includes(id)) return;

        const item: any = {
            __class: CarouselClass.Item,
            isc: requestDesc.isc || "grp_cover",
            act: requestDesc.act || "ui_component_base",
            actionList: requestDesc.actionListName,
            actionListUpsell: requestDesc.actionListNameUpsell,
            components: [{
                __class: "JD_CarouselContentComponent_Playlist",
                playlistID: id
            }]
        };
        if (tracking) {
            item.components[0].displayCode = tracking.displayCode;
            item.components[0].displayMethod = tracking.displayMethod;
        }
        retval.items.push(item);
        retval.actionLists[requestDesc.actionListName] = actionListFormatted;
        retval.actionLists[requestDesc.actionListNameUpsell] = actionListUpsellFormatted;
    };

    const filters: Record<string, any> = {
        "edito-pinned": {
            process: async (desc: any) => {
                addPlaylist(desc.playlistId);
            },
            displayMethod: DISPLAY_METHOD_MANUAL,
            displayCode: DISPLAY_CODE_MANUAL
        },
        "edito-random": {
            process: async (desc: any) => {
                const pool = [...(desc.playlistIds || recommendation.editorial)];
                let count = desc.maxCount || 0;
                while (count > 0 && pool.length > 0) {
                    const idx = Math.floor(Math.random() * pool.length);
                    addPlaylist(pool.splice(idx, 1)[0]);
                    count--;
                }
            },
            displayMethod: DISPLAY_METHOD_RANDOM,
            displayCode: DISPLAY_CODE_RANDOM
        },
        "edito-recommended": {
            process: async (desc: any) => {
                const pool = [...recommendation.editorial];
                let count = desc.maxCount || 0;
                while (count > 0 && pool.length > 0) {
                    addPlaylist(pool.shift()!);
                    count--;
                }
            },
            displayMethod: DISPLAY_METHOD_RECOMMENDED,
            displayCode: DISPLAY_CODE_RECOMMENDED
        },
        "reco-for_you": {
            process: async (desc: any) => {
                addPlaylist("reco-for_you");
            },
            displayMethod: DISPLAY_METHOD_MANUAL,
            displayCode: DISPLAY_CODE_MANUAL
        },
        "reco-top_country": {
            process: async (desc: any) => {
                addPlaylist("reco-top_country");
            },
            displayMethod: DISPLAY_METHOD_MANUAL,
            displayCode: DISPLAY_CODE_MANUAL
        },
        "reco-top_replayed": {
            process: async (desc: any) => {
                addPlaylist("reco-top_replayed");
            },
            displayMethod: DISPLAY_METHOD_RANDOM,
            displayCode: DISPLAY_CODE_RANDOM
        },
        "reco-discover": {
            process: async (desc: any) => {
                addPlaylist("reco-discover");
            },
            displayMethod: DISPLAY_METHOD_RANDOM,
            displayCode: DISPLAY_CODE_RANDOM
        },
        "random": {
            process: async (desc: any) => {
                if (desc.choices && desc.choices.length > 0) {
                    const totalWeight = desc.choices.reduce((acc: number, choice: any) => acc + (choice.weight || 0), 0);
                    let random = Math.random() * totalWeight;
                    let selectedChoice = desc.choices[0];
                    for (const choice of desc.choices) {
                        if (random < (choice.weight || 0)) {
                            selectedChoice = choice;
                            break;
                        }
                        random -= (choice.weight || 0);
                    }
                    await processRequestDesc(selectedChoice);
                }
            }
        },
        "manual_then_reco_plus_random": {
            process: async (desc: any) => {
                const pool = [...recommendation.editorial];
                // Exclude all recommendation playlists (reco-* prefix) from themed playlists
                const filteredPool = pool.filter(id => !id.startsWith("reco-"));
                
                let count = desc.maxCount || 0;
                const recommendedCount = desc.recommendedCount || 1;
                const randomCount = desc.randomCount || 2;
                
                while (count > 0 && filteredPool.length > 0) {
                    for (let i = 0; i < recommendedCount && count > 0 && filteredPool.length > 0; i++) {
                        const id = filteredPool.shift()!;
                        addPlaylist(id, { displayCode: DISPLAY_CODE_RECOMMENDED, displayMethod: DISPLAY_METHOD_RECOMMENDED });
                        count--;
                    }
                    for (let i = 0; i < randomCount && count > 0 && filteredPool.length > 0; i++) {
                        const idx = Math.floor(Math.random() * filteredPool.length);
                        const id = filteredPool.splice(idx, 1)[0];
                        addPlaylist(id, { displayCode: DISPLAY_CODE_RANDOM, displayMethod: DISPLAY_METHOD_RANDOM });
                        count--;
                    }
                }
            }
        }
    };

    const processRequestDesc = async (desc: any) => {
        const filter = filters[desc.type];
        if (filter) {
            await filter.process(desc);
            // Apply tracking if not already set
            retval.items.forEach((item: any) => {
                if (item.components[0].__class === "JD_CarouselContentComponent_Playlist") {
                    if (item.components[0].displayCode === undefined) {
                        item.components[0].displayCode = filter.displayCode;
                    }
                    if (item.components[0].displayMethod === undefined) {
                        item.components[0].displayMethod = filter.displayMethod || desc.trackingTag;
                    }
                }
            });
        }
    };

    await processRequestDesc(requestDesc);

    await carouselLib.addNewTag(retval.items);

    return retval;
});
