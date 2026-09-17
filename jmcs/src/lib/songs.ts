import config from "../config";

import SongModel from "./models/song";

import { UAF_MAX_INT, PHONE_PLATFORMS } from "./enums";
import { createLogger } from "./logger";
import localizationLib from "./localization";
import s3 from "./s3";
import cache from "./cache";
import cacheKeys from "./cache-keys";
import skus from "./skus";
import { ISku } from "../config/skus";
import utils from "./utils";

const logger = createLogger({ service: "songs-lib" });

// ─── Return Types ────────────────────────────────────────────────────────────

interface SongResult {
    success: boolean;
    song?: typeof SongModel.prototype;
    error?: unknown;
    errorMessage?: string;
}

interface SongsResult {
    success: boolean;
    songs?: (typeof SongModel.prototype)[];
    total?: number;
    error?: unknown;
    errorMessage?: string;
}

interface BasicResult {
    success: boolean;
    error?: unknown;
    errorMessage?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

// ─── Class ───────────────────────────────────────────────────────────────────

class Songs {
    S3_FQDN: string;
    SKIP_PLATFORMS: string[];

    constructor() {
        this.S3_FQDN = config.S3.FQDN || "";
        this.SKIP_PLATFORMS = ["ps5", "ggp", "xboxsx", "x1"];
    }

