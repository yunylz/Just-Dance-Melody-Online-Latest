import { ISku } from "../config/skus";
import ScoreModel from "./models/score";

import profiles from "./profiles";

class Scores {
    constructor() { };

    async getDancerOfTheWeek({ mapName, sku }: { mapName: string, sku: ISku }) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const scores = await ScoreModel.find({
            mapName,
            "sku.gameVersion": sku.gameVersion,
            createdAt: { $gte: sevenDaysAgo },
            isFromProfileSync: { $ne: true },
        }).lean();

        if (!scores.length) return {
            __class: "DancerOfTheWeek"
        };

        // Deduplicate by profileId, keeping the highest score per profile
        const bestByProfile = new Map<string, typeof scores[0]>();
        for (const score of scores) {
            const existing = bestByProfile.get(score.profileId);
            if (!existing || score.score > existing.score) {
                bestByProfile.set(score.profileId, score);
            }
        }

        // Find the overall highest score
        const topScore = [...bestByProfile.values()].reduce((best, cur) =>
            cur.score > best.score ? cur : best
        );

        const profile = await profiles.getProfile(topScore.profileId);
        if (!profile) return {
            __class: "DancerOfTheWeek"
        };

        return {
            __class: "DancerOfTheWeek",
            alias: profile.unlockedAliases?.[0] ?? 0,
            aliasGender: -1,
            avatar: profile.avatar,
            country: profile.country,
            gameVersion: sku.gameVersion,
            jdPoints: profile.jdPoints?.[sku.gameVersion] ?? 0,
            name: profile.nickname,
            pid: profile.profileId,
            platformId: profile.platformId,
            portraitBorder: profile.unlockedPortraitBorders?.[0] ?? 0,
            profileId: profile.profileId,
            rank: 1,
            score: topScore.score,
        };
    };

    async getLeaderboard({ mapName, sku, filters, count }: {
        mapName: string, sku: ISku, filters: {
            country?: ICountry,
            profileIds?: string[],
            platform?: string,
        },
        count?: number
    }): Promise<ILeaderboardEntry[]> {
        if (count === 0) return [];

        const query: Record<string, any> = { mapName, "sku.gameVersion": sku.gameVersion };
        if (filters.platform) query["sku.platform"] = filters.platform;

        const scores = await ScoreModel.find(query).lean();
        if (!scores.length) return [];

        const bestByProfile = new Map<string, typeof scores[0]>();
        for (const score of scores) {
            const existing = bestByProfile.get(score.profileId);
            if (!existing || score.score > existing.score) {
                bestByProfile.set(score.profileId, score);
            }
        }

        const sorted = [...bestByProfile.values()].sort((a, b) => b.score - a.score);

        const fetchedProfiles = await Promise.all(
            sorted.map(score => profiles.getProfile(score.profileId))
        );

        const entries = sorted
            .map((score, index) => ({ score, profile: fetchedProfiles[index] }))
            .filter((entry): entry is { score: typeof sorted[0], profile: NonNullable<typeof fetchedProfiles[0]> } => {
                if (!entry.profile) return false;
                if (filters.country && entry.profile.country !== filters.country.id) return false;
                if (filters.profileIds && !filters.profileIds.includes(entry.profile.profileId)) return false;
                return true;
            })
            .map(({ score, profile }, index): ILeaderboardEntry => ({
                __class: "LeaderboardEntry_Online",
                profileId: profile.profileId,
                rank: index + 1,
                score: score.score,
                name: profile.nickname,
                avatar: profile.avatar,
                country: profile.country,
                platformId: profile.platformId ?? "",
                alias: profile.unlockedAliases?.[0] ?? 0,
                aliasGender: -1,
                jdPoints: profile.jdPoints?.[sku.gameVersion] ?? 0,
                portraitBorder: profile.unlockedPortraitBorders?.[0] ?? 0,
            }));

        return count !== undefined ? entries.slice(0, count) : entries;
    }
};

export default new Scores();