import Joi from "joi";
import { constantsJoiSchema } from "./schemas/constants.schema";

const constantProvider_v1 = {
    "/constant-provider/v1/sku-constants": {
        POST: {
            body: constantsJoiSchema
        }
    },
}

const songDb_v1 = {
    "/songdb/v1/songs/:mapName": {
        PUT: {
            body: Joi.object({
                title: Joi.string().optional(),
                artist: Joi.string().optional(),
                originalJDVersion: Joi.number().optional(),
                coachCount: Joi.number().optional(),
                difficulty: Joi.number().optional(),
                sweatDifficulty: Joi.number().optional(),
                songColor1A: Joi.string().optional(),
                songColor1B: Joi.string().optional(),
                songColor2A: Joi.string().optional(),
                songColor2B: Joi.string().optional(),
                lyricsColor: Joi.string().optional(),
                lyricsType: Joi.number().optional(),
                mode: Joi.number().optional(),
                status: Joi.number().optional(),
                tags: Joi.array().optional(),
                customTypeNameId: Joi.number().optional(),
                mapLength: Joi.number().optional(),
                assets: Joi.object().optional(),
                packages: Joi.object().optional(),
                urls: Joi.object().optional(),
                audioPreviewData: Joi.alternatives().try(
                    Joi.string(),
                    Joi.object()
                ).optional(),
                credits: Joi.string().allow("").optional(),
                mapPreviewMpd: Joi.string().optional(),
                serverChangelist: Joi.number().default(0).optional(),
                searchTagsLocIds: Joi.array().default([]).optional(),
                bannerTheme: Joi.string().allow("").default("").optional(),
                releaseDate: Joi.string().isoDate().allow("").optional(),
                isPatreon: Joi.boolean().default(false).optional()
            }).unknown(false)
        },
        POST: {
            body: Joi.object({
                title: Joi.string().optional(),
                artist: Joi.string().optional(),
                originalJDVersion: Joi.number().optional(),
                coachCount: Joi.number().optional(),
                difficulty: Joi.number().optional(),
                sweatDifficulty: Joi.number().optional(),
                songColor1A: Joi.string().optional(),
                songColor1B: Joi.string().optional(),
                songColor2A: Joi.string().optional(),
                songColor2B: Joi.string().optional(),
                lyricsColor: Joi.string().optional(),
                lyricsType: Joi.number().optional(),
                mode: Joi.number().optional(),
                status: Joi.number().optional(),
                tags: Joi.array().optional(),
                customTypeNameId: Joi.number().optional(),
                mapLength: Joi.number().optional(),
                assets: Joi.object().optional(),
                packages: Joi.object().optional(),
                urls: Joi.object().optional(),
                audioPreviewData: Joi.alternatives().try(
                    Joi.string(),
                    Joi.object()
                ).optional(),
                credits: Joi.string().allow("").optional(),
                mapPreviewMpd: Joi.string().optional(),
                serverChangelist: Joi.number().default(0).optional(),
                searchTagsLocIds: Joi.array().default([]).optional(),
                bannerTheme: Joi.string().allow("").default("").optional(),
                releaseDate: Joi.string().isoDate().allow("").optional(),
                isPatreon: Joi.boolean().default(false).optional()
            }).unknown(false)
        }
    },
    "/songdb/v1/tags": {
        POST: {
            body: Joi.object({
                name: Joi.string().required(),
                color: Joi.string().optional(),
                description: Joi.string().allow("").optional()
            }).unknown(false)
        }
    }
}

const gameSchema = Joi.object({
    publicIp: Joi.string().required(),
    pairingInfo: Joi.object({
        protocol: Joi.string().valid("v2.phonescoring.jd.ubisoft.com").required(),
        pairingUrl: Joi.string().required(),
        tlsCertificate: Joi.string().required(),
        titleId: Joi.string().required(),
        displayName: Joi.string().required()
    }).required(),
    populations: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            object: Joi.string().required(),
            spaceId: Joi.string().uuid().required(),
            subject: Joi.string().required()
        })
    ).default([])
}).unknown(false);

const companionSchema = Joi.object({
    mobileInfo: Joi.object({
        language: Joi.string().required(),
        deviceId: Joi.string().guid().required(),
        firstPartyToken: Joi.string().required(),
        platform: Joi.string().valid("ios", "android").required()
    }).required()
}).unknown(false);

const sessions_v1 = {
    "/sessions/v1/session": {
        POST: {
            body: Joi.alternatives().try(
                gameSchema,
                companionSchema
            )
        }
    },
    "/sessions/v1/pairing-info": {
        GET: {
            query: Joi.object({
                code: Joi.string().required()
            })
        }
    }
};

