import UgcModel from "./models/ugc";
import ProfileModel from "./models/profile";
import cache from "./cache";
import { getRedisClient } from "./clients/redis";
import ugcS3 from "./ugc-s3";
import { createLogger } from "./logger";

const logger = createLogger({ service: "ugc-client" });

// Types for UGC component formatting
interface UgcEntry extends Record<string, any> {
    ugcId: string;
    type: string;
    profileId: string;
    mapName?: string;
    content?: Record<string, any>;
    time: number;
    likes?: number;
    views?: number;
    featured?: number;
    like?: boolean;
    stale?: boolean;
    name?: string;
    avatar?: number;
    country?: number;
    platformId?: string;
    platform?: string;
    skin?: number;
    portraitBorder?: number;
    jdPoints?: any;
    contest?: number;
    sequence?: number;
    coach?: number;
    device?: number;
    score?: number;
    moves?: string;
}

interface GetItemsOptions {
    type: string;
    platform: string;
    gameVersion: string;
    profileId?: string;
    excludeProfileId?: string;
    maxCount?: number;
    count?: number;
    display?: string;
    friendIds?: string[];
    availableSongs?: string[];
    actions?: any;
    actionListName?: string;
    actionsSelf?: any;
    actionListNameSelf?: string;
    actionsUpsell?: any;
    actionListNameUpsell?: string;
    carouselVersion?: number;
    featured?: boolean;
    mostLiked?: boolean;
    mostViewed?: boolean;
    profileIds?: string[];
    tags?: string[];
    currentContestOnly?: boolean;
    platformList?: string[];
}

// ─── Component formatters ─────────────────────────────────────────────────────

function formatAutodanceComponent(entry: UgcEntry) {
    return {
        __class: "JD_CarouselContentComponent_Autodance",
        likes: entry.likes || 0,
        like: entry.like,
        views: entry.views || 0,
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        content: entry.content,
    };
}

function formatChallengeComponent(entry: UgcEntry) {
    return {
        __class: "JD_CarouselContentComponent_Challenge",
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        content: entry.content,
        score: entry.score,
        coach: entry.coach,
        device: entry.device,
    };
}

function formatCommunityRemixComponent(entry: UgcEntry) {
    return {
        __class: "JD_CarouselContentComponent_CommunityRemix",
        avatar: entry.avatar,
        contest: entry.contest,
        country: entry.country,
        likes: entry.likes || 0,
        like: entry.like,
        name: entry.name,
        sequence: entry.sequence,
        views: entry.views || 0,
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        content: entry.content,
    };
}

function formatShowtimeComponent(entry: UgcEntry) {
    return {
        __class: "JD_CarouselContentComponent_Showtime",
        likes: entry.likes || 0,
        like: entry.like,
        views: entry.views || 0,
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        content: entry.content,
    };
}

function formatDanceMachineComponent(entry: UgcEntry) {
    return {
        __class: "JD_CarouselContentComponent_JDM",
        likes: entry.likes || 0,
        like: entry.like,
        views: entry.views || 0,
        ugcId: entry.ugcId,
        time: entry.time,
        featuredTime: entry.featured || 0,
        content: entry.content,
        ugcNumber: entry.mapName,
    };
}

