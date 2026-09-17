const Joi = require("joi");

const config = require("../config");
const { PASSWORD_TOO_WEAK } = require("./http-codes");

const ID_ON_PLATFORM = Joi.string().required();
const GENOME_ID = Joi.string().uuid().required();
const NAME_ON_PLATFORM = Joi.string().required();
const SWITCH_NAME_ON_PLATFORM = Joi.string().required();

module.exports = {
  "/v2/profiles/sessions": {
    POST: {
      body: Joi.object({
        genomeId: GENOME_ID,
        idOnPlatform: ID_ON_PLATFORM.optional(),
        nameOnPlatform: Joi.string().optional(),
        "switch.nameOnPlatform": Joi.string().optional()
      }).custom((value, helpers) => {
        if (!value.nameOnPlatform && !value["switch.nameOnPlatform"]) {
          return helpers.message('"nameOnPlatform" or "switch.nameOnPlatform" is required');
        }
        return value;
      }).unknown(true)
    }
  },
  "/v3/profiles/sessions": {
    POST: {
      body: Joi.object({
        nameOnPlatform: Joi.string().optional(),
        "switch.nameOnPlatform": Joi.string().optional(),
        data: Joi.string().optional()
      }).unknown(true)
    }
  },
  "/v2/profiles": {
    GET: {
      query: Joi.object({
        nameOnPlatform: Joi.string()
          .optional()
          .custom((value, helpers) => value.split(",")),
        idOnPlatform: Joi.string()
          .optional()
          .custom((value, helpers) => value.includes(",") ? value.split(",") : [value]),
        platformType: Joi.string().optional(),
        profileId: Joi.string()
          .custom((value, helpers) => value.includes(",") ? value.split(",") : [value]).optional()
      })
    }
  },
  "/v1/api/provider/service_token/@me": {
    GET: {
      headers: Joi.object({
        "x-nintendo-platform-id": Joi.string().pattern(/^\d+$/).required(),
        "x-nintendo-device-type": Joi.string().pattern(/^\d+$/).required(),
        "x-nintendo-device-id": Joi.string().pattern(/^\d+$/).required(),
        "x-nintendo-serial-number": Joi.string().alphanum().required(),
        "x-nintendo-system-version": Joi.string().pattern(/^\d+$/).required(),
        "x-nintendo-region": Joi.string().pattern(/^\d+$/).required(),
        "x-nintendo-country": Joi.string().length(2).uppercase().required(),
        "x-nintendo-client-id": Joi.string().length(32).hex().required(),
        "x-nintendo-client-secret": Joi.string().length(32).hex().required(),
        "x-nintendo-fpd-version": Joi.string().required(),
        "x-nintendo-environment": Joi.string().valid("L1", "L2", "D1", "D2").required(),
        "x-nintendo-title-id": Joi.string().length(16).hex().required(),
        "x-nintendo-unique-id": Joi.string().required(),
        "x-nintendo-application-version": Joi.string().required(),
        "authorization": Joi.string().pattern(/^Bearer\s+[A-Za-z0-9]+$/).required()
      }).unknown(true)
    }
  },
  "/v1/backoffice/verify-code": {
    GET: {
      query: Joi.object({
        code: Joi.string().required()
      })
    }
  },
  "/v1/backoffice/events": {
    POST: {
      query: Joi.object({
        userId: Joi.string().required(),
      }),
      body: Joi.object({
        profileId: Joi.string().optional(),
        platform: Joi.string().optional(),
        gameSessionId: Joi.string().optional(),
        playerSessionId: Joi.string().optional(),
        spaceId: Joi.string().optional(),
        events: Joi.array().items(Joi.object()).min(1).required()
      })
    }
  },
  "/v1/backoffice/events": {
    GET: {
      query: Joi.object({
        userId: Joi.string().required(),
        spaceId: Joi.string().optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        skip: Joi.number().integer().min(0).optional()
      })
    }
  },
  "/v1/backoffice/events/latest": {
    GET: {
      query: Joi.object({
        userId: Joi.string().required(),
        spaceId: Joi.string().optional()
      })
    }
  },
  "/v1/backoffice/events/latest-event": {
    GET: {
      query: Joi.object({
        userId: Joi.string().required(),
        spaceId: Joi.string().optional()
      })
    }
  }
};