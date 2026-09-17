import SongModel from "./models/song";
import utils from "./utils";
import s3 from "./s3";

class ContentAuth {
    constructor() { };

    /**
     * Extract private URLs from a song's `urls` map and return them as signed URLs.
     * A URL value is "private" when its path starts with "/private".
     */
    private extractPrivateUrls(songUrls: Record<string, string>): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(songUrls)) {
            if (value && value.startsWith("/private")) {
                // Strip leading slash — getSignedDownloadUrl prepends the FQDN
                result[key] = s3.getSignedDownloadUrl(value.slice(1));
            }
        }
        return result;
    }

    async getMapContentAuth(mapName: string, jmcsEnv?: string, isPatreon?: boolean): Promise<any> {
        const envFilter = jmcsEnv ? utils.getJmcsEnvSongFilter(jmcsEnv) : {};
        const patreonFilter = utils.getPatreonSongFilter(isPatreon);
        const combinedFilter = { ...envFilter, ...patreonFilter };
        const song = await SongModel.findOne({ mapName, ...combinedFilter }).select({ urls: 1, mapName: 1, mapLength: 1 }).lean();
        if (!song || !song.urls) return null;

        const urls = this.extractPrivateUrls(song.urls as Record<string, string>);
        if (Object.keys(urls).length === 0) return null;

        return { mapName, mapLength: song.mapLength , urls };
    };
};

export default new ContentAuth();