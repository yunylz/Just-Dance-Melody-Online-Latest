const config = require("../config");

const WII_EPOCH = 946684800;

class Utils {
    constructor() {
        this.countries = require("../data/countries");
    }

    isDev() {
        return ["local", "dev", "docker"].includes(process.env.NODE_ENV.toLowerCase());
    }

    isLocal() {
        return ["local", "local-docker"].includes(process.env.NODE_ENV.toLowerCase());
    }

    fixScore(score = 0.405333) {
        return parseInt(score * 13333);
    }

    calculateStars(score = 0.405333) {
        const fixedScore = this.fixScore(score);
        return parseInt(fixedScore / 2000);
    }

    getCountryById(countryId = 8521) {
        return this.countries.filter(c => c.id === countryId)[0];
    }

    getCountryByCode(code = "US") {
        return this.countries.filter(c => c.code === code?.toUpperCase())[0];
    }

    getDefaultCountry() {
        return this.countries.filter(c => c.id === 9627)[0];
    }

    getFqdn() {
        if (config.IS_CLOUDFLARE) return config.FQDN;
        else return `${config.IS_HTTPS ? "https" : "http"}://${config.HOSTNAME}:${config.PORT}`;
    }
};

module.exports = new Utils();