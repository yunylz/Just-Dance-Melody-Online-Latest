export const INVALID_BODY = {
    message: "The request body is invalid.",
    code: 1,
    status: 400
};
export const INVALID_HEADERS = {
    message: "The request headers are invalid.",
    code: 2,
    status: 400
};
export const INVALID_QUERY = {
    message: "The query parameters are invalid.",
    code: 3,
    status: 400
};
export const UNAUTHORIZED = {
    message: "You are not authorized to perform this action.",
    code: 4,
    status: 401
};
export const FORBIDDEN = {
    message: "Access to this resource is forbidden.",
    code: 5,
    status: 403
};
export const INVALID_PARAMS = {
    message: "One or more parameters are invalid.",
    code: 6,
    status: 400
};
export const INTERNAL_SERVER_ERROR = {
    message: "An unexpected server error occurred. Please try again later.",
    code: 7,
    status: 500
};
export const INVALID_CREDENTIALS = {
    message: "The provided credentials are invalid.",
    code: 8,
    status: 401
};
export const SESSION_EXPIRED = {
    message: "Your session has expired. Please log in again.",
    code: 9,
    status: 401
};
export const AUTH_REQUIRED = {
    message: "Authorization is required to access this resource.",
    code: 10,
    status: 401
};
export const TAMPERED_TOKEN = {
    message: "The authentication token is invalid or has been tampered with. This attempt has been logged.",
    code: 11,
    status: 401
};
export const SONG_NOT_FOUND = {
    message: "The requested song could not be found.",
    code: 12,
    status: 404
};
export const PLATFORM_NOT_FOUND = {
    message: "The requested platform could not be found.",
    code: 13,
    status: 404
};
export const PROFILE_NOT_FOUND = {
    message: "The requested profile could not be found.",
    code: 14,
    status: 404
};
export const INACTIVE_ACCOUNT = {
    message: "The account is inactive. Please contact DanceParty Support for more information.",
    code: 15,
    status: 403
};
export const LOCKED_ACCOUNT = {
    message: "The account is locked. Please contact DanceParty Support for more information.",
    code: 16,
    status: 403
};
export const BANNED_ACCOUNT = {
    message: "The account is banned. Please contact DanceParty Support for more information.",
    code: 17,
    status: 403
};
export const INVALID_TOKEN_FORMAT = {
    message: "The provided token format is invalid.",
    code: 18,
    status: 400
};
export const GENERIC_AUTH_ERROR = {
    message: "Invalid credentials or user not found.",
    code: 19,
    status: 401
};
export const RATE_LIMITED = {
    message: "Too many requests. Please try again later.",
    code: 20,
    status: 429
};
export const TOKEN_EXPIRED = {
    message: "The provided token has expired.",
    code: 21,
    status: 400
};
export const ACCOUNT_NOT_ELIGIBLE = {
    message: "This account is not eligible for this action.",
    code: 22,
    status: 403
};
export const DUPLICATE_REQUEST = {
    message: "A similar request is already being processed.",
    code: 23,
    status: 409
};
export const VERIFICATION_PENDING = {
    message: "Account verification is still pending. Please check your email.",
    code: 24,
    status: 202
};
export const MAINTENANCE_MODE = {
    message: "The service is currently under maintenance. Please try again later.",
    code: 25,
    status: 503
};
export const FEATURE_DISABLED = {
    message: "This feature is currently disabled.",
    code: 26,
    status: 503
};
export const INVALID_NAME_FORMAT = {
    message: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    code: 27,
    status: 400
};
export const INVALID_COUNTRY = {
    message: "Please select a valid country.",
    code: 28,
    status: 400
};
export const UPDATE_REQUIRED = {
    message: "At least one field must be provided for update.",
    code: 29,
    status: 400
};
export const ADMIN_ONLY = {
    message: "This action is only available to administrators.",
    code: 30,
    status: 403
};
export const MOD_ONLY = {
    message: "This action is only available to moderators.",
    code: 31,
    status: 403
};
export const USER_NOT_BANNED = {
    message: "This user is not banned. Can't unban.",
    code: 32,
    status: 403
};
export const TOO_MANY_AUTH_ATTEMPTS = {
    message: "Too many login attempts. Please try again later.",
    code: 33,
    status: 429
};
export const INVALID_REQUEST = {
    message: "The request is invalid. Please contact DanceParty Support if you think this is a mistake.",
    code: 34,
    status: 400
};
export const SONG_CANT_BE_UPDATED = {
    message: "The song can't be updated. Please check logs for more information.",
    code: 35,
    status: 400
};
export const SONG_CANT_BE_CREATED = {
    message: "The song can't be created. Please check logs for more information.",
    code: 36,
    status: 400
};
export const SONG_CANT_BE_DELETED = {
    message: "The song can't be deleted. Please check logs for more information.",
    code: 37,
    status: 400
};
export const SONG_ALREADY_EXISTS = {
    message: "The song already exists. Please check logs for more information.",
    code: 38,
    status: 400
};
export const SKU_REQUIRED = {
    message: "A Sku ID is required for this action.",
    code: 39,
    status: 400
};
export const SKU_INVALID = {
    message: "The provided SKU ID is invalid.",
    code: 40,
    status: 400
};
export const TICKET_EXPIRED = {
    message: "The provided ticket has expired.",
    code: 41,
    status: 401
};
export const SKU_APP_ID_MISMATCH = {
    message: "The provided SKU App ID does not match the ticket App ID.",
    code: 42,
    status: 401
};
export const SESSION_REQUIRED = {
    message: "A session is required for this action.",
    code: 43,
    status: 401
};
export const SCRIPT_NOT_FOUND = {
    message: "The requested script does not exist.",
    code: 44,
    status: 404
};
export const SCRIPT_ACTION_NOT_FOUND = {
    message: "The requested action does not exist on this script.",
    code: 45,
    status: 404
};