const subscription_v1 = {
    "/subscription/v1/refresh": {
        POST: {
            body: Joi.object({
                deviceId: Joi.string().optional(),
                accessToken: Joi.string().optional()
            }).unknown(true)
        }
    }
}

const profile_v1 = {
    "/profile/v1/profiles": {
        POST: {
            body: Joi.object({
                name: Joi.string().required(),
                avatar: Joi.number().integer().required(),
                country: Joi.number().integer().required(),
                wdfRank: Joi.number().integer().required(),
                stars: Joi.number().integer().required(),
                unlocks: Joi.number().integer().required(),
                songsPlayed: Joi.number().integer().required(),
                progression: Joi.object().required(),
                scores: Joi.object().pattern(Joi.string(), Joi.object({
                    highest: Joi.number().integer().optional(),
                    isCoopHighscore: Joi.boolean().optional(),
                    timesPlayed: Joi.number().integer().optional(),
                    ugcId: Joi.string().optional()
                })).optional(),
                nickname: Joi.string().optional(),
                skin: Joi.number().integer().optional(),
                alias: Joi.number().integer().optional(),
                aliasGender: Joi.number().integer().optional(),
                portraitBorder: Joi.number().integer().optional(),
                jdPoints: Joi.number().integer().optional(),
                favorites: Joi.array().items(Joi.string()).optional(),
                unlockedAvatars: Joi.array().items(Joi.number().integer()).optional(),
                unlockedSkins: Joi.array().items(Joi.number().integer()).optional(),
                unlockedPortraitBorders: Joi.array().items(Joi.number().integer()).optional(),
                diamondPoints: Joi.number().integer().optional(),
                platformId: Joi.string().allow("").optional(),
                populations: Joi.array().optional(),
            }).unknown(true)
        }
    },
    "/profile/v1/filter-players": {
        POST: {
            body: Joi.array().items(Joi.string()).max(1000).required()
        }
    }
}

const profile_v2 = {
    "/profile/v2/profiles": {
        POST: {
            body: Joi.object({
                name: Joi.string().required(),
                avatar: Joi.number().integer().required(),
                country: Joi.number().integer().required(),
                wdfRank: Joi.number().integer().required(),
                stars: Joi.number().integer().required(),
                unlocks: Joi.number().integer().required(),
                songsPlayed: Joi.number().integer().required(),
                progression: Joi.object().required(),
                scores: Joi.object().pattern(Joi.string(), Joi.object({
                    highest: Joi.number().integer().optional(),
                    isCoopHighscore: Joi.boolean().optional(),
                    timesPlayed: Joi.number().integer().optional(),
                    ugcId: Joi.string().optional()
                })).optional(),
                nickname: Joi.string().optional(),
                skin: Joi.number().integer().optional(),
                alias: Joi.number().integer().optional(),
                aliasGender: Joi.number().integer().optional(),
                portraitBorder: Joi.number().integer().optional(),
                jdPoints: Joi.alternatives().try(
                    Joi.number().integer(),
                    Joi.object().pattern(Joi.string(), Joi.number().integer())
                ).optional(),
                diamondPoints: Joi.number().integer().optional(),
                favorites: Joi.array().items(Joi.string()).optional(),
                history: Joi.object().pattern(Joi.string(), Joi.number()).optional(),
                unlockedAvatars: Joi.array().items(Joi.number().integer()).optional(),
                unlockedSkins: Joi.array().items(Joi.number().integer()).optional(),
                unlockedPortraitBorders: Joi.array().items(Joi.number().integer()).optional(),
                unlockedAliases: Joi.array().items(Joi.number().integer()).optional(),
                stats: Joi.object().optional(),
                platformId: Joi.string().allow("").optional(),
                populations: Joi.array().optional(),
                newAccountLinkedToUplay: Joi.boolean().optional(),
            }).unknown(true)
        }
    },
    "/profile/v2/filter-players": {
        POST: {
            body: Joi.array().items(Joi.string()).max(1000).required()
        }
    },
    "/profile/v2/scores/maps/:mapName": {
        PUT: {
            body: Joi.object({
                score: Joi.number().integer().required(),
                isCoopHighscore: Joi.boolean().optional().default(false)
            }).unknown(false)
        }
    },
    "/profile/v2/map-ended": {
        POST: {
            body: Joi.array().items(
                Joi.object({
                    mapName: Joi.string().required(),
                    timestamp: Joi.number().optional(),
                    score: Joi.number().integer().required(),
                    gameMode: Joi.string().valid("CLASSIC", "KIDS", "WDF").required(),
                    nbPlayers: Joi.number().integer().optional(),
                    jduEnabled: Joi.boolean().optional(),
                    position: Joi.number().optional(),
                }).unknown(true)
            ).min(1).required()
        }
    }
};

