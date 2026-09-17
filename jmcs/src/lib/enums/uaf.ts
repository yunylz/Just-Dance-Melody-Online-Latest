// =============================================================================
// CustomizableItem
// =============================================================================

export const CustomizableItemStatus = {
  LOCKED:   1,
  HIDDEN:   2,
  UNLOCKED: 3,
};

export const CustomizableItemUnlockType = {
  NONE:                        0,
  MOJO:                        1,
  DATE:                        2,
  MAP:                         3,
  WDF:                         4,
  PLAYERJOURNEY:               5,
  UPLAY:                       6,
  TOURNAMENT:                  7,
  AMIIBO:                      8,
  QUEST:                       9,
  PROGRESSION:                 10,
  WDFBOSS:                     11,
  WDFTOURNAMENTTOP1:           12,
  WDFTOURNAMENTTOP2:           13,
  WDFTOURNAMENTTOP3:           14,
  WDFTOURNAMENTPARTICIPATION:  15,
  UPLAY2:                      16,
  JDRANK:                      17,
  GACHA:                       18,
  LEGACY:                      19,
  UNLOCKEDBYDEFAULT:           20,
  OBJECTIVE:                   21,
  AVATAR_GOLD_2021_UNKNOWN:    22,
  UNKOWN:                      23,
  AVATAR_5_STARS:              24,
  AVATAR_MEGASTAR:             25,
};

export const CustomizableItemType = {
  AVATAR: 0,
  SKIN:   1,
  MAX:    2,
};


// =============================================================================
// OnlinePortraitBorder
// =============================================================================

export const OnlinePortraitBorderOriginalLockStatus = {
  ONLINE: 0,
  LOCAL:  1,
};


// =============================================================================
// Objective
// =============================================================================

export const ObjectiveType = {
  Star:                  0,
  Jewel:                 1,
  CaloriePercentage:     2,
  CalorieCount:          3,
  Score:                 4,
  GoldMoves:             6,
  SuperOrBetterMoves:    7,
  Rank:                  8,
  Versus:                9,
  PlaySpecificMap:       10,
  MapCount:              11,
  DifferentMapCount:     12,
  PlaySolo:              13,
  PlayDuo:               14,
  PlayTrio:              15,
  PlayQuatro:            16,
  AllGoldMoves:          17,
  MinimumStarSongCount:  18,
  PlayRecommendedSong:   19,
  CreatePlaylist:        30,
  PlayPlaylist:          31,
  Search:                32,
  Favourite:             34,
  OpenDancerProfile:     35,
  ChangeCustomizableItem: 36,
  UseGachaMachine:       37,
  Uplay:                 39,
  PlaySongTag:           40,
  PlayFavoriteSong:      41,
  ActivateSweatMode:     42,
  Subscribe:             44,
  LaunchSongFromHome:    45,
  ChangeAlias:           46,
  OpenVideoGallery:      47,
};

export const DifficultyColor = {
  VeryEasy_Grey:  0,
  VeryHard_Gold:  1,
  Easy_Green:     2,
  Medium_Blue:    3,
  Cyan:           4,
  Hard_Purple:    5,
};


// =============================================================================
// ChallengeMatch
// =============================================================================

export const ChallengeMatchErrorType = {
  None:                    0,
  TooManyInProgressLocal:  1,
  TooManyInProgressRemote: 2,
  MatchExistingWithUser:   3,
};

export const ChallengeMatchType = {
  Ranked:   0,
  Friendly: 1,
};

export const ChallengeMatchState = {
  InProgress:      0,
  Completed:       1,
  UpgradePending:  2,
};