export const CANT_CREATE_SESSION = {
    message: "Cannot create session. Please check logs for more information.",
    code: 46,
    status: 400
};

export const MAP_ALREADY_FAVORITED = {
    message: "This map is already in your favorites.",
    code: 47,
    status: 409
};

export const MAP_NOT_FAVORITED = {
    message: "This map is not in your favorites.",
    code: 48,
    status: 404
};

export const SCORE_NOT_FOUND = {
    message: "No score entry found for this map.",
    code: 49,
    status: 404
};

export const ALIAS_ALREADY_UNLOCKED = {
    message: "This alias is already unlocked.",
    code: 50,
    status: 409
};

export const ALIAS_NOT_FOUND = {
    message: "This alias was not found on the profile.",
    code: 51,
    status: 404
};

export const CONTENT_AUTH_NOT_FOUND = {
    message: "Content authorization not found.",
    code: 52,
    status: 404
};

export const CHEAT_DETECTED = {
    message: "Cheating is not allowed. This attempt was logged for further investigation.",
    code: 53,
    status: 403
};

export const SKU_ROUTE_MISMATCH = {
    message: "This SKU has no access to this route. Please try again later.",
    code: 54,
    status: 403
};

export const UNKNOWN_LEADERBORD_TYPE = {
    message: "Unknown leaderboard type. Please try again later.",
    code: 55,
    status: 400
};

export const BACKOFFICE_ONLY = {
    message: "This route is only available for Backoffice. This attempt was logged for further investigation.",
    code: 56,
    status: 403
};

export const NOT_FOUND = {
    message: "Not Found",
    code: 57,
    status: 404
};

export const BAD_REQUEST = {
    message: "Bad Request",
    code: 58,
    status: 400
};

export const INVALID_PAIRING_CODE = {
    message: "Invalid pairing code. Please provide a valid pairing code.",
    code: 59,
    status: 400
};

export const SESSION_NOT_FOUND = {
    message: "Session not found.",
    code: 60,
    status: 404
};

export const ALIAS_CANT_BE_UPDATED = {
    message: "The alias can't be updated. Please check logs for more information.",
    code: 61,
    status: 400
};

export const PLAYLIST_CANT_BE_UPDATED = {
    message: "The playlist can't be updated. Please check logs for more information.",
    code: 62,
    status: 400
};

export const INVALID_S2S_TOKEN = {
    message: "The provided S2S token is invalid or missing.",
    code: 63,
    status: 401
};

export const ENVIRONMENT_MISMATCH = {
    message: "Nice try. Ticket environment and JMCS environment does not match. This attempt was logged for further investigation.",
    code: 64,
    status: 401
};

// ─── UGC error codes (65-79) ─────────────────────────────────────────────────

export const UGC_INVALID_TYPE = {
    message: "The provided UGC type is invalid.",
    code: 65,
    status: 400
};

export const UGC_MISSING_FIELDS = {
    message: "Required fields are missing for this UGC type.",
    code: 66,
    status: 400
};

export const UGC_INVALID_CONTENT = {
    message: "UGC content is invalid or missing required mimetypes.",
    code: 67,
    status: 400
};

export const UGC_NOT_FOUND = {
    message: "The requested UGC entry was not found.",
    code: 68,
    status: 404
};

export const UGC_ALREADY_DELETED = {
    message: "This UGC entry has already been deleted.",
    code: 69,
    status: 404
};

export const UGC_NOT_OWNER = {
    message: "You do not own this UGC entry.",
    code: 70,
    status: 403
};

export const UGC_PROFILE_REQUIRED = {
    message: "A dancer profile is required to create this UGC type.",
    code: 71,
    status: 403
};

export const UGC_CONFIRMATION_NOT_PENDING = {
    message: "This UGC entry does not have a pending confirmation.",
    code: 72,
    status: 400
};

export const UGC_ALREADY_LIKED = {
    message: "You have already liked this UGC entry.",
    code: 73,
    status: 403
};

export const UGC_NOT_LIKED = {
    message: "You have not liked this UGC entry.",
    code: 74,
    status: 403
};

export const UGC_NOT_FEATURED = {
    message: "This UGC entry is not featured.",
    code: 75,
    status: 403
};

export const UGC_NO_CONTENT = {
    message: "This UGC entry has no content to moderate.",
    code: 76,
    status: 404
};

export const UGC_VIEW_QUERY_DISABLED = {
    message: "UGC view queries are currently disabled.",
    code: 77,
    status: 503
};

// ─── Challenge Match error codes (78-85) ─────────────────────────────────────

export const MATCH_NOT_FOUND = {
    message: "The requested match was not found.",
    code: 78,
    status: 404
};

export const MATCH_NOT_PARTICIPANT = {
    message: "You are not a participant in this match.",
    code: 79,
    status: 403
};

export const MATCH_INVALID_STATE = {
    message: "The match is not in the expected state for this action.",
    code: 80,
    status: 400
};

export const MATCH_UNAUTHORIZED_ROUND = {
    message: "You are not authorized to finalize this round.",
    code: 81,
    status: 403
};

export const MATCH_TOO_MANY_INPROGRESS = {
    message: "Too many matches in progress.",
    code: 82,
    status: 409
};

export const MATCH_EXISTING_WITH_USER = {
    message: "A match already exists with this player.",
    code: 83,
    status: 409
};

export const GUEST_NOT_ALLOWED = {
    message: "Guest accounts are not allowed on this route.",
    code: 84,
    status: 403
};