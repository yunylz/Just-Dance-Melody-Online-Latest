import axios from "axios";

import config from "../config";
import { createLogger } from "./logger";

const logger = createLogger({ service: "hub-helper" });

class HubHelper {
    private client;

    constructor() {
        this.client = axios.create({
            baseURL: config.HUB.FQDN,
            headers: {
                Authorization: `Bearer ${config.HUB.S2S_TOKEN}`
            }
        });
    };

    async getUser(userId = "") {
        try {
            const user = await this.client.get(`/users/v1`, {
                params: { userId }
            });
            const users = user.data;
            if (users && users.length > 0) return users[0];
            return null;
        } catch (error: any) {
            logger.error({
                message: "Failed to get user from Hub",
                details: {
                    userId,
                    error: error?.response?.data || error
                }
            });
            return null;
        }
    };

    async gatherProfiles(userIds = [], platform = "ps4") {
        const profiles = [];

        for (const userId of userIds) {
            try {
                const profile = await this.client.get(`/users/v1/${userId}/profiles/${platform}`)
                if (profile && profile.data && profile.data.profileId) profiles.push(profile.data);
            } catch (error: any) {
                // logger.error({
                //     message: "Failed to get profile from Hub",
                //     details: {
                //         userId,
                //         error: error?.response?.data || error
                //     }
                // });
                continue;
            }
        }

        return profiles;
    };

    async getFriends(userId = "", platform = "ps4") {
        try {
            const user = await this.getUser(userId);
            if (!user) return [];
            const friends = user.friends || [];

            const friendsProfiles = await this.gatherProfiles(friends, platform);

            return friendsProfiles.map((profile: any) => profile?.profileId);
        }
        catch (error: any) {
            logger.error({
                message: "Failed to get friends from Hub",
                details: {
                    userId,
                    error: error?.response?.data || error
                }
            });
            return [];
        }
    };
}

export default new HubHelper();