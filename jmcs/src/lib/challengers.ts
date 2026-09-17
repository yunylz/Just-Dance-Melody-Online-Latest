import UgcModel from "./models/ugc";
import ProfileModel from "./models/profile";
import MatchModel from "./models/match";
import TauntModel from "./models/taunt";
import liveClient from "./live-client";
import ugcClient from "./ugc-client";
import { createLogger } from "./logger";

const logger = createLogger({ service: "challengers" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChallengeItemsOptions {
    profileId: string;
    friendIds?: string[];
    authorizedFriendIds?: string[];
    authorizedFriendsOnly?: boolean;
    country?: string;
    top?: boolean;
    challengeCount?: number;
    videoScoreCount?: number;
    nonvideoScoreCount?: number;
    onlineChallengeCount?: number;
    offlineChallengeCount?: number;
    onlineScoreCount?: number;
    offlineScoreCount?: number;
    platform: string;
    gameVersion?: string;
    onlyVictoryTaunts?: boolean;
    onlyDefeatTaunts?: boolean;
    availableSongs?: string[];
    actionListName: string;
    actions: any;
    actionListNameTaunt: string;
    actionsTaunt: any;
    actionListNameDefeat: string;
    actionsDefeat: any;
    carouselVersion?: number;
}

interface ChallengeItemsResult {
    items: any[];
    actionLists: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasVideoContent(doc: any): boolean {
    return !!doc.content && Object.keys(doc.content).length > 0;
}

/**
 * PIDs of players the user is already in an in-progress challenge match with.
 * Mirrors the original "isAlreadyChallenging" check.
 */
async function getInProgressOpponentPids(pid: string): Promise<Set<string>> {
    const matches = await MatchModel.find({
        challengers: pid,
        state: { $in: [0, 2] }, // inprogress | updatepending
    }).select("challengers").lean();
    const pids = new Set<string>();
    matches.forEach((m: any) => {
        m.challengers.forEach((c: string) => {
            if (c !== pid) pids.add(c);
        });
    });
    return pids;
}

/**
 * Builds a base query for challenge (type "ch") UGC entries.
 */
function buildChallengeFilter(options: ChallengeItemsOptions): Record<string, any> {
    const filter: Record<string, any> = {
        type: "ch",
        platform: options.platform,
        deleted: { $ne: 1 },
    };

    if (options.gameVersion && options.gameVersion !== "all") {
        filter.gameVersion = options.gameVersion;
    }
    if (options.availableSongs && options.availableSongs.length) {
        filter.mapName = { $in: options.availableSongs };
    }
    if (options.country) {
        filter.country = options.country;
    }
    if (options.authorizedFriendsOnly && options.authorizedFriendIds?.length) {
        filter.profileId = { $in: options.authorizedFriendIds };
    }

    return filter;
}

/**
 * Builds a "grp_challenger" carousel item for a challenge UGC entry.
 */
function buildChallengeItem(
    entry: any,
    options: ChallengeItemsOptions,
    actionListName: string,
    actions: any,
    actionLists: Record<string, any>
): any {
    const item: any = {
        __class: "Item",
        isc: "grp_challenger",
        act: "ui_component_base",
        components: [
            { __class: "JD_CarouselContentComponent_Song", mapName: entry.mapName },
        ],
    };

    const dancerComponent: any = {
        __class: "JD_CarouselContentComponent_Dancer",
        name: entry.name,
        avatar: entry.avatar,
        country: entry.country,
        profileId: entry.profileId,
        platformId: entry.platformId || "",
        platform: entry.platform || "",
        friend: (options.friendIds || []).some((fid) => fid === entry.profileId),
    };
    if (entry.skin) dancerComponent.skin = entry.skin;
    if (entry.portraitBorder) dancerComponent.portraitBorder = entry.portraitBorder;
    if (entry.jdPoints) dancerComponent.jdPoints = entry.jdPoints;

    const challengeComponent: any = {
        __class: "JD_CarouselContentComponent_Challenge",
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        score: entry.score,
        coach: entry.coach,
        device: entry.device,
        mine: options.profileId === entry.profileId,
    };
    if (entry.content) {
        challengeComponent.content = ugcClient.formatContent(entry.content, entry.ugcId);
    }
    if (entry.tauntMapName !== undefined) challengeComponent.tauntMapName = entry.tauntMapName;
    if (entry.tauntMessage !== undefined) challengeComponent.tauntMessage = entry.tauntMessage;
    if (entry.tauntVictory !== undefined) challengeComponent.tauntVictory = entry.tauntVictory;

    item.components.push(dancerComponent, challengeComponent);

    if (options.carouselVersion && options.carouselVersion >= 2) {
        item.actionList = actionListName;
        if (actionListName && actions) actionLists[actionListName] = actions;
    } else if (actions) {
        item.actions = actions.actions;
    }

    return item;
}

// ─── Score listings (World / Top) ─────────────────────────────────────────────

/**
 * Fetches the latest (or top) challenge scores from the UGC collection,
 * split between video and non-video scores.
 */
async function getChallengeScores(
    options: ChallengeItemsOptions,
    actionLists: Record<string, any>
): Promise<any[]> {
    const videoScoreCount = options.videoScoreCount || 0;
    const nonvideoScoreCount = options.nonvideoScoreCount || 0;
    const challengeCount = options.challengeCount || 0;

    const filter = buildChallengeFilter(options);
    const sort: Record<string, 1 | -1> = options.top ? { score: -1 } : { time: -1 };
    const limit = Math.min(challengeCount + videoScoreCount + nonvideoScoreCount + 20, 200);

    const docs = await UgcModel.find(filter).sort(sort).limit(limit).lean();

    const alreadyChallenging = await getInProgressOpponentPids(options.profileId);

    // Deduplicate by challenger — keep the best (top) or most recent (world) entry per player.
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const doc of docs as any[]) {
        if (doc.profileId === options.profileId) continue;       // can't challenge self
        if (alreadyChallenging.has(doc.profileId)) continue;     // already in a match
        if (seen.has(doc.profileId)) continue;                   // one entry per player
        seen.add(doc.profileId);
        unique.push(doc);
    }

    const videoDocs = unique.filter(hasVideoContent);
    const nonvideoDocs = unique.filter((d) => !hasVideoContent(d));

    const selected = [
        ...videoDocs.slice(0, videoScoreCount),
        ...nonvideoDocs.slice(0, nonvideoScoreCount),
    ];

    const raw = await ugcClient.formatUgcs(
        {
            profileId: options.profileId,
            friendIds: options.friendIds,
            gameVersion: options.gameVersion,
        },
        selected.map((d) => ({ id: d.ugcId, key: d.ugcId, value: [d.time || 0] }))
    );

    const { items, actionLists: itemActionLists } = ugcClient.buildItemResponse(raw, {
        type: "ch",
        platform: options.platform,
        gameVersion: options.gameVersion || "all",
        profileId: options.profileId,
        friendIds: options.friendIds,
        availableSongs: options.availableSongs,
        display: "challenge",
        actions: options.actions,
        actionListName: options.actionListName,
        carouselVersion: options.carouselVersion,
    });

    Object.assign(actionLists, itemActionLists);
    return items;
}

// ─── Taunt listings (Won / Lost challenges) ───────────────────────────────────

/**
 * Builds challenge items from taunts the user received (JD2016-2018 World
 * Video Challenge). A taunt is a challenge another player (`from`) sent the
 * user on `mapName`, with `victory` indicating whether the challenger won.
 * Won challenges (onlyDefeatTaunts) = challenger lost; Lost challenges
 * (onlyVictoryTaunts) = challenger won.
 */
async function getTauntChallengeItems(
    options: ChallengeItemsOptions,
    actionLists: Record<string, any>
): Promise<any[]> {
    const { profileId: pid, onlyVictoryTaunts, onlyDefeatTaunts, availableSongs } = options;
    if (!onlyVictoryTaunts && !onlyDefeatTaunts) return [];

    const taunts = await TauntModel.find({ to: pid }).sort({ time: -1 }).limit(50).lean();

    const items: any[] = [];

    for (const taunt of taunts as any[]) {
        // "victory" in the original means the challenger (from) won.
        const isVictory = !!taunt.victory;
        if (onlyVictoryTaunts && !isVictory) continue;
        if (onlyDefeatTaunts && isVictory) continue;

        if (availableSongs && availableSongs.length && availableSongs.indexOf(taunt.mapName) === -1) continue;

        // The challenge item points at the challenger's best score/video on the map.
        const ugc = await UgcModel.findOne({
            profileId: taunt.from,
            mapName: taunt.mapName,
            type: "ch",
            deleted: { $ne: 1 },
        }).sort({ score: -1 }).lean();
        if (!ugc) continue;

        const challengerProfile = await ProfileModel.findOne({ profileId: taunt.from }).lean() as any;

        const entry = {
            ...ugc,
            name: challengerProfile?.name,
            avatar: challengerProfile?.avatar,
            country: challengerProfile?.country,
            platformId: challengerProfile?.platformId,
            platform: challengerProfile?.platform,
            skin: challengerProfile?.skin,
            portraitBorder: challengerProfile?.portraitBorder,
            jdPoints: challengerProfile?.jdPoints,
            tauntMapName: taunt.mapName,
            tauntMessage: taunt.message,
            tauntVictory: taunt.victory,
        };

        const actionListName = isVictory ? options.actionListNameTaunt : options.actionListNameDefeat;
        const actions = isVictory ? options.actionsTaunt : options.actionsDefeat;

        items.push(buildChallengeItem(entry, options, actionListName, actions, actionLists));
    }

    return items;
}

// ─── Friend challenges ────────────────────────────────────────────────────────

/**
 * Fetches the latest challenges made by the user's friends, split between
 * online (live) and offline friends.
 */
async function getFriendChallengeItems(
    options: ChallengeItemsOptions,
    actionLists: Record<string, any>
): Promise<any[]> {
    const friendIds = (options.friendIds || []).slice(0, 45);
    if (!friendIds.length) return [];

    const onlineChallengeCount = options.onlineChallengeCount || 0;
    const offlineChallengeCount = options.offlineChallengeCount || 0;

    const filter: Record<string, any> = {
        type: "ch",
        platform: options.platform,
        profileId: { $in: friendIds },
        deleted: { $ne: 1 },
    };
    if (options.gameVersion && options.gameVersion !== "all") {
        filter.gameVersion = options.gameVersion;
    }
    if (options.availableSongs && options.availableSongs.length) {
        filter.mapName = { $in: options.availableSongs };
    }

    const docs = await UgcModel.find(filter).sort({ time: -1 }).limit(100).lean();

    // One challenge per friend
    const seen = new Set<string>();
    const unique = (docs as any[]).filter((d) => {
        if (seen.has(d.profileId)) return false;
        seen.add(d.profileId);
        return true;
    });

    const online: any[] = [];
    const offline: any[] = [];
    for (const doc of unique) {
        const live = await liveClient.isLive(doc.profileId);
        if (live) online.push(doc);
        else offline.push(doc);
    }

    const selected = [
        ...online.slice(0, onlineChallengeCount),
        ...offline.slice(0, offlineChallengeCount),
    ];

    const raw = await ugcClient.formatUgcs(
        {
            profileId: options.profileId,
            friendIds,
            gameVersion: options.gameVersion,
        },
        selected.map((d) => ({ id: d.ugcId, key: d.ugcId, value: [d.time || 0] }))
    );

    const { items, actionLists: itemActionLists } = ugcClient.buildItemResponse(raw, {
        type: "ch",
        platform: options.platform,
        gameVersion: options.gameVersion || "all",
        profileId: options.profileId,
        friendIds,
        availableSongs: options.availableSongs,
        display: "challenge",
        actions: options.actions,
        actionListName: options.actionListName,
        carouselVersion: options.carouselVersion,
    });

    Object.assign(actionLists, itemActionLists);
    return items;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Entry point for JD_CarouselLatestChallengesRequestDesc.
 * Builds the World / Top / Won / Lost challenge listings.
 */
async function getLatestChallengeItems(options: ChallengeItemsOptions): Promise<ChallengeItemsResult> {
    const actionLists: Record<string, any> = {};

    const tauntItems = await getTauntChallengeItems(options, actionLists);
    const scoreItems = await getChallengeScores(options, actionLists);

    return {
        items: [...tauntItems, ...scoreItems],
        actionLists,
    };
}

/**
 * Entry point for JD_CarouselFriendChallengesRequestDesc.
 * Builds the Friends challenge listing.
 */
async function getFriendChallenges(options: ChallengeItemsOptions): Promise<ChallengeItemsResult> {
    const actionLists: Record<string, any> = {};
    const items = await getFriendChallengeItems(options, actionLists);
    return { items, actionLists };
}

export default {
    getLatestChallengeItems,
    getFriendChallenges,
};
