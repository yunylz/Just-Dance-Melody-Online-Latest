import ProfileModel, { IProfile } from "./models/profile";
import ScoreModel, { IScore } from "./models/score";
import {
    PROFILE_NOT_FOUND,
    MAP_ALREADY_FAVORITED,
    MAP_NOT_FAVORITED,
    CHEAT_DETECTED,
} from "./http-codes";
import { createLogger } from "./logger";
import { recordCheat } from "./metrics-store";
import { ISku } from "../config/skus";
import tracking from "./tracking";
import utils from "./utils";

const logger = createLogger({ service: "profiles-lib" });

const MAX_SCORE = 13333;
const MAX_HISTORY_SIZE = 200;

/**
 * Strips internal Mongoose fields from a lean profile document.
 * With .lean(), Maps are already plain objects — no toObject() needed.
 */
function sanitizeProfile(doc: any, omit: string[] = []): any {
    if (!doc) return null;

    // .lean() returns plain objects, just clone and strip internals
    const obj = { ...doc };
    delete obj.__v;
    delete obj._id;

    for (const field of omit) {
        delete obj[field];
    }

    return obj;
}

class Profiles {
    constructor() { }

    /**
     * Fetches a single profile by profileId.
     */
    async getProfile(pid: string): Promise<any | null> {
        const doc = await ProfileModel.findOne({ profileId: pid }).lean();
        return doc ? sanitizeProfile(doc) : null;
    }

    /**
     * Fetches multiple profiles by an array of profileIds.
     * Returns a map of profileId -> sanitized profile.
     */
    async getProfiles(pids: string[]): Promise<Record<string, any>> {
        const docs = await ProfileModel.find({ profileId: { $in: pids } }).lean();
        const map: Record<string, any> = {};
        for (const doc of docs) {
            const sanitized = sanitizeProfile(doc);
            map[sanitized.profileId] = sanitized;
        }
        return map;
    }

    /**
     * Fetches all profileIds.
     */
    async getAllProfileIds() {
        const docs = await ProfileModel.find({}).lean();
        const pids: string[] = [];
        for (const doc of docs) {
            if (doc.profileId) {
                pids.push(doc.profileId);
            }
        }
        return pids;
    };

    /**
     * Upserts a profile (v1 style — no versioned jdPoints/stats).
     * On creation, merges body with platform and language fields.
     * On update, only merges if the doc has no syncVersions (legacy path).
     */
    async upsertProfileV1(pid: string, data: any, platform: string, language: string): Promise<void> {
        const existing = await ProfileModel.findOne({ profileId: pid }).lean();

        if (!existing) {
            await ProfileModel.create({
                ...data,
                profileId: pid,
                platform,
                scores: data.scores || {},
                language,
            });
            // Emit profile_created — suppress individual score/favorite events (bulk import)
            await tracking.recordActivity({
                pid,
                type: 'profile_created',
                platform,
                country: typeof data.country === 'number'
                    ? (utils.getCountryById(data.country)?.code ?? String(data.country))
                    : (data.country ?? language),
            });
        } else {
            const update: any = { language };
            // Only merge game data if the profile does not use syncVersions (pre-2017 path)
            if (!existing.syncVersions) {
                Object.assign(update, data);
            }

            // Diff favorites for activity tracking
            if (data.hasOwnProperty('favorites')) {
                const oldFavs: string[] = (existing as any).favorites || [];
                const newFavs: string[] = data.favorites || [];
                const country: string = typeof (existing as any).country === 'number'
                    ? (utils.getCountryById((existing as any).country)?.code ?? String((existing as any).country))
                    : ((existing as any).country ?? language);
                for (const mapName of newFavs.filter(f => !oldFavs.includes(f))) {
                    await tracking.recordActivity({ pid, type: 'favorite_added', mapName, country });
                }
                for (const mapName of oldFavs.filter(f => !newFavs.includes(f))) {
                    await tracking.recordActivity({ pid, type: 'favorite_removed', mapName, country });
                }
            }

            await ProfileModel.updateOne({ profileId: pid }, { $set: update });
        }
    }

