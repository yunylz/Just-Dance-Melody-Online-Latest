import { Request } from "express";
import { createLogger } from "../logger";
import HomeTileModel from "../models/home-tile";
import HomeCorrectionModel from "../models/home-correction";
import SongModel from "../models/song";
import { HomeTileType, HomeTileSubtypes, HomeTileClass } from "./constants";
import { acceptsFilters } from "../carousel/filter";
import { v4 as uuidv4 } from "uuid";
import profiles from "../profiles";

const logger = createLogger({ service: "home-lib" });

export interface IHomeTile {
    __class: string;
    type: number;
    creationTime: number;
    new: boolean;
    locked?: boolean;
    lockPosition?: number;
    lockDuration?: number;
    contentExpiry?: number;
    uuid: string;
    [key: string]: any;
}

class Home {
    private readonly TILE_HISTORY_LIMIT = 12;

    constructor() {}

    /**
     * Main entry point for fetching home tiles.
     */
    async getUpdatedHomeTiles(req: Request) {
        const {
            tileHistory = [],
            requestedTileCount = 5,
            timestampLastManualContent = 0,
            timestampLastMapContent = 0,
            timestampLastPlaylistContent = 0,
            timestampLastLocalTrack = 0
        } = req.body;

        // Ignore client-provided tile history and timestamps — always start fresh
        let updatedTileGrid: IHomeTile[] = [];
        let tilesToPush: IHomeTile[] = [];

        // 1. Update lock expiry
        this.updateLockExpiry(updatedTileGrid);

        // 2. Build the welcome tile directly in code
        const welcomeLines = [
            "Grab your friends and family because it's time to turn up the volume and let loose!",
            "",
            "[C:ff7b88e8]Just Dance Melody Online, [C:ff575757]the #1 Just Dance streaming service of all time, offers you the best of the Just Dance franchise with 1500+ songs and counting!",
            "",
            "Join a community of more than 6000+ players around the world and dance it out!",
            "",
            "[C:ff7b88e8]Just Dance Melody Online is currently available for:",
            "",
            "[C:ffe60012]Nintendo Switch Systems - Just Dance 2017 to 2022",
            "",
            "[C:ff45a1d6]Wii U - Just Dance 2016 to 2019",
            "",
            "[C:ff2e6db4]PS4 - Just Dance 2016 to 2022",
            "",
            "[C:ff575757]PC - Just Dance 2017",
            "",
            "Thanks for playing & keep on dancing! - [C:ff7b88e8]JDMO Development Team [icon:star]",
        ];

        const code = (req as any).verificationCode || "";
        if (code) {
            welcomeLines.push(
                "",
                "[C:ff575757]Your verification code is: [C:ff4a7bdf]" + code,
                "[C:ff575757]Use this code to link your profile to your JDMO Hub.",
                "You can join the Hub at: [C:ff4a7bdf]hub.c0llydoll.dev[C:ff575757]",
            );
        }

        const welcomeTile = {
            type: "news",
            title: "Welcome to Just Dance Melody Online!",
            text: welcomeLines.join("\n"),
            locked: true,
            lockPosition: 0,
            uuid: "2850f72d-2741-4bb9-86b5-0002d072f0dd",
            imageUrl: (req as any).sku?.gameVersion === "jd2019"
                ? "https://jdmo-s3.c0llydoll.com/public/homedb/home_tile_asset_welcome_hanabi_y4_JD19.png"
                : "https://jdmo-s3.c0llydoll.com/public/homedb/home_tile_asset_welcome_hanabi_y4.png",
        };

        tilesToPush.push(await this.createTileObject(welcomeTile, req));

        // 3. Fetch remaining manual tiles from DB
        const manualTiles = await this.getEligibleManualTiles(req, 0);
        
        let currentTimestampLastManualContent = timestampLastManualContent;
        if (manualTiles.length > 0) {
            for (const manualTileDoc of manualTiles) {
                const manualTile = manualTileDoc.toObject();
                const tileObj = await this.createTileObject(manualTile, req);
                tilesToPush.push(tileObj);
                currentTimestampLastManualContent = Math.max(currentTimestampLastManualContent, (manualTile.activationTime + 1) / 1000);
            }
        }

        // 3. Algorithm tiles (pass currently pending tiles to avoid redundant recommendations)
        if (updatedTileGrid.length + tilesToPush.length < requestedTileCount) {
            const algoTiles = await this.getAlgorithmTiles(req, updatedTileGrid.concat(tilesToPush));
            tilesToPush.push(...algoTiles);
        }

        // 4. Insert tiles into grid (manual tiles first, then algorithm tiles)
        for (const tileToPush of tilesToPush) {
            this.insertTileInGrid(tileToPush, updatedTileGrid);
        }


        // 5. Limit history
        if (updatedTileGrid.length > this.TILE_HISTORY_LIMIT) {
            updatedTileGrid = updatedTileGrid.slice(0, this.TILE_HISTORY_LIMIT);
        }

        // 6. Ensure no nulls (replace with offline tiles if necessary)
        updatedTileGrid = updatedTileGrid.map(tile => tile || this.createOfflineReplaceableTile());

        // 7. Apply corrections
        const corrections = await HomeCorrectionModel.find({
            uuid: { $in: updatedTileGrid.map(t => t.uuid) }
        }).lean();

        if (corrections.length > 0) {
            const correctionMap = new Map(corrections.map(c => [c.uuid, c.correction]));
            for (let i = 0; i < updatedTileGrid.length; i++) {
                const tile = updatedTileGrid[i];
                const correction = correctionMap.get(tile.uuid);
                if (correction) {
                    const correctedTile = await this.createTileObject({ ...tile, ...correction }, req);
                    correctedTile.new = tile.new; // Preserve original "new" status
                    updatedTileGrid[i] = correctedTile;
                }
            }
        }

        return {
            __class: HomeTileClass.HomeData,
            tileList: updatedTileGrid,
            timestampLastRequest: Math.floor(Date.now() / 1000),
            timestampLastManualContent: currentTimestampLastManualContent,
            timestampLastMapContent: timestampLastMapContent,
            timestampLastVideoContent: 0,
            timestampLastPlaylistContent: timestampLastPlaylistContent,
            timestampLastLocalTrack: timestampLastLocalTrack
        };
    }

