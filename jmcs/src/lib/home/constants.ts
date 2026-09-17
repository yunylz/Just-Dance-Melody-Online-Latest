export const HomeTileType = {
    MAP: 0,
    PLAYLIST: 1,
    NEWS: 2,
    VIDEO: 3,
    FEEDBACK: 4,
    UPLAY: 5,
    JDU_COUNTDOWN: 6,
    JDU_TRIAL: 7,
    OFFLINE_GENERATION: 8,
    OFFLINE_REPLACEABLE: 14
} as const;

export const HomeTileSubtypes = {
    /**
     * 		SERIALIZE_ENUM_VAR(MapTileType_Recommended);
			SERIALIZE_ENUM_VAR(MapTileType_JDUExclusive);
            SERIALIZE_ENUM_VAR(MapTileType_JDUIncentive);
            SERIALIZE_ENUM_VAR(MapTileType_LocalTrack);
			SERIALIZE_ENUM_VAR(MapTileType_OnlineTypes_End);
			SERIALIZE_ENUM_VAR(MapTileType_SkuMapUnlock);
			SERIALIZE_ENUM_VAR(MapTileType_SkuRandom);
     */
    map: {
        recommended: 0,
        jduExclusive: 1,
        jduIncentive: 2,
        localTrack: 3,
        onlineTypesEnd: 4,
        skuMapUnlock: 5,
        skuRandom: 6
    },
    playlist: {
        recommended: 0,
        curated: 1,
        topPlayed: 2,
        WCQualification: 3
    },
    news: {
        news: 0,
        gameEvents: 1,
        IRLEvents: 2,
        WCEvents: 3,
        Tips: 4,
        WCWinnerAnnounce: 5,
        LBChallengeWinner: 6
    },
    video: {
        community: 0,
        marketing: 1
    },
    uplay: {
        login: 0,
        rewardAvailable: 1,
        actionPerformed: 2
    }
} as const;

export const HomeTileClass = {
    HomeData: "HomeService::HomeData",
    HomeTile: "HomeService::HomeTile",
    MapTileInfo: "HomeService::MapTileInfo",
    PlaylistTileInfo: "HomeService::PlaylistTileInfo",
    NewsTileInfo: "HomeService::NewsTileInfo",
    VideoTileInfo: "HomeService::VideoTileInfo",
    UplayTileInfo: "HomeService::UplayTileInfo",
    FeedbackTileInfo: "HomeService::FeedbackTileInfo"
} as const;
