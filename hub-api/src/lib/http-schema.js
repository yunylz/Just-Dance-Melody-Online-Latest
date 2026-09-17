const Joi = require("joi");

const config = require("../config");
const { PASSWORD_TOO_WEAK } = require("./http-codes");
const countries = require("../data/countries");
const { COMMENT_TYPES } = require("./enums");
const localWdfConfig = require("../data/wdf");

const VERSION = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.number().valid(...config.VERSIONS)
    ),
  Joi.string().custom((value, helpers) => {
    if (value.toLowerCase() === "all") return ["all"];
    return value.split(",").map(v => {
      const n = Number(v);
      if (!config.VERSIONS.includes(n)) {
        throw new Error(`Invalid version: ${v}`);
      }
      return n;
    });
  })
).required();

const VERSION_NO_ALL = Joi.number().valid(...config.VERSIONS).required();
const PLATFORMS_NO_ALL = Joi.string().valid(...config.PLATFORMS).required();

const PLATFORMS = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.string().valid(...config.PLATFORMS)
    ),
  Joi.string().custom((value, helpers) => {
    if (value.toLowerCase() === "all") return ["all"];
    const arr = value.split(",");
    arr.forEach(p => {
      if (!config.PLATFORMS.includes(p)) {
        throw new Error(`Invalid platform: ${p}`);
      }
    });
    return arr;
  })
).required();

const PLATFORM = Joi.string().valid(...config.PLATFORMS).required();

const MAPNAME = Joi.string().required();

// Enhanced username validation
const USERNAME = Joi.string()
  .pattern(/^[a-zA-Z0-9]+$/) // only letters and numbers
  .min(4)
  .max(12)
  .required()
  .messages({
    "string.pattern.base": "Username can only contain English letters and numbers.",
    "string.min": "Username must be at least 4 characters long.",
    "string.max": "Username must be at most 12 characters long."
  });

// Enhanced email validation
const EMAIL = Joi.string()
  .email({
    minDomainSegments: 2,
    tlds: { allow: true }
  })
  .lowercase()
  .trim()
  .required()
  .messages({
    "string.email": "Please provide a valid email address."
  });