    /**
     * Upserts a profile (v2 style — handles versioned jdPoints, stats, scores merging).
     * Uses .lean() so all existing data is plain JS — no Mongoose sub-document surprises.
     */
    async upsertProfileV2(
        pid: string,
        data: any,
        sku: ISku,
        language: string,
        isGuest?: boolean
    ): Promise<void> {
        const gameVersion = (sku as any).gameVersion;
        const platform = sku.platform;
        const existing = await ProfileModel.findOne({ profileId: pid }).lean();

        // Normalize jdPoints to versioned object
        if (data.hasOwnProperty("jdPoints") && typeof data.jdPoints !== "object") {
            data.jdPoints = { [gameVersion]: data.jdPoints };
        }

        // Namespace stats under the gameVersion
        if (data.hasOwnProperty("stats")) {
            data.stats = { [gameVersion]: data.stats };
        }

        if (!existing) {
            const created = await ProfileModel.create({
                ...data,
                profileId: pid,
                platform,
                scores: data.scores || {},
                language,
            });

            // Emit profile_created — skip score sync to prevent DOTW spam for old scores
            await tracking.recordActivity({
                pid,
                type: 'profile_created',
                platform,
                country: typeof data.country === 'number'
                    ? (utils.getCountryById(data.country)?.code ?? String(data.country))
                    : (data.country ?? language),
            });
            return;
        }

        // Build $set update from plain lean objects
        const update: Record<string, any> = {};
        update.language = language;

        // Merge scores — never lower a highscore.
        // With .lean(), existing.scores is a plain object like { "AboutThatBass": { highest: 0 } }
        if (data.scores) {
            const existingScores: Record<string, any> = (existing as any).scores || {};
            for (const [mapName, newEntry] of Object.entries(data.scores as Record<string, any>)) {
                const existingEntry = existingScores[mapName];
                if (existingEntry) {
                    const existingHighest = existingEntry.highest || 0;
                    const newHighest = (newEntry as any).highest || 0;
                    const mergedHighest = Math.min(Math.max(existingHighest, newHighest), MAX_SCORE);
                    const merged = {
                        ...existingEntry,
                        ...(newEntry as any),
                        highest: mergedHighest,
                        // Only update isCoopHighscore when there's a new highscore
                        isCoopHighscore: newHighest > existingHighest
                            ? ((newEntry as any).isCoopHighscore ?? false)
                            : (existingEntry.isCoopHighscore ?? false),
                    };
                    update[`scores.${mapName}`] = merged;

                    // If improved, sync to scores database (marked as profile-sync, excluded from DOTW)
                    if (!isGuest && newHighest > existingHighest) {
                        await this.addScoreEntry({
                            pid,
                            profile: existing as any,
                            score: mergedHighest,
                            mapName,
                            sku,
                            details: {
                                isWdf: false,
                                isCoop: merged.isCoopHighscore,
                                isKids: !!(newEntry as any).isKids,
                                isPlaylist: false,
                                isFavPlaylist: false,
                                isRecoForYouPlaylist: false,
                                isTopReplayedPlaylist: false,
                                isDiscoverPlaylist: false,
                                isTopCountryPlaylist: false,
                                isSweatEnabled: false,
                                isJduEnabled: false,
                                isKidsOnlyMap: false,
                                isUnlockable: false,
                                scoreTimestamp: Math.floor(Date.now() / 1000),
                            },
                            skipIfDuplicate: true,
                            isFromProfileSync: true,
                        });
                        await tracking.recordPlay(pid, mapName, existing.country || language);
                    }
                } else {
                    const highest = Math.min((newEntry as any).highest || 0, MAX_SCORE);
                    const isCoop = (newEntry as any).isCoopHighscore ?? false;
                    update[`scores.${mapName}`] = {
                        ...(newEntry as any),
                        highest,
                        isCoopHighscore: isCoop,
                    };

                    // New entry, sync to scores database (marked as profile-sync, excluded from DOTW)
                    if (!isGuest && highest > 0) {
                        await this.addScoreEntry({
                            pid,
                            profile: existing as any,
                            score: highest,
                            mapName,
                            sku,
                            details: {
                                isWdf: false,
                                isCoop: isCoop,
                                isKids: !!(newEntry as any).isKids,
                                isPlaylist: false,
                                isFavPlaylist: false,
                                isRecoForYouPlaylist: false,
                                isTopReplayedPlaylist: false,
                                isDiscoverPlaylist: false,
                                isTopCountryPlaylist: false,
                                isSweatEnabled: false,
                                isJduEnabled: false,
                                isKidsOnlyMap: false,
                                isUnlockable: false,
                                scoreTimestamp: Math.floor(Date.now() / 1000),
                            },
                            skipIfDuplicate: true,
                            isFromProfileSync: true,
                        });
                        await tracking.recordPlay(pid, mapName, existing.country || language);
                    }
                }
            }
        }

        // Diff favorites for activity tracking (existing users only)
        if (data.hasOwnProperty('favorites')) {
            const oldFavs: string[] = (existing as any).favorites || [];
            const newFavs: string[] = data.favorites || [];
            const country: string = typeof existing.country === 'number'
                ? (utils.getCountryById(existing.country)?.code ?? String(existing.country))
                : (existing.country ?? language);
            for (const mapName of newFavs.filter(f => !oldFavs.includes(f))) {
                await tracking.recordActivity({ pid, type: 'favorite_added', mapName, country });
            }
            for (const mapName of oldFavs.filter(f => !newFavs.includes(f))) {
                await tracking.recordActivity({ pid, type: 'favorite_removed', mapName, country });
            }
        }

        // Merge versioned jdPoints (keep max per version)
        if (data.jdPoints && typeof data.jdPoints === "object") {
            const existingJdPoints = (existing as any).jdPoints;
            const merged: Record<string, number> = typeof existingJdPoints === "object" && existingJdPoints
                ? { ...existingJdPoints }
                : {};
            for (const [ver, pts] of Object.entries(data.jdPoints as Record<string, number>)) {
                merged[ver] = Math.max(merged[ver] || 0, pts);
            }
            update.jdPoints = merged;
        }

        // Merge diamondPoints (keep max)
        if (data.hasOwnProperty("diamondPoints")) {
            const existingDP = (existing as any).diamondPoints || 0;
            update.diamondPoints = Math.max(existingDP, data.diamondPoints || 0);
        }

        // Merge unlocked arrays (union)
        for (const arrField of ["unlockedAvatars", "unlockedSkins", "unlockedPortraitBorders"]) {
            if (data.hasOwnProperty(arrField)) {
                const existingArr: number[] = (existing as any)[arrField] || [];
                const incoming: number[] = data[arrField] || [];
                update[arrField] = Array.from(new Set([...existingArr, ...incoming]));
            }
        }

        // Merge versioned stats — Mixed field, must set the whole object
        if (data.stats && typeof data.stats === "object") {
            const existingStats: Record<string, any> = (existing as any).stats || {};
            const mergedStats = { ...existingStats };
            for (const [ver, statVal] of Object.entries(data.stats as Record<string, any>)) {
                mergedStats[ver] = statVal;
            }
            update.stats = mergedStats;
        }

        // Passthrough simple scalar/array fields
        for (const field of ["name", "nickname", "avatar", "country", "skin", "portraitBorder", "alias",
            "aliasGender", "wdfRank", "stars", "unlocks", "songsPlayed", "platformId",
            "populations", "progression", "favorites", "history"]) {
            if (data.hasOwnProperty(field)) {
                update[field] = data[field];
            }
        }

        await ProfileModel.updateOne({ profileId: pid }, { $set: update });
    }

