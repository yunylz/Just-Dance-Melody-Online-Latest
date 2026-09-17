import express from "express";
import { getRedisClient } from "./clients/redis";
import cacheKeys from "./cache-keys";
import cache from "./cache";
import config from "../config";
import { createLogger } from "./logger";
import { ISku } from "../config/skus";
import skusLib from "./skus";

const logger = createLogger({ service: "live-client" });

class LiveClient {
    private get client() {
        return getRedisClient();
    }

    private get timeSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    private async getLiveKeys(): Promise<string[]> {
        const skus = skusLib.info;
        if (!skus) return [cacheKeys.LIVES];

        const versions = new Set<string>();
        const platforms = new Set<string>();

        for (const skuId in skus) {
            const sku = skus[skuId] as ISku;
            if (sku.gameVersion) versions.add(sku.gameVersion);
            if (sku.platform) platforms.add(sku.platform);
        }

        const keys = [cacheKeys.LIVES];
        versions.forEach(v => keys.push(`${cacheKeys.LIVES}:${v}`));
        platforms.forEach(p => keys.push(`${cacheKeys.LIVES}:${p}`));

        return keys;
    }

    async cleanLives(): Promise<void> {
        try {
            const keys = await this.getLiveKeys();
            const minScore = "-inf";
            const maxScore = (this.timeSeconds - config.LIVE_TIMEOUT).toString();

            const multi = this.client.multi();
            keys.forEach(key => {
                multi.zRemRangeByScore(key, minScore, maxScore);
            });
            await multi.exec();
        } catch (err) {
            logger.error(`Failed to clean lives: ${err}`);
        }
    }

    private continuousCleanLives() {
        this.cleanLives().finally(() => {
            setTimeout(() => this.continuousCleanLives(), config.LIVE_CLEAN_INTERVAL);
        });
    }

    init() {
        this.continuousCleanLives();
    }

    async getLiveCount(gameVersionOrPlatform?: string): Promise<number> {
        try {
            let key = cacheKeys.LIVES;
            if (gameVersionOrPlatform) {
                key += `:${gameVersionOrPlatform}`;
            }

            const minScore = `(${(this.timeSeconds - config.LIVE_TIMEOUT).toString()}`;
            const maxScore = "+inf";

            return await this.client.zCount(key, minScore, maxScore);
        } catch (err) {
            logger.error(`Failed to get live count for ${gameVersionOrPlatform || 'all'}: ${err}`);
            return 0;
        }
    }

    async getLives(): Promise<string[]> {
        try {
            const minScore = `(${(this.timeSeconds - config.LIVE_TIMEOUT).toString()}`;
            const maxScore = "+inf";

            return await this.client.zRangeByScore(cacheKeys.LIVES, minScore, maxScore);
        } catch (err) {
            logger.error(`Failed to get lives: ${err}`);
            return [];
        }
    }

    async getLiveInfo(): Promise<Record<string, number>> {
        const result: Record<string, number> = {};
        const skus = skusLib.info;

        if (!skus) return result;

        const versions = new Set<string>();
        const platforms = new Set<string>();

        for (const skuId in skus) {
            const sku = skus[skuId] as ISku;
            if (sku.gameVersion) versions.add(sku.gameVersion);
            if (sku.platform) platforms.add(sku.platform);
        }

        const counts = await Promise.all([
            ...Array.from(platforms).map(async p => ({ key: p, count: await this.getLiveCount(p) })),
            ...Array.from(versions).map(async v => ({ key: v, count: await this.getLiveCount(v) }))
        ]);

        counts.forEach(c => {
            result[c.key] = c.count;
        });

        return result;
    }

    async isLive(pid: string): Promise<boolean> {
        try {
            const score = await this.client.zScore(cacheKeys.LIVES, pid);
            if (score === null) return false;

            return score > (this.timeSeconds - config.LIVE_TIMEOUT);
        } catch (err) {
            logger.error(`Failed to check if ${pid} is live: ${err}`);
            return false;
        }
    }

    async setOffline(pid: string): Promise<void> {
        try {
            await this.client.zRem(cacheKeys.LIVES, pid);
        } catch (err) {
            logger.error(`Failed to set offline for ${pid}: ${err}`);
        }
    }

    async setOnline(pid: string, skuInfo: ISku): Promise<void> {
        try {
            const timestamp = this.timeSeconds;
            const multi = this.client.multi();

            multi.zAdd(cacheKeys.LIVES, [{ score: timestamp, value: pid }]);

            if (skuInfo.gameVersion) {
                multi.zAdd(`${cacheKeys.LIVES}:${skuInfo.gameVersion}`, [{ score: timestamp, value: pid }]);
            }
            if (skuInfo.platform) {
                multi.zAdd(`${cacheKeys.LIVES}:${skuInfo.platform}`, [{ score: timestamp, value: pid }]);
            }

            await multi.exec();
        } catch (err) {
            logger.error(`Failed to set online for ${pid}: ${err}`);
        }
    }

    middleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.on("finish", async () => {
            const skuId = req.headers["x-skuid"] as string;
            const pid = (req as any).profileId as string;

            // Don't count backOffice requests in live ccu
            if (req.isBackoffice) return next();

            if (pid && skuId) {
                let skuInfo = (req as any).sku as ISku;
                if (skuInfo) {
                    await this.setOnline(pid, skuInfo);
                }
            }
        });

        next();
    }
}

export default new LiveClient();
