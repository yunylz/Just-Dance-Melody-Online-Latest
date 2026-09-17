const axios = require("axios");
const crypto = require("node:crypto");

class Pretendo {
    constructor({ clientId, clientSecret, bearerToken }) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.token = bearerToken;
        this.headers = {
            "Accept": "*/*",
            "Accept-Language": "en",
            "Authorization": `Bearer ${this.token}`,
            "X-Nintendo-Client-ID": this.clientId,
            "X-Nintendo-Client-Secret": this.clientSecret
        }
        this.FQDN = "https://account.pretendo.cc";
    };

    getRandomCert() {
        return crypto.randomBytes(32).toString("base64")
    };

    async getMe() {
        const randomCert = this.getRandomCert();
        try {
            const { data } = await axios.get(`${this.FQDN}/v1/api/people/@me/profile`, {
                headers: {
                    ...this.headers,
                    "X-Nintendo-Device-Cert": randomCert
                }
            });
            return data;
        } catch (error) {
            console.error("Failed to get user:", error.message);
            return null;
        }
    };
};

module.exports = Pretendo;