    /**
     * Checks whether profiles exist for a list of PIDs.
     * Returns only the PIDs that have a matching profile document.
     */
    async filterExistingProfiles(pids: string[]): Promise<string[]> {
        const docs = await ProfileModel.find(
            { profileId: { $in: pids } },
            { profileId: 1 }
        ).lean();
        return docs.map((d: any) => d.profileId);
    }

    /**
     * Searches for profiles by name (case-insensitive).
     * Returns a map of profileId -> profile.
     */
    async searchProfilesByName(name: string): Promise<Record<string, any>> {
        const docs = await ProfileModel.find({ name: new RegExp(`^${name}$`, "i") }).lean();
        const result: Record<string, any> = {};
        for (const doc of docs) {
            const obj = sanitizeProfile(doc);
            result[obj.profileId] = obj;
        }
        return result;
    }

    /**
     * Gets the ugcId stored in a profile's scores for a particular map.
     */
    async getChallengeUgcId(pid: string, mapName: string): Promise<string | null> {
        const doc = await ProfileModel.findOne({ profileId: pid }).lean();
        if (!doc) return null;
        const scores: Record<string, any> = (doc as any).scores || {};
        return scores[mapName]?.ugcId ?? null;
    }

    /**
     * Adds a map name to a profile's favorites list.
     * Throws if the profile doesn't exist or the map is already favorited.
     */
    async addFavorite(pid: string, mapName: string): Promise<void> {
        const doc = await ProfileModel.findOne({ profileId: pid }, { favorites: 1, country: 1 }).lean();
        if (!doc) throw PROFILE_NOT_FOUND;

        const favorites: string[] = (doc as any).favorites || [];
        if (favorites.includes(mapName)) {
            throw MAP_ALREADY_FAVORITED;
        }

        await ProfileModel.updateOne({ profileId: pid }, { $push: { favorites: mapName } });
        await tracking.recordActivity({ pid, type: 'favorite_added', mapName, country: (doc as any).country });
    }