const formatComponentHandlers: Record<string, (entry: UgcEntry) => any> = {
    ad: formatAutodanceComponent,
    ch: formatChallengeComponent,
    cr: formatCommunityRemixComponent,
    st: formatShowtimeComponent,
    dm: formatDanceMachineComponent,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a UGC document's content object by attaching public URLs.
 */
function formatContent(content: Record<string, any> | undefined, ugcId: string): Record<string, any> | undefined {
    if (!content || typeof content !== "object") return content;

    const baseUrl = ugcS3.getContentBaseUrl(ugcId);
    const result: Record<string, any> = {};
    for (const [fileName, fileData] of Object.entries(content)) {
        result[fileName] = {
            ...fileData as any,
            url: baseUrl + fileName,
            __class: "UGCContent",
        };
    }
    return result;
}

/**
 * Formats a full UGC document for API responses.
 */
function formatUgc(data: Record<string, any>, ugcId: string): Record<string, any> {
    data.content = formatContent(data.content, ugcId);
    data.__class = "UGCEntry";
    return data;
}

// ─── Database operations ──────────────────────────────────────────────────────

/**
 * Wraps a UGC mutation in a findOneAndUpdate with optimistic concurrency.
 * Reads the current doc, calls the handler to mutate it, then writes back.
 */
async function updateUgc(
    ugcId: string,
    handler: (doc: Record<string, any>, callback: (err?: any) => void) => void
): Promise<void> {
    const doc = await UgcModel.findOne({ ugcId }).lean();
    if (!doc) {
        const err: any = new Error("Document not found");
        err.code = "keyNotFound";
        throw err;
    }

    const mutable = { ...doc };
    await new Promise<void>((resolve, reject) => {
        handler(mutable, (err?: any) => {
            if (err) return reject(err);
            resolve();
        });
    });

    const { _id, ...updateData } = mutable;
    await UgcModel.updateOne({ ugcId }, { $set: updateData });
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Attaches dancer profile info to UGC entries, checks likes, and filters deleted/stale.
 */
async function formatUgcs(
    options: { profileId?: string; friendIds?: string[]; authorizedFriendIds?: string[]; gameVersion?: string },
    entries: { id: string; key: string; value: any[] }[]
): Promise<Record<string, any>[]> {
    if (!entries.length) return [];

    const ugcIds = entries.map((e) => e.id);
    const ugcDocs = await UgcModel.find({ ugcId: { $in: ugcIds } }).lean();
    const ugcMap = new Map(ugcDocs.map((d) => [d.ugcId, d]));

    const results: Record<string, any>[] = [];

    for (const entry of entries) {
        const doc = ugcMap.get(entry.id);
        if (!doc || doc.deleted) continue;

        const entryData: Record<string, any> = { ...doc };
        entryData.ugcId = entry.id;
        formatUgc(entryData, entry.id);

        results.push(entryData);
    }

    // Enrich with dancer profiles
    const profileIds = [...new Set(results.map((r) => r.profileId).filter(Boolean))];
    const profiles = await ProfileModel.find({ profileId: { $in: profileIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

    for (const doc of results) {
        const profile = profileMap.get(doc.profileId);
        if (!profile) {
            doc.stale = true;
            continue;
        }

        doc.name = profile.name;
        doc.avatar = profile.avatar;
        doc.country = profile.country;
        doc.platformId = profile.platformId;
        doc.platform = (profile as any).platform;
        doc.skin = profile.skin;

        if (profile.portraitBorder) doc.portraitBorder = profile.portraitBorder;
        if (options.gameVersion && options.gameVersion !== "all") {
            doc.jdPoints = typeof profile.jdPoints === "object"
                ? profile.jdPoints[options.gameVersion]
                : profile.jdPoints;
        }

        // Check if the current user liked this UGC
        if (options.profileId) {
            const redis = getRedisClient();
            const liked = await redis.sIsMember(`ul:${doc.ugcId}`, options.profileId);
            doc.like = liked;
        }
    }

    return results.filter((r) => !r.stale);
}

/**
 * Runs a view-like query on MongoDB for UGC listings.
 */
async function queryUgcs(
    filter: Record<string, any>,
    sort: Record<string, 1 | -1> = { time: -1 },
    limit: number = 50,
    skip: number = 0
): Promise<{ id: string; key: string; value: any[] }[]> {
    const docs = await UgcModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    return docs.map((doc) => ({
        id: doc.ugcId,
        key: doc.ugcId,
        value: [doc.time || 0],
    }));
}

// ─── Request handlers ─────────────────────────────────────────────────────────

/**
 * Processes a "specific" UGC request (by view: featured, likes, views, time).
 */
async function processSpecificRequest(options: GetItemsOptions): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    const { type, platform, gameVersion } = options;
    const count = options.count || 50;

    const filter: Record<string, any> = {
        type,
        platform,
        deleted: { $ne: 1 },
    };

    if (options.excludeProfileId) {
        filter.profileId = { $ne: options.excludeProfileId };
    }

    if (gameVersion !== "all") {
        filter.gameVersion = gameVersion;
    }

    let sort: Record<string, 1 | -1> = { time: -1 };
    if (options.featured) sort = { featured: -1 };
    else if (options.mostLiked) sort = { likes: -1 };
    else if (options.mostViewed) sort = { views: -1 };

    const entries = await queryUgcs(filter, sort, count);
    const rawUgcs = await formatUgcs(options, entries);

    return buildItemResponse(rawUgcs.slice(0, count), options);
}

/**
 * Processes a request filtered by profile IDs.
 */
async function processPidsRequest(options: GetItemsOptions): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    const pids = (options.profileIds || []).slice(0, 27);

    if (!pids.length) return { items: [], actionLists: {} };

    const filter: Record<string, any> = {
        type: options.type,
        platform: options.platform,
        profileId: { $in: pids },
        deleted: { $ne: 1 },
    };

    if (options.excludeProfileId) {
        filter.profileId = { $in: pids, $ne: options.excludeProfileId };
    }

    const docs = await UgcModel.find(filter)
        .sort({ time: -1 })
        .limit(options.count || 50)
        .lean();

    const entries = docs
        .filter((d) => !d.deleted)
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, options.count || 50)
        .map((doc) => ({
            id: doc.ugcId,
            key: doc.ugcId,
            value: [doc.time || 0],
        }));

    const rawUgcs = await formatUgcs(options, entries);
    return buildItemResponse(rawUgcs, options);
}

/**
 * Processes a request filtered by tags.
 */
async function processTagsRequest(options: GetItemsOptions): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    const tags = (options.tags || []).slice(0, 20);

    if (!tags.length) return { items: [], actionLists: {} };

    const filter: Record<string, any> = {
        type: options.type,
        platform: options.platform,
        tags: { $in: tags },
        deleted: { $ne: 1 },
    };

    const docs = await UgcModel.find(filter).sort({ time: -1 }).lean();

    // Deduplicate by ugcId
    const seen = new Set<string>();
    const unique = docs.filter((d) => {
        if (seen.has(d.ugcId)) return false;
        seen.add(d.ugcId);
        return true;
    });

    const sorted = unique.sort((a, b) => (b.time || 0) - (a.time || 0));
    const sliced = sorted.slice(0, options.count || 50);

    const entries = sliced.map((doc) => ({
        id: doc.ugcId,
        key: doc.ugcId,
        value: [doc.time || 0],
    }));

    const rawUgcs = await formatUgcs(options, entries);
    return buildItemResponse(rawUgcs, options);
}

/**
 * Processes a contest UGC request.
 */
async function processContestRequest(options: GetItemsOptions): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    const cacheResult = await cache.get("remix-active-contest");
    if (!cacheResult.success || !cacheResult.value) return { items: [], actionLists: {} };

    const activeContestId = cacheResult.value.id;

    const filter: Record<string, any> = {
        type: "cr",
        platform: options.platform,
        contest: activeContestId,
        deleted: { $ne: 1 },
    };

    const entries = await queryUgcs(filter, { time: -1 }, options.count || 50);
    const rawUgcs = await formatUgcs(options, entries);
    return buildItemResponse(rawUgcs, options);
}

