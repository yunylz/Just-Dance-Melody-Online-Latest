import { Request } from 'express';
import cache from '../cache';
import carouselLib from './carousel';
import profiles from '../profiles';
import recommendation from '../recommendation';
import { CarouselClass } from '../enums/carousel';
import { createLogger } from '../logger';

const logger = createLogger({ service: "carousel-recommended" });

const DEFAULT_COUNT = 20;
const DEFAULT_ACTION_LIST = "partyMap";
// Cap how many slots "newly added" songs can take so the row stays varied.
const NEWLY_ADDED_CAP = 8;

export interface RecommendedOptions {
    count?: number;
    actionListName?: string;
}

/**
 * Builds song items for the "Recommended for You" category.
 *
 * Picks songs in tiers:
 *  1. Newly added songs (most recently inserted into the DB)
 *  2. Songs the user hasn't played in a while
 *  3. Songs they might like (related to favorites / recently played)
 *  4. Daily-rotating pool to top up
 *
 * The final list order is deterministically shuffled per day, so the row
 * changes every day but is stable within a day.
 */
export const buildRecommendedItems = async (req: Request, options: RecommendedOptions = {}) => {
    const count = options.count || DEFAULT_COUNT;
    const actionListName = options.actionListName || DEFAULT_ACTION_LIST;
    const carouselVersion = (req as any).carouselVersion || 2;

    const mapNames = await collectRecommendedMaps(req, count);

    // Resolve the action list (e.g. "partyMap") so songs are playable.
    const { value: rules } = await cache.get("carousel:rules");
    const actionList = rules?.actionLists?.[actionListName];
    const formattedActions = actionList ? carouselLib.getFormattedActions(req, actionList) : null;

    const actionLists: Record<string, any> = {};
    if (formattedActions) actionLists[actionListName] = formattedActions;

    const items = mapNames.slice(0, count).map((mapName) => {
        const item: any = carouselLib.formatItem({
            isc: "grp_cover",
            act: "ui_component_base",
            components: [{
                __class: CarouselClass.JD_CarouselContentComponent_Song,
                mapName,
            }],
        });
        if (carouselVersion >= 2) {
            item.actionList = actionListName;
        } else if (formattedActions) {
            item.actions = formattedActions.actions;
        }
        return item;
    });

    return { items, actionLists };
};

async function collectRecommendedMaps(req: Request, count: number): Promise<string[]> {
    // Use the song pool already fetched by the carousel service, excluding
    // patreon-only songs for non-patreon users.
    const pool = ((req as any).allSongs || []) as any[];
    const isPatreon = (req as any).isPatreon;
    const visible = pool.filter((s) => isPatreon || !s.isPatreon);

    const poolByMap = new Map(visible.map((s) => [s.mapName, s]));
    const picked: string[] = [];
    const seen = new Set<string>();
    const add = (m: string) => {
        if (m && !seen.has(m) && poolByMap.has(m)) {
            seen.add(m);
            picked.push(m);
        }
    };

    const pid = (req as any).ticket?.pid || (req as any).profileId;
    const profile = pid ? await profiles.getProfile(pid) : null;

    // 1. Newly added songs — most recently inserted first (ObjectId timestamp).
    const insertedAt = (s: any) => (s?._id?.getTimestamp ? s._id.getTimestamp().getTime() : 0);
    const newlyAdded = [...visible].sort((a, b) => insertedAt(b) - insertedAt(a));
    for (const s of newlyAdded) {
        add(s.mapName);
        if (picked.length >= Math.min(count, NEWLY_ADDED_CAP)) break;
    }

    // 2. Songs the user hasn't played in a while — oldest last-played first.
    if (profile && picked.length < count) {
        const lastPlayed = buildLastPlayed(profile);
        const stale = Object.entries(lastPlayed).sort((a, b) => (a[1] as number) - (b[1] as number));
        for (const [m] of stale) {
            add(m);
            if (picked.length >= count) break;
        }
    }

    // 3. Songs they might like — related to favorites and recently played.
    if (profile && picked.length < count) {
        const related = await recommendation.getRelatedSongsMapping();
        const seeds = [...(profile.favorites || []), ...Object.keys(profile.history || {})];
        for (const seed of seeds) {
            add(seed);
            if (picked.length >= count) break;
            for (const m of related[seed] || []) {
                add(m);
                if (picked.length >= count) break;
            }
        }
    }

    // 4. Daily-rotating pool to top up.
    if (picked.length < count) {
        const rotated = seededShuffle(visible.map((s) => s.mapName), daySeed());
        for (const m of rotated) {
            add(m);
            if (picked.length >= count) break;
        }
    }

    // Deterministic per-day shuffle so the row feels fresh but stable within a day.
    return seededShuffle(picked, daySeed()).slice(0, count);
}

function buildLastPlayed(profile: any): Record<string, number> {
    const lastPlayed: Record<string, number> = {};
    for (const entry of profile?.mapHistory?.classic || []) {
        if (entry?.mapName) {
            lastPlayed[entry.mapName] = Math.max(lastPlayed[entry.mapName] || 0, entry.timestamp || 0);
        }
    }
    for (const m of Object.keys(profile?.history || {})) {
        if (!(m in lastPlayed)) lastPlayed[m] = 0;
    }
    return lastPlayed;
}

function daySeed(): number {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = seed | 0;
    const rand = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