    /**
     * Removes a map name from a profile's favorites list.
     * Throws if the profile doesn't exist or the map isn't favorited.
     */
    async removeFavorite(pid: string, mapName: string): Promise<void> {
        const doc = await ProfileModel.findOne({ profileId: pid }, { favorites: 1, country: 1 }).lean();
        if (!doc) throw PROFILE_NOT_FOUND;

        const favorites: string[] = (doc as any).favorites || [];
        if (!favorites.includes(mapName)) {
            throw MAP_NOT_FAVORITED;
        }

        await ProfileModel.updateOne(
            { profileId: pid },
            {
                $pull: { favorites: mapName },
                $unset: { [`history.${mapName}`]: "" }
            }
        );
        await tracking.recordActivity({ pid, type: 'favorite_removed', mapName, country: (doc as any).country });
    }

    /**
     * Updates (or creates) a score entry for a specific map on a profile.
     * Always keeps the highest score seen.
     */
    async updateScore(pid: string, mapName: string, score: number, sku: ISku, isCoopHighscore: boolean = false): Promise<void> {
        const profile = await ProfileModel.findOne({ profileId: pid }).lean();
        if (!profile) throw PROFILE_NOT_FOUND;

        const scores: Record<string, any> = (profile as any).scores || {};
        const existingEntry = scores[mapName] || { highest: 0 };
        const newHighest = Math.min(Math.max(existingEntry.highest || 0, score), MAX_SCORE);
        const update: Record<string, any> = {
            [`scores.${mapName}.highest`]: newHighest,
        };

        // Only update isCoopHighscore when a new highscore is achieved
        const isImproved = score > (existingEntry.highest || 0);
        if (isImproved) {
            update[`scores.${mapName}.isCoopHighscore`] = isCoopHighscore;
        }

        await ProfileModel.updateOne({ profileId: pid }, { $set: update });

        // Sync to scores database if improved
        if (isImproved) {
            await this.addScoreEntry({
                pid,
                profile: profile as any,
                score: newHighest,
                mapName,
                sku,
                details: {
                    isWdf: false,
                    isCoop: isCoopHighscore,
                    isKids: false,
                    isPlaylist: false,
                    isFavPlaylist: false,
                    isRecoForYouPlaylist: false,
                    isTopReplayedPlaylist: false,
                    isDiscoverPlaylist: false,
                    isTopCountryPlaylist: false,
                    isSweatEnabled: false,
                    isJduEnabled: false,
                    isKidsOnlyMap: false,
                    isUnlockable: false,
                    scoreTimestamp: Math.floor(Date.now() / 1000),
                },
                skipIfDuplicate: true
            });
        }
    }

