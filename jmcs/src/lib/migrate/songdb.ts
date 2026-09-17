import { readFileSync, existsSync } from "node:fs";
import mongoose from "mongoose";

import config from "../../config";
import songModel from "../models/song";
import { Tag } from "../models/tag";
import { UAF_MAX_INT } from "../enums";
import { createLogger } from "../logger";
import utils from "../utils";

const logger = createLogger({ service: "migrate-songdb" });

type Platform =
    | "nx"
    | "ps4"
    | "pc"
    | "nxPatreon"
    | "ps4Patreon"
    | "pcPatreon"
    | "jmcs";

type Type = "public" | "patreon" | "jmcs";

type PackageEntry = {
    md5: string;
    storageType: number;
    url: string;
    version: number;
};
type PackageDb = Record<string, PackageEntry>;

const readJson = (path: string) => {
    return JSON.parse(readFileSync(path).toString());
};

const REQUIRED_DUMPS = [
    "./src/scripts/jdmelody-nx-all.json",
    "./src/scripts/jdmelody-ps4-all.json",
    "./src/scripts/jdmelody-pc-all.json",
    "./src/scripts/jdmelody-nx-patreon.json",
    "./src/scripts/jdmelody-ps4-patreon.json",
    "./src/scripts/jdmelody-pc-patreon.json",
    "./src/scripts/jmcs-dev.songs.json",
];

const checkDumpsExist = () => {
    const missing = REQUIRED_DUMPS.filter(f => !existsSync(f));
    if (missing.length > 0) {
        throw new Error(
            `Migration cannot run in this environment — missing JSON dump files:\n` +
            missing.map(f => `  - ${f}`).join("\n") +
            `\n\nThese files are only available in development environments with JDMO source data. ` +
            `On production/deployed instances, use the admin API directly to manage songs.`
        );
    }
};

const loadSongDbs = () => ({
    nx: {
        songDb: readJson("./src/scripts/jdmelody-nx-all.json"),
        platform: "nx" as const,
        type: "public" as const
    },
    ps4: {
        songDb: readJson("./src/scripts/jdmelody-ps4-all.json"),
        platform: "ps4" as const,
        type: "public" as const
    },
    pc: {
        songDb: readJson("./src/scripts/jdmelody-pc-all.json"),
        platform: "pc" as const,
        type: "public" as const
    },
    nxPatreon: {
        songDb: readJson("./src/scripts/jdmelody-nx-patreon.json"),
        platform: "nx" as const,
        type: "patreon" as const
    },
    ps4Patreon: {
        songDb: readJson("./src/scripts/jdmelody-ps4-patreon.json"),
        platform: "ps4" as const,
        type: "patreon" as const
    },
    pcPatreon: {
        songDb: readJson("./src/scripts/jdmelody-pc-patreon.json"),
        platform: "pc" as const,
        type: "patreon" as const
    },
    jmcs: {
        songDb: readJson("./src/scripts/jmcs-dev.songs.json"),
        type: "jmcs" as const
    }
});

const loadPackageDb = (platform: string): PackageDb => {
    const basePath = `./src/scripts/packages/${platform}/sku-packages`;
    const prod = existsSync(`${basePath}.json`) ? readJson(`${basePath}.json`) : {};
    const dev = existsSync(`${basePath}-dev.json`) ? readJson(`${basePath}-dev.json`) : {};
    return { ...prod, ...dev };
};

const stripDomain = (str: string): string => {
    return str.replace(/^https?:\/\/[^/]+/, "");
};

const stripDomainObj = (assets: Record<string, string> | null) => {
    if (!assets) return null;
    return Object.fromEntries(
        Object.entries(assets).map(([key, value]) => [
            key,
            stripDomain(value),
        ])
    );
};

const getContentAuth = (mapName: string) => {
    const caDefaultPath = `./src/scripts/content-auth/${mapName}.json`;
    const caDevPath = `./src/scripts/content-auth/Dev/${mapName}.json`;
    const caExclusivePath = `./src/scripts/content-auth/Exclusive/${mapName}.json`;

    let contentAuth: { urls?: Record<string, string> } = {};

    if (existsSync(caDefaultPath)) {
        contentAuth = readJson(caDefaultPath);
    } else if (existsSync(caExclusivePath)) {
        contentAuth = readJson(caExclusivePath);
    } else if (existsSync(caDevPath)) {
        contentAuth = readJson(caDevPath);
    } else {
        return null;
    }

    if (!contentAuth.urls) {
        return {};
    }

    return contentAuth.urls;
};

