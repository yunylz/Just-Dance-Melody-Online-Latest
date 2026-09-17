import Joi from "joi";

export const constantsJoiSchema = Joi.object({
    ChallengeMatch: Joi.object({
        CreateChallenge: Joi.object({
            wait_after_share: Joi.number().optional()
        }).optional()
    }).optional(),
    Friends: Joi.object({
        FriendListService: Joi.object({
            refresh_interval: Joi.number().optional()
        }).optional(),
        FriendsPresence: Joi.object({
            max_msg: Joi.number().optional(),
            refresh_time: Joi.number().optional()
        }).optional(),
        FriendsUGC: Joi.object({
            max_msg: Joi.number().optional(),
            refresh_time: Joi.number().optional()
        }).optional()
    }).optional(),
    Home: Joi.object({
        Fetch: Joi.object({
            during_session_tiles_count: Joi.number().optional(),
            new_session_tiles_count: Joi.number().optional(),
            played_maps_count: Joi.number().optional()
        }).optional()
    }).optional(),
    JDVersion: Joi.object({
        Override: Joi.object().optional()
    }).optional(),
    Quest: Joi.object({
        minimumScore: Joi.object({
            value: Joi.number().optional()
        }).optional(),
        questOverride: Joi.object({
            value: Joi.array().optional()
        }).optional(),
        sessionCountUntilDiscoveryKill: Joi.object({
            value: Joi.number().optional()
        }).optional(),
        sessionCountUntilFirstDiscoveryKill: Joi.object({
            value: Joi.number().optional()
        }).optional(),
        sessionCountUntilQuestKill: Joi.object({
            value: Joi.number().optional()
        }).optional()
    }).optional(),
    Subscription_Service: Joi.object({
        ECTokenFetch: Joi.object({
            retry_count: Joi.number().optional(),
            retry_interval: Joi.number().optional()
        }).optional(),
        ServerRefresh: Joi.object({
            refresh_interval: Joi.number().optional(),
            retry_interval: Joi.number().optional(),
            retry_interval_s2s: Joi.number().optional()
        }).optional()
    }).optional(),
    Unlockables: Joi.object({
        AAAMap: Joi.object({
            LockAAAMap2: Joi.number().optional(),
            considerLocking: Joi.number().optional(),
            map1: Joi.number().optional(),
            map2: Joi.string().optional()
        }).optional()
    }).optional(),
    WDF: Joi.object({
        Recap: Joi.object({
            recap_retry_interval: Joi.number().optional()
        }).optional(),
        UpdateScore: Joi.object({
            update_failure_allowance: Joi.number().optional(),
            update_score_interval: Joi.number().optional()
        }).optional()
    }).optional(),
    Wall: Joi.object({
        FriendsWall: Joi.object({
            max_msg: Joi.number().optional(),
            refresh_time: Joi.number().optional()
        }).optional()
    }).optional()
}).unknown(false);

export function toJsonSchema() {
    return {
        type: "object",
        additionalProperties: false,
        properties: {
            ChallengeMatch: {
                type: "object",
                properties: {
                    CreateChallenge: {
                        type: "object",
                        properties: {
                            wait_after_share: { type: "number" }
                        }
                    }
                }
            },
            Friends: {
                type: "object",
                properties: {
                    FriendListService: {
                        type: "object",
                        properties: {
                            refresh_interval: { type: "number" }
                        }
                    },
                    FriendsPresence: {
                        type: "object",
                        properties: {
                            max_msg: { type: "number" },
                            refresh_time: { type: "number" }
                        }
                    },
                    FriendsUGC: {
                        type: "object",
                        properties: {
                            max_msg: { type: "number" },
                            refresh_time: { type: "number" }
                        }
                    }
                }
            },
            Home: {
                type: "object",
                properties: {
                    Fetch: {
                        type: "object",
                        properties: {
                            during_session_tiles_count: { type: "number" },
                            new_session_tiles_count: { type: "number" },
                            played_maps_count: { type: "number" }
                        }
                    }
                }
            },
            JDVersion: {
                type: "object",
                properties: {
                    Override: { type: "object" }
                }
            },
            Quest: {
                type: "object",
                properties: {
                    minimumScore: {
                        type: "object",
                        properties: { value: { type: "number" } }
                    },
                    questOverride: {
                        type: "object",
                        properties: { value: { type: "array" } }
                    },
                    sessionCountUntilDiscoveryKill: {
                        type: "object",
                        properties: { value: { type: "number" } }
                    },
                    sessionCountUntilFirstDiscoveryKill: {
                        type: "object",
                        properties: { value: { type: "number" } }
                    },
                    sessionCountUntilQuestKill: {
                        type: "object",
                        properties: { value: { type: "number" } }
                    }
                }
            },
            Subscription_Service: {
                type: "object",
                properties: {
                    ECTokenFetch: {
                        type: "object",
                        properties: {
                            retry_count: { type: "number" },
                            retry_interval: { type: "number" }
                        }
                    },
                    ServerRefresh: {
                        type: "object",
                        properties: {
                            refresh_interval: { type: "number" },
                            retry_interval: { type: "number" },
                            retry_interval_s2s: { type: "number" }
                        }
                    }
                }
            },
            Unlockables: {
                type: "object",
                properties: {
                    AAAMap: {
                        type: "object",
                        properties: {
                            LockAAAMap2: { type: "number" },
                            considerLocking: { type: "number" },
                            map1: { type: "number" },
                            map2: { type: "string" }
                        }
                    }
                }
            },
            WDF: {
                type: "object",
                properties: {
                    Recap: {
                        type: "object",
                        properties: {
                            recap_retry_interval: { type: "number" }
                        }
                    },
                    UpdateScore: {
                        type: "object",
                        properties: {
                            update_failure_allowance: { type: "number" },
                            update_score_interval: { type: "number" }
                        }
                    }
                }
            },
            Wall: {
                type: "object",
                properties: {
                    FriendsWall: {
                        type: "object",
                        properties: {
                            max_msg: { type: "number" },
                            refresh_time: { type: "number" }
                        }
                    }
                }
            }
        }
    };
}
