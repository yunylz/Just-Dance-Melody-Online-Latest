const axios = require("axios");
const config = require("../config");
const { createLogger } = require("./logger");
const logger = createLogger({ service: "ubiservices-lib" });

class Ubiservices {
    constructor() {
        this.us = axios.create({
            baseURL: config.UBISERVICES.FQDN
        });
    }

    async createSession({ version = 3, appId, authorization, body = {} }) {
        try {
            const { data } = await this.us.post(
                `/v${version}/profiles/sessions`,
                body,
                {
                    headers: {
                        Authorization: authorization,
                        "Ubi-AppId": appId
                    }
                }
            );
            return data;
        } catch (err) {
            logger.error({
                message: "Failed to create a Ubiservices session",
                details: { error: err?.response?.data ?? err.message }
            });
            throw err;
        }
    }

    async deleteSession({ version = 3, appId, usSessionId, usTicket }) {
        try {
            await this.us.delete(
                `/v${version}/profiles/sessions`,
                {
                    headers: {
                        Authorization: `Ubi_v1 t=${usTicket}`,
                        "Ubi-AppId": appId,
                        "Ubi-SessionId": usSessionId
                    }
                }
            );
        } catch (err) {
            logger.error({
                message: "Failed to delete a Ubiservices session",
                details: { usSessionId, error: err?.response?.data ?? err.message }
            });
            throw err;
        }
    }
}

module.exports = new Ubiservices();