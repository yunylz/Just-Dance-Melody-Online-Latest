module.exports.INVALID_BODY = {
    message: "The request body is invalid.",
    code: 1,
    status: 400
};
module.exports.INVALID_HEADERS = {
    message: "The request headers are invalid.",
    code: 2,
    status: 400
};
module.exports.INVALID_QUERY = {
    message: "The query parameters are invalid.",
    code: 3,
    status: 400
};
module.exports.UNAUTHORIZED = {
    message: "You are not authorized to perform this action.",
    code: 4,
    status: 401
};
module.exports.FORBIDDEN = {
    message: "Access to this resource is forbidden.",
    code: 5,
    status: 403
};
module.exports.INVALID_PARAMS = {
    message: "One or more parameters are invalid.",
    code: 6,
    status: 400
};
module.exports.PASSWORD_TOO_WEAK = {
    message: "The provided password does not meet security requirements.",
    code: 7,
    status: 400
};
module.exports.USERNAME_OR_EMAIL_USED = {
    message: "This username or email is already in use.",
    code: 8,
    status: 400
};
module.exports.INTERNAL_SERVER_ERROR = {
    message: "An unexpected server error occurred. Please try again later.",
    code: 9,
    status: 500
};
module.exports.USER_NOT_FOUND = {
    message: "The specified user could not be found.",
    code: 10,
    status: 404
};
module.exports.INVALID_CREDENTIALS = {
    message: "The provided credentials are invalid.",
    code: 11,
    status: 401
};
module.exports.SESSION_EXPIRED = {
    message: "Your session has expired. Please log in again.",
    code: 12,
    status: 401
};
module.exports.AUTH_REQUIRED = {
    message: "Authorization is required to access this resource.",
    code: 13,
    status: 401
};
module.exports.TAMPERED_TOKEN = {
    message: "The authentication token is invalid or has been tampered with. This attempt has been logged.",
    code: 14,
    status: 401
};
module.exports.GAME_NOT_FOUND = {
    message: "The requested game could not be found.",
    code: 15,
    status: 404
};
module.exports.SONG_NOT_FOUND = {
    message: "The requested song could not be found.",
    code: 16,
    status: 404
};
module.exports.PLATFORM_NOT_FOUND = {
    message: "The requested platform could not be found.",
    code: 17,
    status: 404
};
module.exports.PROFILE_IN_USE = {
    message: "The specified profile is currently in use. Please contact JDMO Support for more information.",
    code: 18,
    status: 409
};
module.exports.USER_ALREADY_HAS_PLATFORM = {
    message: "The user already has a profile on this platform.",
    code: 19,
    status: 409
};
module.exports.PROFILE_NOT_FOUND = {
    message: "The requested profile could not be found.",
    code: 20,
    status: 404
};
module.exports.CURRENT_PASS_INVALID = {
    message: "The current password is invalid.",
    code: 21,
    status: 401
};
module.exports.PASSWORD_DONT_MATCH = {
    message: "The new password and confirmation password do not match.",
    code: 22,
    status: 400
};
module.exports.MISSING_MAC_ADDRESS = {
    message: "The MAC address is required for this platform.",
    code: 23,
    status: 400
};
module.exports.MISSING_USERNAME = {
    message: "The username is required for this platform.",
    code: 24,
    status: 400
};
module.exports.MAC_ADDRESS_IN_USE = {
    message: "The MAC address is already in use. This might be because your NAND is shared with others or it's an emulated one. Make sure your NAND is original and belongs to you.",
    code: 25,
    status: 409
};
module.exports.MAC_ADDRESS_BANNED = {
    message: "The MAC address is banned and cannot be used. This might be due to this MAC address being used by many other players, given online as stock NAND, or it's an emulated one.",
    code: 26,
    status: 403
};
module.exports.EMAIL_NOT_VERIFIED = {
    message: "The email address is not verified. A mail was sent to your email address. Please verify your email address before logging in. Check your spam folder if you don't receive the mail.",
    code: 27,
    status: 400
};
module.exports.INACTIVE_ACCOUNT = {
    message: "The account is inactive. Please contact JDMO Support for more information.",
    code: 28,
    status: 403
};
module.exports.LOCKED_ACCOUNT = {
    message: "The account is locked. Please contact JDMO Support for more information.",
    code: 29,
    status: 403
};
module.exports.BANNED_ACCOUNT = {
    message: "The account is banned. Please contact JDMO Support for more information.",
    code: 30,
    status: 403
};
module.exports.EMAIL_COOLDOWN = {
    message: "Please wait 5 minutes before requesting another email.",
    code: 31,
    status: 429
};
module.exports.EMAIL_ALREADY_VERIFIED = {
    message: "The email address is already verified. Please contact JDMO Support for more information.",
    code: 32,
    status: 400
};
module.exports.EMAIL_VERIFICATION_EXPIRED = {
    message: "The email verification link has expired. Please request a new verification email.",
    code: 33,
    status: 400
};
module.exports.EMAIL_UNKNOWN_ERROR = {
    message: "An unknown error occurred while trying to verify your email address. Please try requesting a new verification email.",
    code: 34,
    status: 400
};
module.exports.PASSWORD_UPDATE_COOLDOWN = {
    message: "Please wait 5 minutes before trying to reset your password again.",
    code: 35,
    status: 429
};
module.exports.PASSWORD_RESET_SUCCESSFUL = {
    message: "If an account with this email exists, a password reset email has been sent successfully.",
    code: 36,
    status: 200
};
module.exports.PASSWORD_RESET_EXPIRED = {
    message: "The password reset link has expired. Please request a new password reset email.",
    code: 37,
    status: 400
};
module.exports.PASSWORD_UNKNOWN_ERROR = {
    message: "An unknown error occurred while trying to reset your password. Please try requesting a new password reset email.",
    code: 38,
    status: 400
};
module.exports.INVALID_TOKEN_FORMAT = {
    message: "The provided token format is invalid.",
    code: 39,
    status: 400
};
module.exports.GENERIC_AUTH_ERROR = {
    message: "Invalid credentials or user not found.",
    code: 40,
    status: 401
};
module.exports.RATE_LIMITED = {
    message: "Too many requests. Please try again later.",
    code: 41,
    status: 429
};
module.exports.TOKEN_EXPIRED = {
    message: "The provided token has expired.",
    code: 42,
    status: 400
};
module.exports.TOKEN_ALREADY_USED = {
    message: "The provided token has already been used.",
    code: 43,
    status: 400
};
module.exports.ACCOUNT_NOT_ELIGIBLE = {
    message: "This account is not eligible for this action.",
    code: 44,
    status: 403
};
module.exports.DUPLICATE_REQUEST = {
    message: "A similar request is already being processed.",
    code: 45,
    status: 409
};
module.exports.VERIFICATION_PENDING = {
    message: "Account verification is still pending. Please check your email.",
    code: 46,
    status: 202
};
module.exports.MAINTENANCE_MODE = {
    message: "The service is currently under maintenance. Please try again later.",
    code: 47,
    status: 503
};
module.exports.FEATURE_DISABLED = {
    message: "This feature is currently disabled.",
    code: 48,
    status: 503
};
module.exports.INVALID_AGE = {
    message: "You must be at least 13 years old to register.",
    code: 49,
    status: 400
};
module.exports.INVALID_DATE_FORMAT = {
    message: "Invalid date format. Please use YYYY-MM-DD format.",
    code: 50,
    status: 400
};
module.exports.FUTURE_DATE_NOT_ALLOWED = {
    message: "Future dates are not allowed for this field.",
    code: 51,
    status: 400
};
module.exports.INVALID_NAME_FORMAT = {
    message: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    code: 52,
    status: 400
};
module.exports.INVALID_USERNAME_FORMAT = {
    message: "Username can only contain English letters and numbers (4-12 characters).",
    code: 53,
    status: 400
};
module.exports.WEAK_PASSWORD = {
    message: "Password must be 8-32 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*).",
    code: 54,
    status: 400
};
module.exports.INVALID_EMAIL_FORMAT = {
    message: "Please provide a valid email address.",
    code: 55,
    status: 400
};
module.exports.TERMS_NOT_ACCEPTED = {
    message: "You must accept the Terms of Use to register.",
    code: 56,
    status: 400
};
module.exports.INVALID_COUNTRY = {
    message: "Please select a valid country.",
    code: 57,
    status: 400
};
module.exports.INVALID_MAC_ADDRESS = {
    message: "MAC address must be in format XX-XX-XX-XX-XX-XX.",
    code: 58,
    status: 400
};
module.exports.UPDATE_REQUIRED = {
    message: "At least one field must be provided for update.",
    code: 59,
    status: 400
};
module.exports.REGISTRATION_SUCCESSFUL = {
    message: "Registration successful. Please verify your email. Check your spam folder if you don't receive the email.",
    code: 60,
    status: 200
};
module.exports.ADMIN_ONLY = {
    message: "This action is only available to administrators.",
    code: 61,
    status: 403
};
module.exports.MOD_ONLY = {
    message: "This action is only available to moderators.",
    code: 62,
    status: 403
};
module.exports.USER_ALREADY_BANNED = {
    message: "This user is already banned. Can't ban again, unban and try again.",
    code: 63,
    status: 403
};
module.exports.USER_NOT_BANNED = {
    message: "This user is not banned. Can't unban.",
    code: 64,
    status: 403
};
module.exports.CANT_DELETE_ACCOUNT_PRIVILIGED = {
    message: "This account cannot be deleted because it's priviliged/admin.",
    code: 65,
    status: 403
};
module.exports.CANT_BAN_ACCOUNT_PRIVILIGED = {
    message: "This account cannot be banned because it's priviliged/admin.",
    code: 66,
    status: 403
};
module.exports.CANT_UNLINK_ADMIN_PROFILES = {
    message: "This account's profiles cannot be unlinked because it's priviliged/admin.",
    code: 67,
    status: 403
};
module.exports.COMMENT_NOT_FOUND = {
    message: "The comment could not be found.",
    code: 68,
    status: 404
};
module.exports.COMMENT_NOT_OWNED_BY_YOU = {
    message: "The comment is not owned by you.",
    code: 69,
    status: 403
};
module.exports.COMMENTING_TOO_FAST = {
    message: "You're commenting too fast. Please wait a few seconds.",
    code: 70,
    status: 429
};
module.exports.TOO_MANY_AUTH_ATTEMPTS = {
    message: "Too many login attempts. Please try again later.",
    code: 71,
    status: 429
};
module.exports.INVALID_REQUEST = {
    message: "The request is invalid. Please contact RyuAtelier Support if you think this is a mistake.",
    code: 72,
    status: 400
};
module.exports.USER_ALREADY_FRIEND = {
    message: "This user is already your friend.",
    code: 73,
    status: 400
};
module.exports.FRIEND_REQUEST_ALREADY_SENT = {
    message: "A friend request has already been sent to this user.",
    code: 74,
    status: 400
};
module.exports.FRIEND_REQUEST_NOT_FOUND = {
    message: "The friend request could not be found.",
    code: 75,
    status: 404
};
module.exports.CANNOT_ADD_SELF = {
    message: "You cannot add yourself as a friend.",
    code: 76,
    status: 400
};
module.exports.CODE_NOT_VERIFIED = {
    message: "Verification code couldn't be verified. Are you sure it belongs to you?",
    code: 77,
    status: 400
};
module.exports.CODE_NOT_ACCEPTED = {
    message: "Verification code couldn't be accepted. Please try again later.",
    code: 78,
    status: 400
};
module.exports.USE_VERIFICATION_CODE_SYSTEM = {
    message: "Please use the verification code system for this platform.",
    code: 78,
    status: 400
};
module.exports.BELONGS_TO_SOMEONE_ELSE = {
    message: "This profile already belongs to somebody else in Hub. Please try again later.",
    code: 79,
    status: 400
};
module.exports.DISCORD_ALREADY_LINKED = {
    message: "This Discord account is already linked to another Hub account.",
    code: 80,
    status: 409
};
module.exports.DISCORD_NOT_FOUND = {
    message: "Discord account not found or access denied.",
    code: 81,
    status: 404
};
module.exports.DISCORD_AUTH_FAILED = {
    message: "Discord authentication failed.",
    code: 82,
    status: 400
};
module.exports.PLAYLIST_NOT_FOUND = {
    message: "The requested playlist could not be found.",
    code: 83,
    status: 404
};
module.exports.PLAYLIST_NOT_OWNED = {
    message: "You do not have permission to modify this playlist.",
    code: 84,
    status: 403
};
module.exports.NOT_FRIENDS = {
    message: "You can only share playlists with your friends.",
    code: 85,
    status: 403
};
module.exports.TWO_FACTOR_REQUIRED = {
    message: "Two-factor authentication is required for this account.",
    code: 86,
    status: 401
};
module.exports.INVALID_TWO_FACTOR_CODE = {
    message: "The provided two-factor authentication code is invalid.",
    code: 87,
    status: 401
};
module.exports.TWO_FACTOR_ALREADY_ENABLED = {
    message: "Two-factor authentication is already enabled for this account.",
    code: 88,
    status: 400
};
module.exports.TWO_FACTOR_NOT_ENABLED = {
    message: "Two-factor authentication is not enabled for this account.",
    code: 89,
    status: 400
};
module.exports.INVALID_AUTH_FILE = {
    message: "The authentication file is invalid or has been tampered with.",
    code: 90,
    status: 401
};
module.exports.AUTH_FILE_EXPIRED = {
    message: "The authentication file has expired. Please request a new one from the launcher.",
    code: 91,
    status: 401
};
module.exports.AUTH_FILE_PASSWORD_CHANGED = {
    message: "The authentication file is no longer valid because the account password has changed. Please re-authenticate in the launcher.",
    code: 92,
    status: 401
};
module.exports.PATREON_ALREADY_LINKED = {
    message: "This Patreon account is already linked to another Hub account.",
    code: 93,
    status: 409
};
module.exports.PATREON_NOT_FOUND = {
    message: "Patreon account not found or access denied.",
    code: 94,
    status: 404
};
module.exports.PATREON_AUTH_FAILED = {
    message: "Patreon authentication failed.",
    code: 95,
    status: 400
};
module.exports.USER_NOT_ON_SERVER = {
    message: "You must be a member of our Discord server to link your Patreon account.",
    code: 96,
    status: 403
};
module.exports.USER_DISCORD_NOT_CONNECTED = {
    message: "You must connect your Discord account first before linking Patreon.",
    code: 97,
    status: 400
};
module.exports.HIDDEN_USER = {
    message: "This user is hidden and cannot be interacted with.",
    code: 98,
    status: 403
};
module.exports.APP_NOT_FOUND = {
    message: "The requested application could not be found.",
    code: 99,
    status: 404
};
module.exports.NO_UPDATE_AVAILABLE = {
    message: "No update is available for this application.",
    code: 100,
    status: 204
};
module.exports.REGISTRATION_DISABLED = {
    message: "Registration is currently disabled. Please try again later.",
    code: 101,
    status: 503
};