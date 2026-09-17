import { getBaseUrl } from './jmcs';

/**
 * Utility function to get the best available thumbnail URL for a song.
 * @param song The song object containing assets metadata.
 * @returns The thumbnail URL or null if none found.
 */
export function getSongThumbnail(song: any) {
    if (!song || !song.assets) return null;

    const isValid = (url: any) =>
        url && typeof url === "string" && !url.endsWith("/");

    const nx = song.assets.nx || {};
    const pc = song.assets.pc || {};
    const ps4 = song.assets.ps4 || {};
    const wiiu = song.assets.wiiu || {};

    // Try a wide range of possible image fields, prioritizing higher quality/newer ones
    const rawUrl = [
        song.assets.cover640ImageUrl,
        song.assets.phoneCoverImageUrl,
        nx.phoneCoverImageUrl,
        pc.phoneCoverImageUrl,
        ps4.phoneCoverImageUrl,
        wiiu.phoneCoverImageUrl,
    ].find(isValid);

    return rawUrl ? resolveUrl(rawUrl) : null;
}

/**
 * Resolves a URL from the song database to a browser-ready URL.
 */
export function resolveUrl(url: string) {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const baseUrl = getBaseUrl();

    // Handle jmcs:// protocol
    if (url.startsWith('jmcs://jd-contents/')) {
        return `${baseUrl}/public/${url.substring(19)}`;
    }

    // Handle absolute paths
    if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
    }

    return url;
}
