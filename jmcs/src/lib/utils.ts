import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import countries from "../config/countries";

class Utils {
    constructor() { }

    /**
     * Returns true if the current environment is a development environment (local, dev, or docker).
     * @returns {boolean} True if in development environment, false otherwise.
     */
    isDev(): boolean {
        return ["local", "dev", "docker"].includes((process.env.NODE_ENV || "local").toLowerCase());
    }

    /**
     * Returns true if the jmcsEnv from a ticket is a development environment.
     * @param jmcsEnv The environment string from the ticket (e.g. "dev" or "prod").
     * @returns {boolean}
     */
    isJmcsEnvDev(jmcsEnv?: string): boolean {
        return jmcsEnv === "dev";
    }

    /**
     * Returns true if the jmcsEnv from a ticket is a production environment.
     * @param jmcsEnv The environment string from the ticket (e.g. "dev" or "prod").
     * @returns {boolean}
     */
    isJmcsEnvProd(jmcsEnv?: string): boolean {
        return jmcsEnv !== "dev";
    }

    /**
     * Builds a MongoDB filter for songs based on the jmcsEnv.
     * In prod: only published songs (releaseDate set).
     * In dev: only unpublished/draft songs (no releaseDate).
     * @param jmcsEnv The environment string from the ticket.
     * @returns A MongoDB filter object, or empty object if no filtering needed.
     */
    getJmcsEnvSongFilter(jmcsEnv?: string): Record<string, any> {
        if (this.isJmcsEnvProd(jmcsEnv)) {
            // Production: only published songs
            return { releaseDate: { $ne: "" } };
        }
        // Development: only unpublished/draft songs
        return {
            $or: [
                { releaseDate: { $exists: false } },
                { releaseDate: "" }
            ]
        };
    }

    /**
     * Builds a MongoDB filter for songs based on the user's patreon status.
     * Non-patreon users should not see patreon-only songs.
     * Patreon users see all songs (no filter).
     * @param isPatreon Whether the requesting user has patreon access.
     * @returns A MongoDB filter object, or empty object if no filtering needed.
     */
    getPatreonSongFilter(isPatreon?: boolean): Record<string, any> {
        // Patreon users see all songs (regular + patreon), so no filter.
        if (isPatreon) return {};
        return { isPatreon: { $ne: true } };
    }

    /**
     * Returns true if the current environment is a local environment (local or local-docker).
     * @returns {boolean} True if in local environment, false otherwise.
     */
    isLocal(): boolean {
        return ["local", "local-docker"].includes((process.env.NODE_ENV || "local").toLowerCase());
    };

    /**
     * Checks if the provided IP address is a local IP address.
     * @param ip IP address to check
     * @returns {Boolean}
     */
    isLocalIp(ip: string | undefined): boolean {
        if (!ip) return false;
        return ip.startsWith("127.0.0.1") || ip.startsWith("192.168.0.");
    }

    /**
     * Strips ANSI escape codes from a string, which are often used for coloring console output.
     * @param str The input string potentially containing ANSI codes.
     * @returns The cleaned string without ANSI codes.
     */
    stripAnsi(str: string): string {
        return str.replace(/\u001b\[[0-9;]*m/g, "");
    }

    /**
     * Converts an array of items with an 'Id' property into a map/object keyed by that 'Id'.
     * @param items Array of items, each expected to have an 'Id' property.
     * @returns An object where each key is the 'Id' of an item and the value is the item itself.
     */
    toMap(items: any[]) {
        return Object.fromEntries(items.map(item => [item.Id, item]));
    }

    /**
     * Checks if a file exists at the given path. Used to ensure that the SongDb file exists before attempting to read it.
     * @param dbPath The file path to check for existence.
     * @returns An object indicating whether the file exists or not.
     */
    ensureDbExists(dbPath: string): { exists: boolean } {
        if (!existsSync(path.resolve(dbPath))) {
            return { exists: false }
        } else {
            return { exists: true }
        }
    };

    /**
     * Utility functions to get country information by different identifiers. These can be used when processing song metadata that includes country-specific information, such as release restrictions or popularity data. The country data is loaded from a configuration file and can be accessed by country ID, name, or code.
     * @param id The unique identifier for the country (default is 8521, which could represent a specific country in the dataset).
     * @param name The name of the country (default is "United States").
     * @param code The ISO code of the country (default is "US").
     * @returns An object containing country information, or undefined if not found.
     */
    getCountryById(id = 8521) {
        return countries.find(country => country.id === id);
    };

    /**
     * Gets country information by name.
     * @param name The name of the country.
     * @returns An object containing country information, or undefined if not found.
     */
    getCountryByName(name = "United States") {
        return countries.find(country => country.name === name);
    };

    /**
     * Gets country information by ISO code.
     * @param code The ISO code of the country.
     * @returns An object containing country information, or undefined if not found.
     */
    getCountryByCode(code = "US") {        // ← this line was missing
        return countries.find(country => country.code === code);
    };

    /**
     * Converts given color hex to UbiArt format: RRGGBBAA
     * @param color Color hex
     */
    toUAFColors(color: string = "#ffffffff") {
        const hex = color.replace("#", "");
        if (hex.length === 6) {
            return (hex + "ff").toUpperCase();
        }
        return hex.toUpperCase();
    }

    /**
     * Converts a UbiArt-format color (RRGGBBAA or RRGGBB) to standard CSS hex (#RRGGBB).
     * Strips the alpha channel and prepends #.
     * @param color Color in UAF format (e.g. "CF61EEFF" or "CF61EE")
     */
    fromUAFColors(color: string = "#ffffffff") {
        const hex = color.replace("#", "").toUpperCase();
        if (hex.length >= 8) {
            return "#" + hex.substring(0, 6);
        }
        if (hex.length === 6) {
            return "#" + hex;
        }
        return "#" + hex.padEnd(6, "0").substring(0, 6);
    }

    getProjectVersion() {
        const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
        return pkg.version;
    }
}

export default new Utils();