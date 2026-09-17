const config = require("../config");
const platforms = require("../data/platforms");

/**
 * Utility functions
 */
class Utils {
    constructor() {
        this.TITLES = require("../data/wiiu.json");
    }

    /**
     * Is the server in a development environment? (dev, dev-docker)
     * @returns {boolean}
     */
    isDev() {
        return ["dev", "dev-docker"].includes(process.env.NODE_ENV);
    };

    /**
     * Is the server in a local environment? (local, local-docker)
     * @returns {boolean}
     */
    isLocal() {
        return ["local", "local-docker"].includes(process.env.NODE_ENV.toLowerCase());
    };

    /**
     * Get the platform type from a platform ID
     * @param {string} platform 
     * @returns {string}
     */
    getPlatformType(platform = "ps3") {
        let value = Object.values(platforms).find(p => p.id === platform)?.platformType;
        if (value) return value;
        else return platform;
    }

    isJDTitleId(titleId) {
        const titleIds = this.TITLES.map(t => t.TitleId.toLowerCase());
        return titleIds.includes(titleId.toLowerCase());
    };

    getJmcsFqdnData(jmcsEnv = "prod", jmcsInName = true) {
        const jmcsFqdn = config.JMCS.ENVS[jmcsEnv.toUpperCase()];
        return {
            name: jmcsInName ? `JMCS ${jmcsEnv.toUpperCase()}` : `${jmcsEnv.toUpperCase()}`,
            url: jmcsFqdn
        }
    };
};

module.exports = new Utils();