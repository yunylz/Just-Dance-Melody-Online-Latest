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

module.exports.APP_NOT_FOUND = {
  message: "The specified application was not found.",
  code: 7,
  status: 404
};

module.exports.APPLICATION_REQUIRED = {
  message: "Application is required.",
  code: 8,
  status: 400
};

module.exports.AUTHORIZATION_REQUIRED = {
  message: "Authorization is required.",
  code: 9,
  status: 401
};

module.exports.AUTHORIZATION_INVALID_TYPE = {
  message: "Authorization type is invalid for this app/platform.",
  code: 10,
  status: 401
};

module.exports.PASSWORD_TOO_WEAK = {
  message: "The provided password is too weak.",
  code: 11,
  status: 400
};

module.exports.AUTH_VERIFICATION_FAILED = {
  message: "Authentication verification failed.",
  code: 12,
  status: 401
};

module.exports.AUTH_SYSTEM_ERROR = {
  message: "Authentication system error.",
  code: 13,
  status: 500
};

module.exports.AUTH_TOKEN_EXPIRED = {
  message: "Authentication token has expired.",
  code: 14,
  status: 401
};

module.exports.AUTH_TOKEN_INVALID = {
  message: "Authentication token is invalid or corrupted.",
  code: 15,
  status: 401
};

module.exports.AUTH_TOKEN_MALFORMED = {
  message: "Authentication token format is invalid.",
  code: 16,
  status: 400
};

module.exports.PLATFORM_ID_MISMATCH = {
  message: "Platform ID mismatch.",
  code: 17,
  status: 400
};

module.exports.USERNAME_MISMATCH = {
  message: "Username mismatch.",
  code: 18,
  status: 400
};

module.exports.PRETENDO_ERROR = {
  message: "An error occured due to Pretendo. The session might've expired. This request was logged for investigation.",
  code: 19,
  status: 500
};

module.exports.USER_NOT_ON_HUB = {
  message: "There is no user on the Hub with this username in connected consoles.",
  code: 20,
  status: 401
};

module.exports.PLATFORM_NOT_AVAILABLE = {
  message: "This platform is not available for this action.",
  code: 21,
  status: 400
};

module.exports.USER_DOESNT_HAVE_PLATFORM = {
  message: "User doesn't have this platform.",
  code: 22,
  status: 400
};

module.exports.SESSION_NOT_FOUND = {
  message: "Session not found.",
  code: 23,
  status: 400
};

module.exports.CANT_ENCRYPT_PRETENDO_TOKEN = {
  message: "Failed to encrypt token.",
  code: 24,
  status: 500
};

module.exports.INTERNAL_SERVER_ERROR = {
  message: "Internal server error.",
  code: 25,
  status: 500
};

module.exports.INVALID_HEADERS = {
  message: "One or more headers are invalid.",
  code: 26,
  status: 400
};

module.exports.TICKET_EXPIRED = {
  message: "The provided ticket has expired.",
  code: 27,
  status: 401
};

module.exports.ADMIN_ONLY = {
  message: "This action is only available to admins.",
  code: 28,
  status: 401
};

module.exports.UNKNOWN_TICKET_TYPE = {
  message: "Unknown ticket type.",
  code: 29,
  status: 400
};

module.exports.INACTIVE_ACCOUNT = {
  message: "The account is inactive. Please contact JDMO Support for more information.",
  code: 30,
  status: 403
};

module.exports.LOCKED_ACCOUNT = {
  message: "The account is locked. Please contact JDMO Support for more information.",
  code: 31,
  status: 403
};

module.exports.BANNED_ACCOUNT = {
  message: "The account is banned. Please contact JDMO Support for more information.",
  code: 32,
  status: 403
};

module.exports.BANNED_DEVICE = {
  message: "The device is banned. Please contact JDMO Support for more information.",
  code: 33,
  status: 403
};

module.exports.S2S_TOKEN_ONLY = {
  message: "This action is only available to S2S tokens.",
  code: 34,
  status: 401
};

module.exports.REQUESTED_PLATFORM_TYPE_REQUIRED = {
  message: "Requested platform type header is required for this authentication type.",
  code: 35,
  status: 400
};

module.exports.UNKNOWN_HUB_ERROR = {
  message: "An unknown error occured with the Hub.",
  code: 36,
  status: 500
};

module.exports.INVALID_SWITCH_TICKET = {
  message: "The provided Nintendo Switch ticket is invalid.",
  code: 37,
  status: 401
};

module.exports.TICKET_REQUIRED = {
  message: "Please provide a valid Harbour ticket to proceed.",
  code: 38,
  status: 401
};

module.exports.APP_ID_REQUIRED = {
  message: "Please provide a valid Harbour App ID to proceed.",
  code: 39,
  status: 400
};

module.exports.UNKNOWN_AUTH_TYPE = {
  message: "Unknown authentication type.",
  code: 40,
  status: 400
};

module.exports.BACKOFFICE_TOKEN_REQUIRED = {
  message: "Please provide a valid Backoffice token to proceed.",
  code: 41,
  status: 401
};

module.exports.UBISERVICES_ERROR = {
  message: "An error occured with UbiServices.",
  code: 42,
  status: 500
};

module.exports.UBISERVICES_PSN_ERROR = {
  message: "PSN error occured with UbiServices.",
  code: 43,
  status: 500
};

module.exports.NOT_FOUND = {
  message: "This route was not found.",
  code: 44,
  status: 404
};