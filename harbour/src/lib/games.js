const platformDefs = require("../data/platforms");
const defaultTrackingTypes = require("./tracking-types");

const App = require("./models/app");
const Space = require("./models/space");
const Entity = require("./models/entity");
const EventConfig = require("./models/event-config");
const Population = require("./models/population");
const Action = require("./models/action");
const Reward = require("./models/reward");
const Profile = require("./models/profile");
const Parameter = require("./models/parameter");
const EventsDefinition = require("./models/events-definition");


/**
 * Resolves a platform definition object by its ID string.
 * Falls back to a minimal object so middleware never crashes on unknown platforms.
 *
 * @param {string} id - Platform ID (e.g. "nx", "wiiu").
 * @returns {Object}
 */
const resolvePlatform = (id) =>
    Object.values(platformDefs).find(p => p.id === id) || { id };

/**
 * App / Space / Entity registry backed by MongoDB.
 *
 * All methods are async. Public API response shapes are identical to the
 * previous static-file implementation.
 */
class Apps {

    /**
     * Normalises a DB App document into the shape returned by public API responses.
     * `platform` is the ID string (e.g. "nx").
     *
     * @param {Object} doc - Mongoose App document.
     * @returns {Object}
     */
    _normalize(doc) {
        return {
            applicationId: doc.appId,
            spaceId: doc.spaceId,
            name: doc.name,
            platform: doc.platform,
            uplayGameCode: doc.uplayGameCode
        };
    }

    /**
     * Hydrates a DB App document into the internal shape used by middleware.
     * `platform` is the full platform definition object (with authType, etc.).
     *
     * @param {Object} doc - Mongoose App document.
     * @returns {Object}
     */
    _hydrate(doc) {
        if (!doc) return null;
        return {
            appId: doc.appId,
            applicationId: doc.appId,
            name: doc.name,
            platform: resolvePlatform(doc.platform),
            spaceId: doc.spaceId,
            uplayGameCode: doc.uplayGameCode,
            buildId: doc.buildId,
            userAgent: doc.userAgent,
            configuration: doc.configuration || {},
            overrides: { configuration: doc.configuration || {} }
        };
    }

    /**
     * List all registered applications (normalised).
     * @returns {Promise<Object[]>}
     */
    async getAllApps() {
        const docs = await App.find({});
        return docs.map(d => this._normalize(d));
    }

    /**
     * Get a single application by its app ID.
     *
     * @param {string}  appId
     * @param {boolean} [normalize=true] - If false, returns the hydrated internal form.
     * @returns {Promise<Object|null>}
     */
    async getApp(appId, normalize = true) {
        const doc = await App.findOne({ appId });
        if (!doc) return null;
        return normalize ? this._normalize(doc) : this._hydrate(doc);
    }

    /**
     * Returns a minimal game context object for a given app ID.
     * (The concept of a separate "game" grouping is simplified in the DB model —
     * we use `gameId` on the App document instead.)
     *
     * @param {string} appId
     * @returns {Promise<Object|null>}
     */
    async getGameByAppId(appId) {
        const doc = await App.findOne({ appId });
        if (!doc) return null;
        return { id: doc.gameId || doc.appId, name: doc.name };
    }

    /**
     * Check whether an app ID exists.
     * @param {string} appId
     * @returns {Promise<boolean>}
     */
    async appExists(appId) {
        return (await App.countDocuments({ appId })) > 0;
    }

    /**
     * Returns the full configuration object for an app.
     * Always injects a fresh `platformConfig` block from the DB fields.
     *
     * @param {string} appId
     * @returns {Promise<Object>}
     */
    async getConfiguration(appId) {
        const doc = await App.findOne({ appId });
        if (!doc) return {};

        return {
            ...(doc.configuration || {}),
            platformConfig: {
                applicationId: doc.appId,
                // name: doc.name,
                spaceId: doc.spaceId,
                platform: doc.platform.toUpperCase(),
                uplayGameCode: doc.uplayGameCode || "",
                environment: "PROD"
            }
        };
    }

    /**
     * Get a space by its space ID.
     * @param {string} spaceId
     * @returns {Promise<Object|null>}
     */
    async getSpace(spaceId) {
        return Space.findOne({ spaceId }).lean();
    }

    /**
     * Get all entities for a given space ID.
     * @param {string} spaceId
     * @returns {Promise<Object[]>}
     */
    async getEntities(spaceId) {
        return Entity.find({ spaceId }).select("-__v -_id").lean();
    }

    /**
     * Get event configuration for a space.
     * @param {string} spaceId
     * @returns {Promise<Object>}
     */
    async getConfigEvents(spaceId) {
        const config = await EventConfig.findOne({ spaceId }).lean();
        const sendEventsPeriod = 2; // for our presence system

        if (!config) {
            return {
                types: defaultTrackingTypes,
                s2sConfig: { 
                    maxBatchSize: 2500, 
                    sendPeriodSeconds: sendEventsPeriod, 
                    sendPlayerEventsPeriodSeconds: sendEventsPeriod
                },
                publicConfig: { 
                    sendPeriodSeconds: sendEventsPeriod, 
                    hmacEnabled: false 
                }
            };
        }
        const { _id, __v, spaceId: _, ...rest } = config;
        
        return {
            ...rest,
            s2sConfig: {
                maxBatchSize: 2500,
                sendPeriodSeconds: sendEventsPeriod,
                sendPlayerEventsPeriodSeconds: sendEventsPeriod
            },
            publicConfig: {
                sendPeriodSeconds: sendEventsPeriod,
                hmacEnabled: false
            }
        };
    }

    /**
     * Get event configuration for a space for V2
     * @param {string} spaceId
     * @returns {Promise<Object>}
     */
    async getConfigEventsV2(spaceId) {
        const config = await EventConfig.findOne({ spaceId }).lean();
        if (!config) {
            return {
                tags: defaultTrackingTypes,
                sendPeriodSeconds: 2, hmacEnabled: false
            };
        }
        return {
            tags: config.types,
            sendPeriodSeconds: config.publicConfig.sendPeriodSeconds,
            hmacEnabled: config.publicConfig.hmacEnabled
        };
    }

    async getPopulations(spaceIds) {
        return await Population.find({ spaceId: { $in: spaceIds } }).lean();
    }

    async getActions(spaceId) {
        return await Action.find({ spaceId }).select("-__v -_id -spaceId").lean();
    }

    async getRewards(spaceId) {
        return await Reward.find({ spaceId }).select("-__v -_id -spaceId").lean();
    }

    async getProfile(userId) {
        return await Profile.findOne({ userId }).lean();
    }

    async getProfileByProfileId(profileId) {
        return await Profile.findOne({ profileId }).lean();
    }

    async getParameters(targetId) {
        const doc = await Parameter.findOne({ targetId }).lean();
        return doc ? doc.parameters : { parameters: {} };
    }

    async getEventsDefinitions(spaceId) {
        const doc = await EventsDefinition.findOne({ spaceId }).lean();
        return doc || { attributes: [], compositions: [], signals: [] };
    }
}



module.exports = new Apps();