export type MigrationEvent =
    | { mapName: string; action: "imported" | "updated" | "error"; error?: string }
    | { summary: { imported: number; updated: number; skipped: number; errors: number } };

/**
 * Async generator that runs the full migration from JDMO JSON dumps
 * into MongoDB, yielding progress events suitable for SSE streaming.
 */
export async function* runMigration(): AsyncGenerator<MigrationEvent> {
    checkDumpsExist();
    const songDbs = loadSongDbs();

    const packageDbs = {
        nx: loadPackageDb("NX"),
        pc: loadPackageDb("PC"),
        ps4: loadPackageDb("PS4"),
    };

    const getSongDesc = (mapName: string, platform: Platform) => {
        return (songDbs as any)[platform]?.songDb?.[mapName] || null;
    };

    const getPackageForMap = (mapName: string, platform: "nx" | "pc" | "ps4"): PackageEntry | null => {
        return packageDbs[platform]?.[`${mapName}_mapContent`] || null;
    };

    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI as string);
    logger.info("Connected to MongoDB");

    const mapNames = [...new Set([
        ...Object.keys(songDbs.nx.songDb),
        ...Object.keys(songDbs.ps4.songDb),
        ...Object.keys(songDbs.pc.songDb),
        ...Object.keys(songDbs.nxPatreon.songDb),
        ...Object.keys(songDbs.ps4Patreon.songDb),
        ...Object.keys(songDbs.pcPatreon.songDb),
    ])].sort();

    const tagsDb: any[] = [];

    // --- First pass: collect all unique tags ---
    for (const mapName of mapNames) {
        const base =
            getSongDesc(mapName, "nx") ||
            getSongDesc(mapName, "ps4") ||
            getSongDesc(mapName, "pc") ||
            getSongDesc(mapName, "nxPatreon") ||
            getSongDesc(mapName, "ps4Patreon") ||
            getSongDesc(mapName, "pcPatreon");

        if (!base) continue;

        const tags = base.tags || [];
        tagsDb.push(...tags.map((t: string) => ({
            name: t,
            color: "#4f46e5",
            description: ""
        })));
    }

    // Deduplicate tags (case-insensitive)
    const seen = new Set<string>();
    const uniqueTagsDb = tagsDb
        .sort((a: any, b: any) => {
            if (a.name === "Main") return -1;
            if (b.name === "Main") return 1;
            return 0;
        })
        .filter((t: any) => {
            const key = t.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

    // Migrate tags first
    const tagBulkOps = uniqueTagsDb.map((tag: any) => ({
        updateOne: {
            filter: { name: tag.name },
            update: { $set: tag },
            upsert: true
        }
    }));
    if (tagBulkOps.length > 0) {
        await Tag.bulkWrite(tagBulkOps);
        logger.info(`Migrated ${tagBulkOps.length} tags`);
    }

    // Build tag name -> _id map (case-insensitive)
    const allTags = await Tag.find({}).lean();
    const tagIdMap = new Map(allTags.map(t => [t.name.toLowerCase(), t._id]));

    // --- Second pass: build and upsert songs ---
    const BATCH_SIZE = 500;
    let songBatch: any[] = [];
    let imported = 0;
    let updated = 0;
    let errors = 0;

    const flushBatch = async () => {
        if (songBatch.length === 0) return;
        const bulkOps = songBatch.map(song => ({
            updateOne: {
                filter: { mapName: song.mapName },
                update: { $set: song },
                upsert: true
            }
        }));
        await songModel.bulkWrite(bulkOps);
        songBatch = [];
    };

    for (const mapName of mapNames) {
        const base =
            getSongDesc(mapName, "nx") ||
            getSongDesc(mapName, "ps4") ||
            getSongDesc(mapName, "pc") ||
            getSongDesc(mapName, "nxPatreon") ||
            getSongDesc(mapName, "ps4Patreon") ||
            getSongDesc(mapName, "pcPatreon");

        if (!base) {
            errors++;
            yield { mapName, action: "error", error: "No base entry found" };
            continue;
        }

        try {
            const isPublic =
                getSongDesc(mapName, "nx") ||
                getSongDesc(mapName, "ps4") ||
                getSongDesc(mapName, "pc");

            const jmcsEntry = (songDbs.jmcs.songDb as any[]).find(
                (s: any) => s.mapName === mapName
            );

            const assets = {
                nx: stripDomainObj(getSongDesc(mapName, "nx")?.assets || getSongDesc(mapName, "nxPatreon")?.assets || null),
                ps4: stripDomainObj(getSongDesc(mapName, "ps4")?.assets || getSongDesc(mapName, "ps4Patreon")?.assets || null),
                pc: stripDomainObj(getSongDesc(mapName, "pc")?.assets || getSongDesc(mapName, "pcPatreon")?.assets || null),
                wiiu: jmcsEntry?.assets?.wiiu || null,
            };

            const contentAuth = getContentAuth(mapName);

            const tagIds = (base.tags || [])
                .map((t: string) => tagIdMap.get(t.toLowerCase()))
                .filter(Boolean);

            const { skuIds, ...baseWithoutSkuIds } = base;

            const sanitized = { ...baseWithoutSkuIds } as any;
            const numericFields = ["mapLength", "difficulty", "sweatDifficulty", "coachCount", "originalJDVersion", "mainCoach", "lyricsType", "mode", "status", "customTypeNameId", "serverChangelist"];
            for (const field of numericFields) {
                if (sanitized[field] === undefined || sanitized[field] === null || typeof sanitized[field] === "object") {
                    const defaults: Record<string, any> = {
                        mapLength: 0,
                        difficulty: 1,
                        sweatDifficulty: 1,
                        coachCount: 1,
                        originalJDVersion: 2021,
                        mainCoach: -1,
                        lyricsType: 0,
                        mode: 6,
                        status: 3,
                        customTypeNameId: UAF_MAX_INT,
                        serverChangelist: 0
                    };
                    sanitized[field] = defaults[field] ?? 0;
                }
            }

            const packages: Record<string, any> = {};
            for (const plat of ["nx", "pc", "ps4"] as const) {
                const pkg = getPackageForMap(mapName, plat);
                if (pkg) {
                    packages[plat] = {
                        ...pkg,
                        url: stripDomain(pkg.url),
                    };
                }
            }
            if (jmcsEntry?.packages?.wiiu) {
                packages.wiiu = jmcsEntry.packages.wiiu;
            }

            // Map songColors object to individual fields if present (UAF → hex)
            if (sanitized.songColors && typeof sanitized.songColors === "object") {
                const sc = sanitized.songColors as Record<string, string>;
                sanitized.songColor1A = utils.fromUAFColors(sc.songColor_1A || sc.songColor1A || "");
                sanitized.songColor1B = utils.fromUAFColors(sc.songColor_1B || sc.songColor1B || "");
                sanitized.songColor2A = utils.fromUAFColors(sc.songColor_2A || sc.songColor2A || "");
                sanitized.songColor2B = utils.fromUAFColors(sc.songColor_2B || sc.songColor2B || "");
                delete sanitized.songColors;
            }
            // Also convert lyricsColor if it's in UAF format (8 hex chars, no #)
            if (sanitized.lyricsColor && /^[0-9A-Fa-f]{8}$/.test(sanitized.lyricsColor)) {
                sanitized.lyricsColor = utils.fromUAFColors(sanitized.lyricsColor);
            }

            const songData: any = {
                ...sanitized,
                assets,
                urls: stripDomainObj({
                    ...base.urls || {},
                    ...(contentAuth || {})
                }),
                ...(!isPublic && { isPatreon: true }),
                tags: tagIds,
                packages,
            };

            // Check if song already exists
            const exists = await songModel.exists({ mapName });
            if (exists) {
                updated++;
                yield { mapName, action: "updated" };
            } else {
                imported++;
                yield { mapName, action: "imported" };
            }

            songBatch.push(songData);

            if (songBatch.length >= BATCH_SIZE) {
                await flushBatch();
            }

        } catch (err: any) {
            errors++;
            yield { mapName, action: "error", error: err?.message || String(err) };
        }
    }

    // Flush remaining
    await flushBatch();

    await mongoose.disconnect();
    logger.info("Migration complete");

    yield { summary: { imported, updated, skipped: 0, errors } };
}

/**
 * One-shot convenience wrapper for CLI usage.
 */
export const migrateOnce = async (): Promise<void> => {
    for await (const event of runMigration()) {
        if ("summary" in event) {
            const { summary } = event;
            logger.info({
                message: "Migration finished",
                ...summary
            });
        } else if (event.action === "error") {
            logger.warn({ message: `Error importing ${event.mapName}`, error: event.error });
        }
    }
};