    /**
     * Appends map history entries (classic/kids) and trims to MAX_HISTORY_SIZE.
     */
    async updateMapHistory(pid: string, entries: any[], sku: ISku): Promise<void> {
        const profile = await this.getProfile(pid);
        const doc = await ProfileModel.findOne({ profileId: pid }, { mapHistory: 1 }).lean();
        if (!doc) throw PROFILE_NOT_FOUND;

        const mapHistory: any = (doc as any).mapHistory || {};
        const classic: any[] = Array.isArray(mapHistory.classic) ? [...mapHistory.classic] : [];
        const kids: any[] = Array.isArray(mapHistory.kids) ? [...mapHistory.kids] : [];

        const now = Math.floor(Date.now() / 1000);
        const BAD_TIMESTAMP_THRESHOLD = new Date("October 10, 2018 00:00:00 UTC").getTime() / 1000;

        for (const entry of entries) {
            const timestamp = (!entry.timestamp || entry.timestamp < BAD_TIMESTAMP_THRESHOLD) ? now : entry.timestamp;
            const historyEntry = { mapName: entry.mapName, timestamp, score: entry.score };

            if (entry.gameMode === "CLASSIC") {
                if (!classic.some(e => e.timestamp === timestamp && e.mapName === entry.mapName)) {
                    classic.unshift(historyEntry);
                }
            } else if (entry.gameMode === "KIDS") {
                if (!kids.some(e => e.timestamp === timestamp && e.mapName === entry.mapName)) {
                    kids.unshift(historyEntry);
                }
            }

            // After updating map history, we add client's to scores database for Leaderboard and DOTW.
            await this.addScoreEntry({
                pid,
                profile,
                mapName: entry.mapName,
                score: entry.score,
                sku,
                details: {
                    isWdf: !!entry.isWdf,
                    isCoop: !!entry.isCoop,
                    isKids: !!entry.isKids,
                    isPlaylist: !!entry.isPlaylist,
                    isFavPlaylist: !!entry.isFavPlaylist,
                    isRecoForYouPlaylist: !!entry.isRecoForYouPlaylist,
                    isTopReplayedPlaylist: !!entry.isTopReplayedPlaylist,
                    isDiscoverPlaylist: !!entry.isDiscoverPlaylist,
                    isTopCountryPlaylist: !!entry.isTopCountryPlaylist,
                    isSweatEnabled: !!entry.isSweatEnabled,
                    isJduEnabled: !!entry.isJduEnabled,
                    isKidsOnlyMap: !!entry.isKidsOnlyMap,
                    isUnlockable: !!entry.isUnlockable,
                    scoreTimestamp: timestamp,
                }
            });
            await tracking.recordPlay(pid, entry.mapName, profile.country || "UBI", {
                isWdf:          !!entry.isWdf,
                isCoop:         !!entry.isCoop,
                isKids:         !!entry.isKids,
                isPlaylist:     !!entry.isPlaylist,
                isSweatEnabled: !!entry.isSweatEnabled,
                isJduEnabled:   !!entry.isJduEnabled,
            });
        }

        classic.length = Math.min(classic.length, MAX_HISTORY_SIZE);
        kids.length = Math.min(kids.length, MAX_HISTORY_SIZE);

        await ProfileModel.updateOne({ profileId: pid }, {
            $set: {
                "mapHistory.classic": classic,
                "mapHistory.kids": kids,
            }
        });
    }

    /**
     * Grants an alias to a profile, removing it from inProgressAliases.
     * No-ops if already unlocked.
     */
    async unlockAlias(pid: string, aliasId: number): Promise<void> {
        const doc = await ProfileModel.findOne({ profileId: pid }, { unlockedAliases: 1 }).lean();
        if (!doc) throw PROFILE_NOT_FOUND;

        const unlockedAliases: number[] = (doc as any).unlockedAliases || [];
        if (unlockedAliases.includes(aliasId)) return; // Already unlocked, no-op

        await ProfileModel.updateOne({ profileId: pid }, {
            $push: { unlockedAliases: aliasId },
            $pull: { inProgressAliases: { id: aliasId } },
        });
    }