/**
 * Builds the final carousel item response with action lists.
 */
function buildItemResponse(
    rawUgcs: Record<string, any>[],
    options: GetItemsOptions
): { items: any[]; actionLists: Record<string, any> } {
    const items: any[] = [];
    const actionLists: Record<string, any> = {};

    const displayIscs: Record<string, string> = {
        challenge: "grp_challenger",
        "cr-vote": "cmr_vote_item",
        ugc: "autodance_item",
    };

    for (const entry of rawUgcs) {
        if (entry.stale) continue;

        const jsonItem: any = {
            __class: "Item",
            isc: displayIscs[options.display || ""] || "autodance_item",
            act: "ui_component_base",
            components: [],
        };

        if (options.type !== "dm") {
            jsonItem.components.push({
                __class: "JD_CarouselContentComponent_Song",
                mapName: entry.mapName,
            });
        }

        // Determine action list based on ownership and song availability.
        // Only apply the "self" / "upsell" overrides when the request actually
        // provides them — otherwise own/out-of-library items keep the main
        // action list (matches the OG challenges pages, e.g. "match-challenge-item").
        let actions = options.actions;
        let actionListName = options.actionListName;

        if (entry.profileId === options.profileId && options.actionListNameSelf) {
            actions = options.actionsSelf;
            actionListName = options.actionListNameSelf;
        }

        if (options.type === "ch" && options.availableSongs && options.availableSongs.indexOf(entry.mapName) === -1 && options.actionListNameUpsell) {
            actions = options.actionsUpsell;
            actionListName = options.actionListNameUpsell;
        }

        if (options.carouselVersion && options.carouselVersion >= 2) {
            jsonItem.actionList = actionListName;
            if (actionListName && actions) {
                actionLists[actionListName] = actions;
            }
        } else if (actions) {
            jsonItem.actions = actions.actions;
        }

        const formatter = formatComponentHandlers[entry.type];
        if (!formatter) {
            logger.warn({ message: "Unrecognized UGC type", details: { type: entry.type } });
            continue;
        }

        const ugcComponent = formatter(entry as UgcEntry);
        ugcComponent.mine = (options.profileId === entry.profileId);

        // Add dancer component
        if (entry.name) {
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

            jsonItem.components.push(dancerComponent);
        }

        jsonItem.components.push(ugcComponent);
        items.push(jsonItem);
    }

    return { items, actionLists };
}

// ─── Public API for carousel ──────────────────────────────────────────────────

/**
 * Main entry point for fetching UGC items for the carousel.
 */
async function getItems(options: GetItemsOptions): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    options.count = Math.min(options.maxCount || 50, 50);

    // Handle multi-platform requests
    if (options.platformList) {
        const platforms = options.platformList;
        delete options.platformList;

        const output: { items: any[]; actionLists: Record<string, any> } = {
            items: [],
            actionLists: {},
        };

        for (const platform of platforms) {
            const newOpts = { ...options, platform };
            const result = await getItems(newOpts);
            output.items.push(...result.items);
            Object.assign(output.actionLists, result.actionLists);
        }

        output.items = output.items.slice(0, options.count);
        return output;
    }

    if (options.profileIds) {
        return processPidsRequest(options);
    } else if (options.tags && options.tags.length) {
        return processTagsRequest(options);
    } else if (options.type === "cr" && options.currentContestOnly) {
        return processContestRequest(options);
    } else {
        return processSpecificRequest(options);
    }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
    formatContent,
    formatUgc,
    getItems,
    queryUgcs,
    updateUgc,
    formatUgcs,
    buildItemResponse,
};
