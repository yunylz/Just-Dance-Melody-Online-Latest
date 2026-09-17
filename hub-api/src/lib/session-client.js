const config = require("../config");
const { 
    AUTH_REQUIRED, 
    EMAIL_VERIFICATION_EXPIRED, 
    EMAIL_UNKNOWN_ERROR, 
    PASSWORD_RESET_EXPIRED, 
    PASSWORD_UNKNOWN_ERROR, 
    ADMIN_ONLY, 
    MOD_ONLY,
    TWO_FACTOR_REQUIRED 
} = require("./http-codes");
const User = require("./models/user");
const session = require("./session");
const utils = require("./utils");
const token = require("./token");

const isS2SToken = (token) => {
    return config.S2S_TOKENS.includes(token);
}

/**
 * Validates email verification or password reset tokens.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {string} tokenType - Type of token ("email" or "password")
 * @throws {AUTH_REQUIRED} If token is missing
 * @throws {EMAIL_VERIFICATION_EXPIRED|PASSWORD_RESET_EXPIRED} If token is expired
 * @throws {EMAIL_UNKNOWN_ERROR|PASSWORD_UNKNOWN_ERROR} If token or user is invalid
 */
const validateToken = async (req, res, next, tokenType) => {
    const auth = req.query.token;
    if (!auth) return next(AUTH_REQUIRED);

    let decoded;
    try {
        decoded = JSON.parse(Buffer.from(auth, "base64").toString("utf8"));
    } catch {
        return next(tokenType === "email" ? EMAIL_UNKNOWN_ERROR : PASSWORD_UNKNOWN_ERROR);
    }

    const { t, uid, e } = decoded;
    const [token, issuedAt, expiration] = t.split(":");
    if (Date.now() > expiration) {
        return next(tokenType === "email" ? EMAIL_VERIFICATION_EXPIRED : PASSWORD_RESET_EXPIRED);
    }

    const query = tokenType === "email"
        ? { userId: uid, "status.emailVerificationToken": t, "status.emailVerified": false }
        : { email: e, "status.passwordUpdateToken": t, "status.passwordUpdateRequired": true };

    const user = await User.findOne(query);
    if (!user) return next(tokenType === "email" ? EMAIL_UNKNOWN_ERROR : PASSWORD_UNKNOWN_ERROR);

    req.userId = uid;
    req.email = e;
    return next();
};

/**
 * Middleware to require a valid session token in the Authorization header.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AUTH_REQUIRED} If token is missing or invalid
 */
module.exports.tokenRequired = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return next(AUTH_REQUIRED);

    const [type, token] = auth.split(" ");

    if (isS2SToken(token)) {
        req.isS2S = true;
        return next();
    }

    // If type isn't bearer and token is not present, return auth required
    if (type !== "Bearer" || !token) return next(AUTH_REQUIRED);

    // Bypass for discord bot
    if (token === "discordBot12345") return next();

    const { error, verified, payload } = session.verifySession(token);
    if (error) return next(error);

    req.userId = payload.uid;
    req.username = payload.u;
    req.country = payload.c;
    req.email = payload.e;
    req.isTauri = payload.t === 1;

    return next();
};

/**
 * Middleware to require a valid server-to-server token.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AUTH_REQUIRED} If token is missing or invalid
 */
module.exports.s2sTokenRequired = (req, res, next) => {
    if (req.isAdmin) return next();
    if (req.isS2S) return next();
    
    const auth = req.headers.authorization;
    if (!auth) return next(AUTH_REQUIRED);

    const [type, token] = auth.split(" ");
    if (type !== "Bearer" || !token) return next(AUTH_REQUIRED);

    if (config.S2S_TOKENS.includes(token)) {
        req.isS2S = true;
        return next();
    }
    return next(AUTH_REQUIRED);
};


module.exports.adminOnly = async (req, res, next) => {
    if (req.isS2S) return next();
    if (!req.userId) return next(AUTH_REQUIRED);

    const user = await User.findOne({ userId: req.userId });
    if (!user) return next(AUTH_REQUIRED);
    if (!user.status.admin) return next(ADMIN_ONLY);
    
    // For admins 2FA should be required
    if (!user.status.twoFactorEnabled && !utils.isLocal()) return next(TWO_FACTOR_REQUIRED);

    req.isAdmin = true;

    return next();
};

module.exports.modOnly = async (req, res, next) => {
    if (!req.userId) return next(AUTH_REQUIRED);
    if (req.isAdmin) return next();

    const user = await User.findOne({ userId: req.userId });
    if (!user) return next(AUTH_REQUIRED);
    if (!user.status.moderator) return next(MOD_ONLY);
    
    // For mods 2FA should be required
    if (!user.status.twoFactorEnabled && !utils.isLocal()) return next(TWO_FACTOR_REQUIRED);

    req.isMod = true;
    req.isAdmin = false;

    return next();
};

/**
 * Middleware to validate email verification tokens.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports.emailVerifyTokenRequired = (req, res, next) => validateToken(req, res, next, "email");

/**
 * Middleware to validate password reset tokens.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports.resetPassTokenRequired = (req, res, next) => validateToken(req, res, next, "password");

/**
 * Middleware that requires a temporary 2FA token.
 * Used for 2FA verification and initial setup for staff.
 */
module.exports.twoFactorTokenRequired = async (req, res, next) => {
    const tfaToken = req.headers["x-2fa-token"] || req.body?.twoFactorToken;

    if (!tfaToken) return next(AUTH_REQUIRED);

    const payload = token.decrypt(tfaToken);
    if (!payload || !payload.tfa) return next(TAMPERED_TOKEN);

    if (Date.now() > payload.exp) return next(SESSION_EXPIRED);

    req.userId = payload.uid;
    req.is2FASetup = payload.setup;
    
    return next();
};