const leaderboardCount = Joi.number().min(0).max(10).default(5).optional()
const leaderboardPlatform = Joi.string().optional()
const leaderboard_v1 = {
    "/leaderboard/v1/maps/:mapName/world": {
        GET: {
            query: Joi.object({
                count: leaderboardCount,
                platform: leaderboardPlatform
            })
        }
    },
    "/leaderboard/v1/maps/:mapName/countries/:countryId": {
        GET: {
            query: Joi.object({
                count: leaderboardCount,
                platform: leaderboardPlatform
            })
        }
    },
    "/leaderboard/v1/maps/:mapName/friends": {
        POST: {
            query: Joi.object({
                count: leaderboardCount,
                platform: leaderboardPlatform
            }),
            body: Joi.array().items(Joi.string()).min(0).required()
        }
    }
}

const content_authorization_v1 = {
    "/content-authorization/v1/maps/:mapName": {
        POST: {
            body: Joi.object({
                urls: Joi.object().pattern(Joi.string(), Joi.string()).required()
            }).unknown(false)
        }
    }
}

const homeTileInfoSchema = Joi.object({
    __class: Joi.string().required(),
    type: Joi.number().integer().required(),
}).unknown(true);

const homeTileSchema = Joi.object({
    __class: Joi.string().valid("HomeService::HomeTile").required(),
    type: Joi.number().integer().required(),
    creationTime: Joi.number().required(),
    locked: Joi.boolean().optional().default(false),
    new: Joi.boolean().optional().default(true),
    lockDuration: Joi.number().optional().default(0),
    contentExpiry: Joi.number().optional().default(0),
    uuid: Joi.string().guid().required(),
    playlistTileInfo: homeTileInfoSchema.optional(),
    mapTileInfo: homeTileInfoSchema.optional(),
    newsTileInfo: homeTileInfoSchema.optional(),
    videoTileInfo: homeTileInfoSchema.optional(),
    uplayTileInfo: homeTileInfoSchema.optional(),
    feedbackTileInfo: homeTileInfoSchema.optional(),
}).unknown(true);

const home_v1 = {
    "/home/v1/tiles": {
        POST: {
            body: Joi.object({
                tileHistory: Joi.array().items(homeTileSchema).optional().default([]),
                requestedTileCount: Joi.number().integer().min(1).max(20).optional().default(5),
                timestampLastRequest: Joi.number().optional().default(0),
                timestampLastManualContent: Joi.number().optional().default(0),
                timestampLastMapContent: Joi.number().optional().default(0),
                timestampLastVideoContent: Joi.number().optional().default(0),
                timestampLastPlaylistContent: Joi.number().optional().default(0),
                timestampLastLocalTrack: Joi.number().optional().default(0),
                uplayConnected: Joi.boolean().optional().default(false)
            }).unknown(true)
        }
    }
}

const playlistdb_v1 = {
    "/playlistdb/v1/playlists": {
        POST: {
            body: Joi.object({
                id: Joi.string().required(),
                ownerId: Joi.string().required(),
                title: Joi.string().required(),
                description: Joi.string().allow("").optional(),
                songs: Joi.array().items(Joi.object({
                    mapName: Joi.string().required(),
                    title: Joi.string().required(),
                    artist: Joi.string().required(),
                    coverUrl: Joi.string().uri().required()
                })).required(),
                isPublic: Joi.boolean().required(),
                updatedAt: Joi.string().isoDate().required()
            }).unknown(true)
        }
    },
    "/playlistdb/v1/playlists/:playlistId": {
        PUT: {
            body: Joi.object({
                title: Joi.string().optional(),
                description: Joi.string().allow("").optional(),
                songs: Joi.array().items(Joi.object({
                    mapName: Joi.string().required(),
                    title: Joi.string().required(),
                    artist: Joi.string().required(),
                    coverUrl: Joi.string().uri().required()
                })).optional(),
                isPublic: Joi.boolean().optional(),
                updatedAt: Joi.string().isoDate().optional()
            }).unknown(true)
        }
    },
    "/playlistdb/v1/users/:userId/sync": {
        POST: {
            body: Joi.object({
                playlists: Joi.array().items(Joi.object({
                    id: Joi.string().required(),
                    ownerId: Joi.string().required(),
                    title: Joi.string().required(),
                    description: Joi.string().allow("").optional(),
                    songs: Joi.array().items(Joi.object({
                        mapName: Joi.string().required(),
                        title: Joi.string().required(),
                        artist: Joi.string().required(),
                        coverUrl: Joi.string().uri().required()
                    })).required(),
                    isPublic: Joi.boolean().required(),
                    updatedAt: Joi.string().isoDate().required()
                })).required()
            }).unknown(false)
        }
    }
}