    private updateLockExpiry(tileList: (IHomeTile | null)[]) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        for (let i = 0; i < tileList.length; i++) {
            const tile = tileList[i];
            if (!tile) continue;

            if (tile.locked && tile.lockDuration && (nowSeconds > (tile.creationTime / 1000) + tile.lockDuration)) {
                tile.locked = false;
                tile.lockDuration = 0;
            }

            if (tile.contentExpiry && nowSeconds > tile.contentExpiry) {
                tileList[i] = null;
            }
        }
    }

    private async getEligibleManualTiles(req: Request, lastTimestamp: number) {
        const now = Date.now();
        const tiles = await HomeTileModel.find({
            activationTime: { $gt: lastTimestamp * 1000, $lte: now }
        }).sort({ activationTime: 1 });

        return tiles.filter(tile => {
            if (tile.contentExpiry && tile.contentExpiry <= Math.floor(now / 1000)) return false;
            if (tile.filters && Object.keys(tile.filters).length > 0) {
                try {
                    if (Array.isArray(tile.filters)) {
                        return acceptsFilters(req, tile.filters as any);
                    }
                } catch (e) {
                    logger.error("Filter evaluation failed for home tile", e);
                    return false;
                }
            }
            return true;
        });
    }

    private async getAlgorithmTiles(req: Request, currentTiles: IHomeTile[]): Promise<IHomeTile[]> {
        const tiles: IHomeTile[] = [];
        
        const last4 = currentTiles.slice(0, 4);
        const hasMap = last4.some(t => t.type === HomeTileType.MAP);

        // 1. Map recommendation
        if (!hasMap) {
            const randomSongs = await SongModel.aggregate([{ $sample: { size: 1 } }]);
            if (randomSongs.length > 0) {
                const song = randomSongs[0];
                tiles.push(await this.createTileObject({
                    type: "map",
                    subtype: "skuRandom",
                    mapName: song.mapName,
                    uuid: uuidv4()
                }, req));
            }
        }

        // 2. JDU Countdown (simplified logic)
        // If we had subscription info on req, we'd check it here.
        // Assuming req.subscriptionTimeLeft exists if added by some middleware.
        // const subscriptionTimeLeft = (req as any).subscriptionTimeLeft;
        // const hasSubscription = (req as any).hasSubscription;
        // const SEVEN_DAYS = 7 * 24 * 60 * 60;

        // if (hasSubscription && subscriptionTimeLeft > 0 && subscriptionTimeLeft < SEVEN_DAYS) {
        //     const alreadyHasCountdown = currentTiles.some(t => t.type === HomeTileType.JDU_COUNTDOWN);
        //     if (!alreadyHasCountdown) {
        //         tiles.push(await this.createTileObject({
        //             type: "jduCountdown",
        //             locked: true,
        //             lockPosition: 4,
        //             lockDuration: subscriptionTimeLeft,
        //             uuid: uuidv4()
        //         }, req));
        //     }
        // }

        // 3. JDU Trial
        // const uplayConnected = (req as any).uplayConnected; // Hypothetical field
        // if (uplayConnected && !hasSubscription) {
        //     const alreadyHasTrial = currentTiles.some(t => t.type === HomeTileType.JDU_TRIAL);
        //     if (!alreadyHasTrial) {
        //         tiles.push(await this.createTileObject({
        //             type: "jduTrial",
        //             locked: true,
        //             lockPosition: 4,
        //             uuid: uuidv4()
        //         }, req));
        //     }
        // }

        return tiles;
    }

    private insertTileInGrid(tileToInsert: IHomeTile, grid: (IHomeTile | null)[]) {
        let currentTile: IHomeTile | null = tileToInsert;
        let gridPosition = 0;

        // If the tile to insert is locked to a specific position, try to put it there directly if empty or replaceable
        if (currentTile.locked && currentTile.lockPosition !== undefined) {
            const targetPos = currentTile.lockPosition;
            if (targetPos < this.TILE_HISTORY_LIMIT) {
                const existing = grid[targetPos];
                if (!existing || existing.type === HomeTileType.OFFLINE_REPLACEABLE) {
                    grid[targetPos] = currentTile;
                    return;
                }
            }
        }

        // Standard insertion (push from top)
        while (currentTile && gridPosition < this.TILE_HISTORY_LIMIT) {
            const existingTile = grid[gridPosition];

            // If existing tile is locked, we can't overwrite it. Skip this position.
            if (existingTile && existingTile.locked) {
                gridPosition++;
                continue;
            }

            // Place current tile here and shift the existing one down
            grid[gridPosition] = currentTile;
            currentTile = existingTile;

            // Shifted tiles lose their lock
            if (currentTile) {
                currentTile.locked = false;
                currentTile.lockDuration = 0;
            }
            
            gridPosition++;
        }
    }


    private async applyMetadata(tileInfo: any, req: Request) {
        const pid = tileInfo.winnerPid || tileInfo.dancerPid;
        if (pid && pid !== "00000000-0000-0000-0000-000000000000") {
            const profile = await profiles.getProfile(pid);
            if (profile) {
                if (tileInfo.winnerPid) {
                    tileInfo.winnerPlatform = profile.platform || "";
                    tileInfo.winnerName = profile.name || "";
                    tileInfo.winnerNameSuffix = profile.nickname || "";
                    tileInfo.winnerCountry = profile.country || 0;
                    tileInfo.winnerAlias = profile.alias || 0;
                    tileInfo.winnerAvatar = profile.avatar || 0;
                } else if (tileInfo.dancerPid) {
                    tileInfo.dancerPlatform = profile.platform || "";
                    tileInfo.dancerName = profile.name || "";
                    tileInfo.dancerNameSuffix = profile.nickname || "";
                    tileInfo.dancerCountry = profile.country || 0;
                    tileInfo.dancerAlias = profile.alias || 0;
                    tileInfo.dancerAvatar = profile.avatar || 0;
                    tileInfo.dancerPortraitBorder = profile.portraitBorder || 0;
                    tileInfo.dancerJDPoints = (profile.jdPoints && profile.jdPoints[req.sku?.gameVersion || "jd2019"]) || 0;
                }
            }
        }
        return tileInfo;
    }

    private async createTileObject(tileInfoRaw: any, req: Request): Promise<IHomeTile> {
        const tileInfo = await this.applyMetadata({ ...tileInfoRaw }, req);
        const typeStr = typeof tileInfo.type === "string" ? tileInfo.type : this.getTypeStr(tileInfo.type);
        const typeEnum = typeof tileInfo.type === "number" ? tileInfo.type : (HomeTileType as any)[typeStr.toUpperCase()];
        
        const tile: IHomeTile = {
            __class: HomeTileClass.HomeTile,
            type: typeEnum,
            creationTime: Date.now(),
            new: tileInfo.new !== undefined ? tileInfo.new : true,
            uuid: tileInfo.uuid || uuidv4()
        };

        if (tileInfo.locked) tile.locked = tileInfo.locked;
        if (tileInfo.lockPosition !== undefined) tile.lockPosition = tileInfo.lockPosition;
        if (tileInfo.lockDuration) tile.lockDuration = tileInfo.lockDuration;
        if (tileInfo.contentExpiry) tile.contentExpiry = tileInfo.contentExpiry;

        switch (typeStr) {
            case "map":
                tile.mapTileInfo = {
                    __class: HomeTileClass.MapTileInfo,
                    mapName: tileInfo.mapName,
                    type: this.getSubtypeEnum("map", tileInfo.subtype)
                };
                break;
            case "playlist":
                tile.playlistTileInfo = {
                    __class: HomeTileClass.PlaylistTileInfo,
                    playlistID: tileInfo.playlistID,
                    type: this.getSubtypeEnum("playlist", tileInfo.subtype)
                };
                break;
            case "news":
                tile.newsTileInfo = {
                    __class: HomeTileClass.NewsTileInfo,
                    title: tileInfo.title || "",
                    text: tileInfo.text || "",
                    imageUrl: tileInfo.imageUrl || "",
                    type: this.getSubtypeEnum("news", tileInfo.subtype),
                    winnerPid: tileInfo.winnerPid || "00000000-0000-0000-0000-000000000000",
                    winnerPlatform: tileInfo.winnerPlatform || "",
                    winnerName: tileInfo.winnerName || "",
                    winnerNameSuffix: tileInfo.winnerNameSuffix || 0,
                    winnerCountry: tileInfo.winnerCountry || 0,
                    winnerAvatar: tileInfo.winnerAvatar || 0,
                    winnerAlias: tileInfo.winnerAlias || 0,
                    offlineNewID: tileInfo.offlineNewID || ""
                };
                break;
            case "video":
                tile.videoTileInfo = {
                    __class: HomeTileClass.VideoTileInfo,
                    type: this.getSubtypeEnum("video", tileInfo.subtype),
                    streaming: tileInfo.streaming || false,
                    dancerPid: tileInfo.dancerPid || "",
                    description: tileInfo.description || "",
                    videoDataUrl: tileInfo.videoDataUrl || "",
                    thumbnailUrl: tileInfo.thumbnailUrl || "",
                    dancerPlatform: tileInfo.dancerPlatform || "",
                    dancerName: tileInfo.dancerName || "",
                    dancerNameSuffix: tileInfo.dancerNameSuffix || 0,
                    dancerCountry: tileInfo.dancerCountry || 0,
                    dancerAlias: tileInfo.dancerAlias || 0,
                    dancerAvatar: tileInfo.dancerAvatar || 0,
                    dancerPortraitBorder: tileInfo.dancerPortraitBorder || 0,
                    dancerJDPoints: tileInfo.dancerJDPoints || 0
                };
                break;
            case "uplay":
                tile.uplayTileInfo = {
                    __class: HomeTileClass.UplayTileInfo,
                    name: tileInfo.name || "",
                    type: this.getSubtypeEnum("uplay", tileInfo.subtype),
                    cost: tileInfo.cost || 0,
                    imageUrl: tileInfo.imageUrl || ""
                };
                break;
            case "feedback":
                tile.feedbackTileInfo = {
                    __class: HomeTileClass.FeedbackTileInfo,
                    ...tileInfo.feedbackInfo
                };
                break;
            case "jduCountdown":
                // No extra info needed usually
                break;
            case "jduTrial":
                // No extra info needed usually
                break;
        }

        return this.applyVerificationCode(tile, req);
    }


    /**
     * Replaces `{VERIFICATION_CODE}` placeholders in all string values of the tile
     * with the actual verification code from the request.
     */
    private applyVerificationCode(tile: IHomeTile, req: Request): IHomeTile {
        const code = (req as any).verificationCode || "";

        // Generic fallback: replace {VERIFICATION_CODE} in any string field
        if (code) {
            const walk = (obj: any): any => {
                if (typeof obj === "string") {
                    return obj.replace(/\{VERIFICATION_CODE\}/g, code);
                }
                if (obj && typeof obj === "object") {
                    for (const key of Object.keys(obj)) {
                        obj[key] = walk(obj[key]);
                    }
                }
                return obj;
            };
            return walk(tile);
        }

        return tile;
    }

    private createOfflineReplaceableTile(): IHomeTile {
        return {
            __class: HomeTileClass.HomeTile,
            type: HomeTileType.OFFLINE_REPLACEABLE,
            creationTime: Date.now(),
            new: false,
            uuid: uuidv4()
        };
    }

    private getTypeStr(typeNum: number): string {
        for (const [key, val] of Object.entries(HomeTileType)) {
            if (val === typeNum) return key.toLowerCase();
        }
        return "map";
    }

    private getSubtypeEnum(type: string, subtype: any): number {
        if (typeof subtype === "number") return subtype;
        const subtypes = (HomeTileSubtypes as any)[type];
        if (subtypes && subtype && subtypes[subtype] !== undefined) {
            return subtypes[subtype];
        }
        return 0;
    }
}

export default new Home();