// Strong password validation for registration
const PASSWORD_REGISTER = Joi.string()
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*?])[A-Za-z\\d!@#$%^&*?]{8,32}'))
  .required()
  .messages({
    "string.pattern.base": "Password must be 8-32 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*?)"
  });

// Basic password validation (for login)
const PASSWORD = Joi.string()
  .min(1)
  .required()
  .messages({
    "string.empty": "Password is required.",
    "any.required": "Password is required."
  });

// Enhanced password validation for change/reset
const NEW_PASSWORD = Joi.string()
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*?])[A-Za-z\\d!@#$%^&*?]{8,32}'))
  .required()
  .messages({
    "string.pattern.base": "New password must be 8-32 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*?)"
  });

const LIMIT = Joi.number().integer().min(1).max(100).default(10);
const OFFSET = Joi.number().integer().min(0).default(0);
const REMEMBER_ME = Joi.boolean().default(false);

const AVATAR_ID = Joi.number().min(1).max(9999).optional();

// Enhanced date of birth validation
const DATE_OF_BIRTH = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .message("dateOfBirth must be in YYYY-MM-DD format")
  .required()
  .custom((value, helpers) => {
    const dob = new Date(value);
    const today = new Date();

    // Check if date is valid
    if (dob.toString() === 'Invalid Date') {
      return helpers.error("any.custom", { message: "Invalid date provided" });
    }

    // Check if date is not in the future
    if (dob > today) {
      return helpers.error("any.custom", { message: "Date of birth cannot be in the future" });
    }

    // Check if date is not too far in the past (reasonable birth year)
    const minBirthYear = today.getFullYear() - 120;
    if (dob.getFullYear() < minBirthYear) {
      return helpers.error("any.custom", { message: "Invalid birth year" });
    }

    const ageDiff = today.getFullYear() - dob.getFullYear();
    const hasHadBirthday =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

    const age = hasHadBirthday ? ageDiff : ageDiff - 1;

    if (age < 13) {
      return helpers.error("any.custom", { message: "Must be at least 13 years old" });
    }

    return value;
  }, "Age validation");

// Optional date of birth (for updates)
const DATE_OF_BIRTH_OPTIONAL = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .message("dateOfBirth must be in YYYY-MM-DD format")
  .optional()
  .custom((value, helpers) => {
    if (!value) return value;

    const dob = new Date(value);
    const today = new Date();

    // Check if date is valid
    if (dob.toString() === 'Invalid Date') {
      return helpers.error("any.custom", { message: "Invalid date provided" });
    }

    // Check if date is not in the future
    if (dob > today) {
      return helpers.error("any.custom", { message: "Date of birth cannot be in the future" });
    }

    // Check if date is not too far in the past (reasonable birth year)
    const minBirthYear = today.getFullYear() - 120;
    if (dob.getFullYear() < minBirthYear) {
      return helpers.error("any.custom", { message: "Invalid birth year" });
    }

    return value;
  }, "Age validation");

// Enhanced name validation
const NAME = Joi.string()
  .min(2)
  .max(100)
  .pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
  .trim()
  .required()
  .messages({
    "string.pattern.base": "Name can only contain letters, spaces, hyphens, and apostrophes.",
    "string.min": "Name must be at least 2 characters long.",
    "string.max": "Name must be at most 100 characters long."
  });

// Token validation
const TOKEN = Joi.string()
  .required()
  .messages({
    "string.empty": "Token is required.",
    "any.required": "Token is required."
  });

const ROOM = Joi.string().valid(...localWdfConfig.ROOMS.map(r => r.roomName)).required();

module.exports = {
  "/auth/v1/register": {
    POST: {
      body: Joi.object({
        firstName: NAME,
        lastName: NAME,
        country: Joi.string().valid(...countries.map(c => c.code)).required().messages({
          "any.only": "Please select a valid country."
        }),
        username: USERNAME,
        email: EMAIL,
        password: PASSWORD_REGISTER,
        dateOfBirth: DATE_OF_BIRTH,
        acceptedTermsOfUse: Joi.boolean().required().equal(true).messages({
          "any.only": "You must accept the Terms of Use to register."
        }),
        rememberMe: REMEMBER_ME,
        avatarId: AVATAR_ID.default(1).required()
      })
    }
  },
  "/auth/v1/session": {
    POST: {
      body: Joi.object({
        email: EMAIL,
        password: PASSWORD,
        rememberMe: REMEMBER_ME,
        isTauri: Joi.boolean().default(false)
      })
    }
  },
  "/auth/v1/2fa/verify": {
    POST: {
      body: Joi.object({
        code: Joi.string().length(6).pattern(/^\d+$/).required(),
        twoFactorToken: Joi.string().optional()
      })
    }
  },
  "/auth/v1/2fa/setup": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/auth/v1/2fa/enable": {
    POST: {
      body: Joi.object({
        code: Joi.string().length(6).pattern(/^\d+$/).required(),
        twoFactorToken: Joi.string().optional()
      })
    }
  },
  "/auth/v1/2fa/disable": {
    POST: {
      body: Joi.object({
        code: Joi.string().length(6).pattern(/^\d+$/).required()
      })
    }
  },
  "/auth/v1/change-password": {
    POST: {
      body: Joi.object({
        oldPassword: PASSWORD,
        newPassword: NEW_PASSWORD
      })
    }
  },
  "/auth/v1/reset-password": {
    POST: {
      body: Joi.object({
        newPassword: NEW_PASSWORD
      })
    }
  },
  "/auth/v1/forgot-password": {
    POST: {
      body: Joi.object({
        email: EMAIL
      })
    }
  },
  "/auth/v1/resend-verification": {
    POST: {
      body: Joi.object({
        email: EMAIL
      })
    }
  },
  "/auth/v1/verify-auth-file": {
    POST: {
      body: Joi.object({
        data: Joi.string().required().messages({
          "string.empty": "Auth file data is required.",
          "any.required": "Auth file data is required."
        })
      })
    }
  },
  "/users/v1/me/profiles": {
    POST: {
      body: Joi.object({
        platform: PLATFORM,
        username: Joi.string().optional().messages({
          "string.empty": "Username cannot be empty if provided."
        }),
        macAddress: Joi.string()
          .regex(/^([0-9A-Fa-f]{2})(-[0-9A-Fa-f]{2}){5}$/)
          .optional()
          .messages({
            "string.pattern.base": "MAC address must be in format XX-XX-XX-XX-XX-XX."
          })
      })
    }
  },
  "/users/v1/me": {
    PATCH: {
      body: Joi.object({
        //username: USERNAME.optional(),
        //email: EMAIL.optional(),
        //dateOfBirth: DATE_OF_BIRTH_OPTIONAL,
        avatarId: AVATAR_ID,
        hubSettings: Joi.object({
          shareAccount: Joi.boolean().default(false).optional(),
          theme: Joi.string().valid('dark', 'light').optional(),
          pushNotifications: Joi.boolean().optional()
        }).optional()
      }).min(1).messages({
        "object.min": "At least one field must be provided for update."
      })
    }
  },
  "/mail/v1/verify-token": {
    POST: {
      body: Joi.object({
        token: TOKEN
      })
    }
  },
  "/admin/v1/admins": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/admin/v1/set-jmcs-env": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required(),
        env: Joi.string().valid("prod", "dev").required()
      })
    }
  },
  "/admin/v1/activities": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/admin/v1/jmcs-activities": {
    GET: {
      query: Joi.object({
        count: Joi.number().integer().min(1).max(200).default(50).optional(),
        skip: Joi.number().integer().min(0).default(0).optional(),
        types: Joi.string().optional()
      }),
    }
  },
  "/admin/v1/ban-user": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required(),
        reason: Joi.string().required(),
        notifyUser: Joi.boolean().default(false).optional()
      })
    }
  },
  "/admin/v1/unban-user": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required(),
        reason: Joi.string().required(),
        notifyUser: Joi.boolean().default(false).optional()
      })
    }
  },
  "/admin/v1/delete-user": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required(),
        reason: Joi.string().required(),
        notifyUser: Joi.boolean().default(false).optional()
      })
    }
  },
  "/admin/v1/unlink-profile": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required(),
        platform: Joi.string().required(),
        reason: Joi.string().required(),
        notifyUser: Joi.boolean().default(false).optional()
      })
    }
  },
  "/jmcs/v1/leaderboard": {
    GET: {
      query: Joi.object({
        platform: PLATFORMS,
        mapName: MAPNAME,
        limit: LIMIT,
        offset: OFFSET
      })
    }
  },
  "/jmcs/v1/spotlight": {
    GET: {
      query: Joi.object({
        limit: LIMIT,
        offset: OFFSET
      })
    }
  },
  "/jmcs/v1/dotw": {
    GET: {
      query: Joi.object({
        mapName: MAPNAME
      })
    }
  },
  "/jmcs/v1/wdf/status": {
    GET: {
      query: Joi.object({
        room: ROOM
      })
    }
  },
  "/jmcs/v1/wdf/ccu": {
    GET: {
      query: Joi.object({
        room: ROOM
      })
    }
  },
  "/jmcs/v1/wdf/live-scores": {
    GET: {
      query: Joi.object({
        room: ROOM
      })
    }
  },
  "/users/v1/verify-code": {
    POST: {
      body: Joi.object({
        code: Joi.string().required()
      })
    }
  },
  "/users/v1/me/friends/requests": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/users/v1/me/friends/requests/accept": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/users/v1/me/friends/requests/decline": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/users/v1/me/friends/requests/cancel": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/users/v1/me/friends/remove": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/users/v1/search": {
    GET: {
      query: Joi.object({
        q: Joi.string().allow("").optional()
      })
    }
  },
  "/users/v1/me/notifications": {
    GET: {
      query: Joi.object({}).optional()
    },
    DELETE: {
      query: Joi.object({}).optional()
    }
  },
  "/users/v1/me/notifications/read-all": {
    POST: {
      body: Joi.object({}).optional()
    }
  },
  "/editorial/v1/home": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/editorial/v1/news": {
    GET: {
      query: Joi.object({}).optional()
    },
    POST: {
      body: Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        imageUrl: Joi.string().uri().allow("").optional(),
        author: Joi.string().required(),
        published: Joi.boolean().optional(),
        category: Joi.string().optional()
      })
    }
  },
  "/editorial/v1/news/upload": {
    POST: {
      // Body is multipart, so we don't strictly validate it here as Joi might struggle
      // without extra config, but we can allow it.
    }
  },
  "/backoffice/v1/patreon/sync": {
    POST: {
      body: Joi.object({}).optional()
    }
  },
  "/backoffice/v1/patreon/user/:userId": {
    GET: {
      params: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/backoffice/v1/patreon/link": {
    POST: {
      body: Joi.object({
        userId: Joi.string().required().messages({
          "string.empty": "userId is required.",
          "any.required": "userId is required."
        }),
        patreonId: Joi.string().required().messages({
          "string.empty": "patreonId is required.",
          "any.required": "patreonId is required."
        }),
        email: Joi.string().email().optional().allow(null),
        fullName: Joi.string().optional().allow(null)
      })
    }
  },
  "/backoffice/v1/patreon/unlink/:userId": {
    POST: {
      params: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  "/backoffice/v1/patreon/subscribers": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/backoffice/v1/patreon/linked": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/backoffice/v1/patreon/campaign/members": {
    GET: {
      query: Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(25).optional()
      })
    }
  },
  "/backoffice/v1/patreon/campaign/subscribers": {
    GET: {
      query: Joi.object({}).optional()
    }
  },
  "/backoffice/v1/patreon/campaign/member/:patreonUserId": {
    GET: {
      params: Joi.object({
        patreonUserId: Joi.string().required()
      })
    }
  },
  "/auth/v1/patreon/webhook": {
    POST: {
      query: Joi.object({
        secret: Joi.string().required().messages({
          "string.empty": "Guard secret is required.",
          "any.required": "Guard secret is required."
        })
      })
    }
  }
};