import config from "../config";
import { ISku } from "../config/skus";
import SongModel from "./models/song";
import utils from "./utils";

class Packages {
    S3_FQDN: string;

    constructor() {
        this.S3_FQDN = config.S3.FQDN || "";
    };

    private buildPackageUrls(pkg: any) {
        if (!pkg || !pkg.url) return pkg;
        const p = { ...pkg };
        if (p.url.startsWith('/')) {
            p.url = this.S3_FQDN + p.url;
        }
        return p;
    }

    async getMapPackage(mapName: string, platform: ISku["platform"]) {
        if (!mapName || !platform) return null;

        const platformKey = platform.toLowerCase();
        const song = await SongModel.findOne(
            { mapName, [`packages.${platformKey}`]: { $exists: true } },
            { packages: 1 }
        ).lean() as any;

        const pkg = song?.packages?.[platformKey] || null;
        return this.buildPackageUrls(pkg);
    }

    async getSkuPackages(platform: ISku["platform"], jmcsEnv?: string, isPatreon?: boolean) {
        if (!platform) return {};

        const platformKey = platform.toLowerCase();

        // Build env filter — prod: published only, dev: unpublished only
        const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
        const patreonFilter = utils.getPatreonSongFilter(isPatreon);
        const combinedFilter = { ...envFilter, ...patreonFilter };

        const songs = await SongModel.find(
            {
                [`packages.${platformKey}`]: { $exists: true },
                ...combinedFilter,
            },
            { mapName: 1, packages: 1 }
        )
            .sort({ mapName: 1 })
            .lean() as any[];

        return songs.reduce((acc, song) => {
            const pkg = song.packages[platformKey];
            acc[`${song.mapName}_mapContent`] = this.buildPackageUrls(pkg);
            return acc;
        }, {} as Record<string, any>);
    }
};

export default new Packages();