const live_v1 = {
    "/live/v1/activities/playlogs": {
        POST: {
            query: Joi.object({
                count: Joi.number().integer().min(1).max(100).default(20).optional(),
                skip: Joi.number().integer().min(0).default(0).optional()
            }),
            body: Joi.array().items(Joi.string()).min(0).required()
        }
    },
    "/live/v1/activities/feed": {
        POST: {
            query: Joi.object({
                count: Joi.number().integer().min(1).max(200).default(50).optional(),
                skip: Joi.number().integer().min(0).default(0).optional(),
                types: Joi.string().optional()  // comma-separated ActivityType values
            }),
            body: Joi.array().items(Joi.string()).min(0).required()
        }
    },
    "/live/v1/map-sessions": {
        GET: {
            query: Joi.object({
                pid: Joi.string().uuid().optional(),
                userId: Joi.string().uuid().optional()
            })
        }
    }
}

const ugc_v2 = {
    "/ugc/v2/ugcs": {
        POST: {
            body: Joi.object({
                mapName: Joi.string().required(),
                type: Joi.string().valid("ad", "st", "dm", "ch", "cr").required(),
                content: Joi.object().pattern(Joi.string(), Joi.object({
                    mimetype: Joi.string().required()
                }).unknown(true)).optional(),
                coach: Joi.number().integer().when("type", { is: "ch", then: Joi.required() }),
                device: Joi.number().integer().when("type", { is: "ch", then: Joi.required() }),
                score: Joi.number().integer().when("type", { is: "ch", then: Joi.required() }),
                moves: Joi.string().optional(),
                contest: Joi.number().integer().when("type", { is: "cr", then: Joi.required() }),
                sequence: Joi.number().integer().when("type", { is: "cr", then: Joi.required() }),
            }).unknown(true)
        }
    },
    "/ugc/v2/ugcs/:ugcId/like": {
        PUT: {
            body: Joi.object({}).unknown(true)
        },
        DELETE: {
            body: Joi.object({}).unknown(true)
        }
    },
    "/ugc/v2/ugcs/:ugcId/reports": {
        POST: {
            body: Joi.object({}).unknown(true)
        }
    },
    "/ugc/v2/ugcs/:ugcId/views": {
        POST: {
            body: Joi.object({}).unknown(true)
        }
    },
    "/ugc/v2/ugcs/:ugcId/confirmation": {
        POST: {
            body: Joi.object({}).unknown(true)
        }
    },
}

const backoffice_v1 = {
    "/backoffice/v1/profiles": {
        GET: {
            query: Joi.object({
                skip: Joi.number().integer().min(0).default(0).optional(),
                limit: Joi.number().integer().min(1).max(1000).default(500).optional()
            })
        }
    }
}

const challengeMatch_v1 = {
    "/challenge-match/v1/matches/:matchType": {
        PUT: {
            params: Joi.object({
                matchType: Joi.string().valid("ranked", "friendly").required(),
            }),
            body: Joi.object({
                ugcId: Joi.string().uuid().optional(),
                opponentPid: Joi.string().uuid().optional(),
            }).unknown(true),
        },
    },
    "/challenge-match/v1/matches/:matchId": {
        DELETE: {
            params: Joi.object({
                matchId: Joi.string().uuid().required(),
            }),
        },
    },
    "/challenge-match/v1/matches/:matchId/start-round": {
        POST: {
            params: Joi.object({
                matchId: Joi.string().uuid().required(),
            }),
            body: Joi.object({}).unknown(true),
        },
    },
    "/challenge-match/v1/matches/:matchId/finalize-round": {
        POST: {
            params: Joi.object({
                matchId: Joi.string().uuid().required(),
            }),
            body: Joi.object({
                score: Joi.number().integer().required(),
                tauntId: Joi.number().integer().required(),
            }).unknown(false),
        },
    }
}

const challenger_v1 = {
    "/challenger/v1/players/:pid/scores/:mapName/no-moderation": {
        GET: {
            params: Joi.object({
                pid: Joi.string().required(),
                mapName: Joi.string().required(),
            }),
        },
    },
    "/challenger/v1/taunts/:pid": {
        PUT: {
            params: Joi.object({
                pid: Joi.string().required(),
            }),
            body: Joi.object({
                mapName: Joi.string().required(),
                message: Joi.number().integer().required(),
                victory: Joi.number().integer().required(),
            }).unknown(true),
        },
        DELETE: {
            params: Joi.object({
                pid: Joi.string().required(),
            }),
        },
    },
}

export default {
    ...constantProvider_v1,
    ...songDb_v1,
    ...sessions_v1,
    ...subscription_v1,
    ...profile_v1,
    ...profile_v2,
    ...leaderboard_v1,
    ...content_authorization_v1,
    ...home_v1,
    ...playlistdb_v1,
    ...live_v1,
    ...ugc_v2,
    ...challengeMatch_v1,
    ...challenger_v1,
    ...backoffice_v1,
}