    buildUrls(data: Record<string, string> = {}): Record<string, string> {
        return Object.entries(data).reduce((acc, [key, value]) => {
            if (value && String(value).startsWith('/')) {
                acc[key] = this.S3_FQDN + value;
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, string>);
    }

    async songExists(mapName: string, extraFilter: Record<string, any> = {}) {
        return SongModel.exists({ mapName, ...extraFilter });
    };

    async newSong(mapName: string, songDesc: Record<string, unknown> = {}): Promise<BasicResult> {
        logger.info(`Creating song "${mapName}"`);

        try {
            const isInDb = await SongModel.findOne({ mapName });

            if (isInDb) {
                logger.warn(`"${mapName}" already exists in database — skipping`);
                return { success: false };
            }

            const songObj = new SongModel({ mapName, ...songDesc });
            await songObj.save();

            logger.info(`"${mapName}" created successfully`);
            return { success: true };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`DB error while creating "${mapName}": ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    async getSong(mapName: string): Promise<SongResult> {
        try {
            const songInDb = await SongModel.findOne({ mapName }).populate("tags");

            if (!songInDb) {
                logger.warn(`"${mapName}" not found in database`);
                return { success: false };
            }

            logger.info(`"${mapName}" fetched successfully`);
            return { success: true, song: songInDb };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`DB error while fetching "${mapName}": ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    async updateSong(mapName: string, songDesc: Record<string, unknown> = {}): Promise<BasicResult> {
        logger.info(`Updating song "${mapName}" — fields: ${Object.keys(songDesc).join(", ") || "none"}`);

        try {
            const songInDb = await SongModel.findOne({ mapName });

            if (!songInDb) {
                logger.warn(`"${mapName}" not found in database — skipping`);
                return { success: false };
            }

            for (const [key, value] of Object.entries(songDesc)) {
                if (key === "_id" || key === "__v") continue;
                songInDb.set(key, value);
            }

            await songInDb.save();

            logger.info(`"${mapName}" updated successfully`);
            return { success: true };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`DB error while updating "${mapName}": ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    async deleteSong(mapName: string): Promise<BasicResult> {
        logger.info(`Deleting song "${mapName}"`);

        try {
            const songInDb = await SongModel.findOne({ mapName });

            if (!songInDb) {
                logger.warn(`"${mapName}" not found in database — skipping`);
                return { success: false };
            }

            await songInDb.deleteOne();

            logger.info(`"${mapName}" deleted successfully`);
            return { success: true };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`DB error while deleting "${mapName}": ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    async bulkAction(action: string, mapNames: string[], value?: any): Promise<BasicResult> {
        return this._applyBulk(action, { mapName: { $in: mapNames } }, value);
    }

    async bulkActionByFilter(action: string, filter: Record<string, any>, value?: any): Promise<BasicResult & { count?: number }> {
        return this._applyBulk(action, filter, value);
    }

    private async _applyBulk(action: string, filter: Record<string, any>, value?: any): Promise<BasicResult & { count?: number }> {
        try {
            let count = 0;
            switch (action) {
                case "publish": {
                    const date = value || new Date().toISOString();
                    const result = await SongModel.updateMany(
                        filter,
                        { $set: { releaseDate: date } }
                    );
                    count = result.modifiedCount;
                    logger.info(`Bulk published ${count} songs with date ${date}`);
                    break;
                }
                case "unpublish": {
                    const result = await SongModel.updateMany(
                        filter,
                        { $set: { releaseDate: "" } }
                    );
                    count = result.modifiedCount;
                    logger.info(`Bulk unpublished ${count} songs`);
                    break;
                }
                case "set-patreon": {
                    const result = await SongModel.updateMany(
                        filter,
                        { $set: { isPatreon: !!value } }
                    );
                    count = result.modifiedCount;
                    logger.info(`Bulk set isPatreon=${!!value} for ${count} songs`);
                    break;
                }
                case "schedule": {
                    const date = value || new Date().toISOString();
                    const result = await SongModel.updateMany(
                        filter,
                        { $set: { releaseDate: date } }
                    );
                    count = result.modifiedCount;
                    logger.info(`Bulk scheduled ${count} songs for ${date}`);
                    break;
                }
                default:
                    return { success: false, errorMessage: `Unknown bulk action: ${action}` };
            }
            return { success: true, count };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`Bulk action "${action}" failed: ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    expandUrls(song: any) {
        if (!song) return song;
        const s = song.toObject ? song.toObject() : song;

        // Expand assets (both platform objects and top-level strings)
        if (s.assets) {
            for (const key in s.assets) {
                const val = s.assets[key];
                if (val && typeof val === 'object') {
                    s.assets[key] = this.buildUrls(val);
                } else if (val && typeof val === 'string' && val.startsWith('/')) {
                    s.assets[key] = this.S3_FQDN + val;
                }
            }
        }

        // Expand top-level urls
        if (s.urls) {
            s.urls = this.buildUrls(s.urls);
        }

        return s;
    }

    async getAllSongs(filter: Record<string, unknown> = {}, options: { skip?: number, limit?: number, sort?: any } = {}): Promise<SongsResult> {
        try {
            const query = SongModel.find(filter).populate("tags");

            if (options.skip !== undefined) query.skip(options.skip);
            if (options.limit !== undefined) query.limit(options.limit);
            if (options.sort !== undefined) query.sort(options.sort);

            const [songs, total] = await Promise.all([
                query.exec(),
                SongModel.countDocuments(filter)
            ]);

            return {
                success: true,
                songs: songs.map(s => this.expandUrls(s)),
                total
            };
        } catch (err) {
            const errorMessage = extractErrorMessage(err);
            logger.error(`DB error while fetching all songs: ${errorMessage}`, { err });
            return { success: false, error: err, errorMessage };
        }
    }

    async getAllSongsForWdf() {
        const songs = await SongModel.find({}, {
            artist: 1,
            coachCount: 1,
            difficulty: 1,
            mapLength: 1,
            mapName: 1,
            originalJDVersion: 1,
            tags: 1,
            title: 1,
        }).populate("tags").lean().exec();

        const songDb: Record<string, object> = {};
        for (const s of songs) {
            const mapName = s.mapName as string;

            (s as any)._id = undefined;

            songDb[mapName] = {
                ...s,
                tags: (s.tags || []).map(t => {
                    if (typeof t === "string") return t;
                    return (t as any)?.name;
                })
            };
        }

        return { success: true, songDb };
    };

    async buildSongDb({ platform = "nx", jmcsEnv, isPatreon }: { platform?: string; jmcsEnv?: string; isPatreon?: boolean }): Promise<{
        success: boolean;
        songDb?: Record<string, object>;
        error?: unknown;
        errorMessage?: string;
    }> {
        const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
        // Dev environment shows all unpublished songs regardless of patreon status.
        // Only apply the patreon filter in production.
        const patreonFilter = jmcsEnv === "dev" ? {} : utils.getPatreonSongFilter(isPatreon);
        const combinedFilter = { ...envFilter, ...patreonFilter };
        const { success, songs, error, errorMessage } = await this.getAllSongs(combinedFilter);
        const allSkus = skus.getAllSkuIds();

        if (!success || !songs) {
            logger.error(`Failed to fetch songs for DB build: ${errorMessage}`);
            return { success: false, error, errorMessage };
        }

        const songDb: Record<string, object> = {};

        // Resolve customTypeName from localization (English for now).
        // Only fetch the loc ids that are actually set on the songs.
        const customTypeLocIds = new Set<number>();
        for (const s of songs) {
            const id = s.customTypeNameId as number | undefined;
            if (id !== undefined && id !== UAF_MAX_INT && id !== -1) customTypeLocIds.add(id);
        }
        const customTypeNames = await localizationLib.getLocalisationMap([...customTypeLocIds]);

        for (const s of songs) {
            const mapName = s.mapName as string;
            const rawAssets = s.assets as Record<string, unknown>;
            const platformAssets = rawAssets[platform] as Record<string, string> | undefined;

            // Only pull these specific keys from root assets — platform sub-objects
            // don't contain phone assets and we don't want to leak any dev fields.
            const PHONE_ASSET_KEYS = [
                "phoneCoach1ImageUrl",
                "phoneCoach2ImageUrl",
                "phoneCoach3ImageUrl",
                "phoneCoach4ImageUrl",
                "phoneCoverImageUrl",
            ] as const;

            const isPhonePlatform = Object.values(PHONE_PLATFORMS).includes(platform as any);

            let assets: Record<string, string>;

            if (isPhonePlatform) {
                // Phone platforms have no assets[platform] sub-object;
                // their assets live flat on the root.
                const phoneAssets: Record<string, string> = {};
                for (const key of PHONE_ASSET_KEYS) {
                    if (typeof rawAssets[key] === "string") {
                        phoneAssets[key] = rawAssets[key] as string;
                    }
                }

                if (Object.keys(phoneAssets).length === 0) {
                    // logger.warn(`"${mapName}" has no phone assets — skipping`);
                    continue;
                }

                assets = phoneAssets;
            } else {
                if (!platformAssets) {
                    // logger.warn(`"${mapName}" has no assets for platform="${platform}" — skipping`);
                    continue;
                }

                // Collect root phone assets and merge; phone assets take precedence
                const rootAssets: Record<string, string> = {};
                for (const key of PHONE_ASSET_KEYS) {
                    if (typeof rawAssets[key] === "string") {
                        rootAssets[key] = rawAssets[key] as string;
                    }
                }

                assets = { ...platformAssets, ...rootAssets };
            }

            let songDesc: Record<string, unknown> = {
                artist: s.artist,
                assets: this.buildUrls(assets),
                audioPreviewData: s.audioPreviewData,
                coachCount: s.coachCount,
                credits: s.credits,
                difficulty: s.difficulty,
                jdmAttributes: s.jdmAttributes,
                lyricsColor: utils.toUAFColors(s.lyricsColor),
                lyricsType: s.lyricsType,
                mainCoach: s.mainCoach,
                mapLength: s.mapLength,
                mapName,
                mapPreviewMpd: s.mapPreviewMpd,
                mode: s.mode,
                originalJDVersion: s.originalJDVersion,
                packages: {
                    mapContent: `${mapName}_mapContent`,
                },
                parentMapName: s.parentMapName,
                skuIds: allSkus,
                songColors: {
                    songColor_1A: utils.toUAFColors(s.songColor1A),
                    songColor_1B: utils.toUAFColors(s.songColor1B),
                    songColor_2A: utils.toUAFColors(s.songColor2A),
                    songColor_2B: utils.toUAFColors(s.songColor2B),
                },
                status: s.status,
                sweatDifficulty: s.sweatDifficulty,
                tags: (s.tags || []).map((t: any) => t.name || t) || ["Main", "subscribedSong"],
                title: s.title,
                urls: Object.fromEntries(
                    Object.entries(s.urls as Record<string, string>).filter(([, v]) => typeof v === "string" && !v.includes("/private/"))
                ),
                serverChangelist: s.serverChangelist,
                customTypeNameId: s.customTypeNameId,
                searchTagsLocIds: s.searchTagsLocIds,
                isPatreon: s.isPatreon || false,
            };

            const customTypeId = s.customTypeNameId as number | undefined;
            if (customTypeId !== undefined && customTypeId !== UAF_MAX_INT && customTypeId !== -1) {
                const loc = customTypeNames[customTypeId.toString()];
                songDesc.customTypeName = loc?.["en"] || s.customTypeName || "";
            }

            songDb[mapName] = songDesc;
        }
        return { success: true, songDb };
    }

    async buildSongDbV2({ sku, jmcsEnv, isPatreon }: { sku: ISku; jmcsEnv?: string; isPatreon?: boolean }) {
        try {
            const skuId = skus.buildSkuId(sku);
            const envTag = jmcsEnv === "dev" ? "dev" : "prod";

            // Dev environment shows all unpublished songs regardless of patreon status.
            // No separate patreon DB needed — use the dev regular key.
            const effectiveIsPatreon = jmcsEnv === "dev" ? false : isPatreon;
            const patreonTag = effectiveIsPatreon ? "patreon" : "regular";

            const songDbCacheKey = `${cacheKeys.SONGDB_PATH}:${skuId}:${envTag}:${patreonTag}`;
            const songDbPathCache = await cache.get(songDbCacheKey);
            const locsDbPathCache = await cache.get(cacheKeys.LOCSDB_PATH);

            let songDbPath = songDbPathCache.value;
            let locsDbPath = locsDbPathCache.value;

            if (!songDbPath || !locsDbPath) {
                logger.warn(`Paths not found in cache for SKU ${skuId} (${envTag}/${patreonTag}), rebuilding now...`);
                const platformToBuild = this.SKIP_PLATFORMS.includes(sku.platform) ? "nx" : sku.platform;
                const { songDb, success: songSuccess, errorMessage: songError } = await this.buildSongDb({ platform: platformToBuild, jmcsEnv, isPatreon: effectiveIsPatreon });
                const { locsDb, success: locsSuccess, error: locError } = await localizationLib.buildLocsDb();

                if (!songSuccess || !songDb) throw new Error(`SongDB build failed: ${songError}`);
                if (!locsSuccess || !locsDb) throw new Error(`LocsDB build failed: ${locError}`);

                songDbPath = await s3.assertSongDb(songDb, sku, jmcsEnv, effectiveIsPatreon);
                locsDbPath = await s3.assertLocalization(locsDb);

                await cache.set(songDbCacheKey, songDbPath);
                await cache.set(cacheKeys.LOCSDB_PATH, locsDbPath);
            }

            const songdbUrl = s3.getSignedDownloadUrl(songDbPath);
            const localisationUrl = s3.getSignedDownloadUrl(locsDbPath);

            return {
                success: true,
                requestSpecificMaps: {},
                songdbUrl,
                localisationUrl,
                localMaps: []
            };
        } catch (err: any) {
            logger.error(`Error while building song DB v2: ${err.message}`, { err });
            return { success: false, error: err, errorMessage: err.message };
        }
    };

    async refreshDatabases(triggeredBy: string = "System") {
        try {
            logger.info(`Starting database refresh triggered by ${triggeredBy}...`);
            const allSkus = skus.info;
            const { locsDb, success: locsSuccess, error: locError } = await localizationLib.buildLocsDb();

            if (!locsSuccess || !locsDb) throw new Error(`LocsDB build failed: ${locError}`);

            const locsDbPath = await s3.assertLocalization(locsDb);
            await cache.set(cacheKeys.LOCSDB_PATH, locsDbPath);

            // Filter SKUs that need a SongDB build and group by platform
            const skusToBuild = Object.entries(allSkus).filter(([_, sku]) => sku.buildSongDb);
            const platforms = [...new Set(skusToBuild.map(([_, sku]) => sku.platform))].filter(p => !this.SKIP_PLATFORMS.includes(p));

            // Build prod (published), dev (unpublished), and patreon variants.
            // Dev environment shows all unpublished songs (patreon filter skipped).
            const envs = ["prod", "dev"] as const;
            const patreonModes = [false, true] as const;
            const platformPathsByEnvPatreon: Record<string, Record<string, Record<string, string>>> = { prod: { regular: {}, patreon: {} }, dev: { regular: {} } };

            for (const platform of platforms) {
                const sampleSkuEntry = skusToBuild.find(([_, sku]) => sku.platform === platform);
                if (!sampleSkuEntry) continue;
                const [_, sampleSku] = sampleSkuEntry;

                for (const jmcsEnv of envs) {
                    for (const isPatreon of patreonModes) {
                        // Dev environment doesn't need a separate patreon DB —
                        // it already includes all unpublished songs regardless of patreon status.
                        if (jmcsEnv === "dev" && isPatreon) continue;

                        const patreonLabel = isPatreon ? "patreon" : "regular";
                        logger.info(`Building SongDB for platform ${platform} (${jmcsEnv}/${patreonLabel})...`);
                        const { songDb, success: songSuccess, errorMessage: songError } = await this.buildSongDb({ platform, jmcsEnv, isPatreon });

                        if (!songSuccess || !songDb) {
                            logger.error(`Failed to build SongDb for platform ${platform} (${jmcsEnv}/${patreonLabel}): ${songError}`);
                            continue;
                        }

                        const songDbPath = await s3.assertSongDb(songDb, sampleSku, jmcsEnv, isPatreon);
                        platformPathsByEnvPatreon[jmcsEnv][patreonLabel][platform] = songDbPath;
                    }
                }
            }

            // Update cache for each SKU
            for (const [skuId, sku] of Object.entries(allSkus)) {
                if (sku.buildSongDb) {
                    for (const jmcsEnv of envs) {
                        for (const isPatreon of patreonModes) {
                            // Dev uses the same DB for both patreon and regular
                            if (jmcsEnv === "dev" && isPatreon) continue;

                            const patreonLabel = isPatreon ? "patreon" : "regular";
                            const platformPath = platformPathsByEnvPatreon[jmcsEnv][patreonLabel]?.[sku.platform] || platformPathsByEnvPatreon[jmcsEnv][patreonLabel]?.["nx"];
                            if (platformPath) {
                                await cache.set(`${cacheKeys.SONGDB_PATH}:${skuId}:${jmcsEnv}:${patreonLabel}`, platformPath);
                            }
                        }
                    }
                    // Dev regular DB is also used for dev patreon requests
                    const devRegularPath = platformPathsByEnvPatreon["dev"]["regular"]?.[sku.platform] || platformPathsByEnvPatreon["dev"]["regular"]?.["nx"];
                    if (devRegularPath) {
                        await cache.set(`${cacheKeys.SONGDB_PATH}:${skuId}:dev:patreon`, devRegularPath);
                    }
                }
            }

            logger.info(`Refreshed SongDB for platforms: ${Object.keys(platforms).join(", ")}`);

            const dbStatus = {
                lastRefreshedAt: new Date().toISOString(),
                triggeredBy,
                locsDbPath,
                songDbPaths: platformPathsByEnvPatreon["prod"]["regular"],
                devSongDbPaths: platformPathsByEnvPatreon["dev"]["regular"],
                patreonSongDbPaths: platformPathsByEnvPatreon["prod"]["patreon"],
            };
            await cache.set(cacheKeys.DB_STATUS, dbStatus);

            logger.info("Database refresh complete.");
            return { success: true };
        } catch (err: any) {
            logger.error(`Error refreshing databases: ${err.message}`, { err });
            return { success: false, error: err, errorMessage: err.message };
        }
    }

    async auditSongs() {
        const { success, songs, errorMessage } = await this.getAllSongs({}, { sort: { mapName: 1 } });
        if (!success || !songs) {
            return { success: false, errorMessage };
        }

        const auditResults: any[] = [];

        for (const s of songs) {
            const mapName = s.mapName as string;
            const issues: any[] = [];
            const rawAssets = s.assets || {};
            const coachCount = s.coachCount || 0;

            // 1. Check Phone Assets
            for (let i = 1; i <= coachCount; i++) {
                const key = `phoneCoach${i}ImageUrl`;
                if (!rawAssets[key]) {
                    issues.push({
                        type: "missing_asset",
                        field: key,
                        message: `Missing phone asset: ${key}`
                    });
                }
            }
            if (!rawAssets.phoneCoverImageUrl) {
                issues.push({
                    type: "missing_asset",
                    field: "phoneCoverImageUrl",
                    message: "Missing phone asset: phoneCoverImageUrl"
                });
            }

            // 2. Check Platform Assets
            const allPlatforms = [...new Set(Object.values(skus.info).map(s => s.platform))];
            const phonePlatforms = Object.values(PHONE_PLATFORMS) as string[];
            const platformsToAudit = allPlatforms.filter(p => !this.SKIP_PLATFORMS.includes(p) && !phonePlatforms.includes(p));

            for (const platform of platformsToAudit) {
                if (!rawAssets[platform] || Object.keys(rawAssets[platform]).length === 0) {
                    issues.push({
                        type: "missing_platform",
                        platform,
                        message: `Missing assets for platform: ${platform}`
                    });
                }
            }

            // 3. Check URLs
            const urls = s.urls || {};
            const midMpd = `jmcs://jd-contents/${mapName}/${mapName}_MapPreviewNoSoundCrop_MID.vp8.webm`;
            const lowMpd = `jmcs://jd-contents/${mapName}/${mapName}_MapPreviewNoSoundCrop_LOW.vp8.webm`;

            if (!urls[midMpd] && !urls[lowMpd]) {
                issues.push({
                    type: "missing_urls",
                    message: "Missing both MapPreviewNoSoundCrop_MID and MapPreviewNoSoundCrop_LOW"
                });
            }

            // 4. Check Packages
            const packages = s.packages || {};
            if (Object.keys(packages).length === 0) {
                issues.push({
                    type: "missing_packages",
                    message: "No packages defined"
                });
            }

            // 6. Check Inconsistencies
            if (coachCount < 1 || coachCount > 4) {
                issues.push({
                    type: "invalid_data",
                    field: "coachCount",
                    value: coachCount,
                    message: `Invalid coachCount: ${coachCount}`
                });
            }

            auditResults.push({
                mapName,
                title: s.title,
                issues
            });
        }

        return {
            success: true,
            totalSongs: songs.length,
            songsWithIssues: auditResults.filter(r => r.issues.length > 0).length,
            results: auditResults
        };
    }

    async getSongCount() {
        return await SongModel.countDocuments();
    };

}

export default new Songs();