    /**
     * Removes an alias from a profile's unlocked aliases list.
     */
    async removeAlias(pid: string, aliasId: number): Promise<void> {
        const doc = await ProfileModel.findOne({ profileId: pid }, { unlockedAliases: 1 }).lean();
        if (!doc) throw PROFILE_NOT_FOUND;

        await ProfileModel.updateOne({ profileId: pid }, {
            $pull: { unlockedAliases: aliasId }
        });
    }

    /**
     * Adds client's score entries to the scores database.
     * Used by map-ended route to persist scores to the database for Leaderboard and DOTW.
     */
    async addScoreEntry({
        pid, profile, score, mapName, sku, details, skipIfDuplicate = false, skipActivity = false, isFromProfileSync = false
    }: {
        pid: string;
        profile: IProfile;
        score: number;
        mapName: string;
        sku: ISku;
        details: {
            isWdf: boolean;
            isCoop: boolean;
            isKids: boolean;
            isPlaylist: boolean;
            isFavPlaylist: boolean;
            isRecoForYouPlaylist: boolean;
            isTopReplayedPlaylist: boolean;
            isDiscoverPlaylist: boolean;
            isTopCountryPlaylist: boolean;
            isSweatEnabled: boolean;
            isJduEnabled: boolean;
            isKidsOnlyMap: boolean;
            isUnlockable: boolean;
            scoreTimestamp: number;
        };
        skipIfDuplicate?: boolean;
        /** When true, suppresses the score_improved activity event (used for bulk import on new profiles). */
        skipActivity?: boolean;
        /** When true, marks this entry as coming from profile sync (excluded from DOTW). */
        isFromProfileSync?: boolean;
    }): Promise<void> {
        const {
            isWdf,
            isCoop,
            isKids,
            isPlaylist,
            isFavPlaylist,
            isRecoForYouPlaylist,
            isTopReplayedPlaylist,
            isDiscoverPlaylist,
            isTopCountryPlaylist,
            isSweatEnabled,
            isJduEnabled,
            isKidsOnlyMap,
            isUnlockable,
            scoreTimestamp
        } = details;

        const nickname = profile.nickname;

        // If skipIfDuplicate is true, check if this specific score already exists for this profile
        if (skipIfDuplicate) {
            const existing = await ScoreModel.findOne({
                profileId: pid,
                mapName,
                score
            }).lean();
            if (existing) return;
        }

        const newScoreEntry = new ScoreModel({
            profileId: pid,
            score,
            mapName,
            sku,
            isWdf,
            isCoop,
            isKids,
            isPlaylist,
            isFavPlaylist,
            isRecoForYouPlaylist,
            isTopReplayedPlaylist,
            isDiscoverPlaylist,
            isTopCountryPlaylist,
            isSweatEnabled,
            isJduEnabled,
            isKidsOnlyMap,
            isUnlockable,
            isFromProfileSync,
            scoreTimestamp
        });

        // If score is more than MAX_SCORE, it's cheating.
        if (score > MAX_SCORE) {
            // This also notifies the webhook
            logger.cheat({
                message: `Cheating "${nickname}" (${pid}) with score ${score} on map ${mapName}`,
                details: {
                    pid,
                    mapName,
                    score,
                    sku: `${sku.gameVersion}-${sku.platform}-${sku.region}`,
                    details
                }
            });
            // Record to metrics
            recordCheat({
                profileId: pid,
                nickname: nickname ?? "",
                mapName: mapName,
                score: score,
                sku: `${sku.gameVersion}-${sku.platform}-${sku.region}`,
                timestamp: new Date().toISOString()
            });
            throw CHEAT_DETECTED;
        };

        logger.info({
            message: "New score entry added",
            details: {
                pid,
                mapName,
                score,
                sku,
                details
            }
        });

        await newScoreEntry.save();

        // Record score_improved activity (skipped for bulk imports)
        if (!skipActivity) {
            await tracking.recordActivity({
                pid,
                type: 'score_improved',
                mapName,
                score,
                platform: sku.platform,
                gameVersion: sku.gameVersion,
                country: typeof profile.country === 'number'
                    ? (utils.getCountryById(profile.country as number)?.code ?? String(profile.country))
                    : (profile.country as string | undefined),
            });
        }
    };

    async getProfileCount() {
        return await ProfileModel.countDocuments();
    };
}

export default new Profiles();