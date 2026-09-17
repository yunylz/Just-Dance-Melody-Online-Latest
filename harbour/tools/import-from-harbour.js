#!/usr/bin/env node
/**
 * Harbour Import Tool
 *
 * Crawls an original Harbour server by app ID, walks the full space tree
 * (following parentSpaceId up to the brand root), and saves everything to
 * your local MongoDB instance.
 *
 * Usage:
 *   node tools/import-from-harbour.js [--config ./tools/import-config.json]
 *
 * Or copy import-config.example.json → import-config.json and fill it in.
 *
 * What it fetches per app ID:
 *   GET /v1/applications/:appId              → app info
 *   GET /v1/applications/:appId/configuration → configuration blob
 *   Walk space tree upward via parentSpaceId until null:
 *     GET /v1/spaces/:spaceId                → space info
 *     GET /v1/spaces/:spaceId/entities       → entities
 */

"use strict";

const path = require("node:path");
const fs = require("node:fs");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// ─── Load config ─────────────────────────────────────────────────────────────

const configArg = process.argv.find((a, i) => process.argv[i - 1] === "--config");
const configPath = configArg
    ? path.resolve(configArg)
    : path.resolve(__dirname, "import-config.json");

if (!fs.existsSync(configPath)) {
    console.error(`\n❌ Config file not found: ${configPath}`);
    console.error(`   Copy import-config.example.json → import-config.json and fill it in.\n`);
    process.exit(1);
}

const importConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const { baseUrl, headers: customHeaders, appIds, options = {} } = importConfig;
const {
    skipExistingApps = false,
    skipExistingSpaces = false,
    skipExistingEntities = false,
    skipExistingEvents = false,
    skipExistingPopulations = false,
    skipExistingActions = false,
    skipExistingRewards = false,
    skipExistingParameters = false,
    skipExistingEventsDefinitions = false
} = options;

if (!baseUrl || !appIds?.length) {
    console.error("❌ Config must have 'baseUrl' and 'appIds' fields.");
    process.exit(1);
}

// ─── Models ──────────────────────────────────────────────────────────────────

const App = require("../src/lib/models/app");
const Space = require("../src/lib/models/space");
const Entity = require("../src/lib/models/entity");
const EventConfig = require("../src/lib/models/event-config");
const Population = require("../src/lib/models/population");
const Action = require("../src/lib/models/action");
const Reward = require("../src/lib/models/reward");
const Parameter = require("../src/lib/models/parameter");
const EventsDefinition = require("../src/lib/models/events-definition");



// ─── HTTP client ─────────────────────────────────────────────────────────────

const http = axios.create({
    baseURL: baseUrl,
    headers: {
        "Content-Type": "application/json",
        ...customHeaders
    },
    validateStatus: () => true,
    timeout: 15000
});

async function get(path) {
    const res = await http.get(path);
    if (res.status >= 400) {
        console.warn(`  ⚠  ${res.status} ${path}`);
        return null;
    }
    return res.data;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

const stats = { apps: 0, spaces: 0, entities: 0, events: 0, populations: 0, actions: 0, rewards: 0, parameters: 0, errors: 0 };



// ─── Crawl logic ─────────────────────────────────────────────────────────────

/**
 * Fetch and upsert a single space plus all its entities.
 * Returns the space document (or null on failure).
 */
async function importSpace(spaceId, visitedSpaces) {
    if (!spaceId || visitedSpaces.has(spaceId)) return null;
    visitedSpaces.add(spaceId);

    console.log(`  🔷 Space: ${spaceId}`);

    let spaceData = null;
    if (skipExistingSpaces) {
        spaceData = await Space.findOne({ spaceId }).lean();
        if (spaceData) {
            console.log(`     ⏭️  Space already exists, skipping metadata update`);
        }
    }

    if (!spaceData) {
        spaceData = await get(`/v1/spaces/${spaceId}`);
    }

    if (!spaceData) { stats.errors++; return null; }

    // Upsert space
    if (importConfig.import?.spaces !== false && (!skipExistingSpaces || !spaceData._id)) {
        await Space.findOneAndUpdate(
            { spaceId: spaceData.spaceId },
            {
                spaceId: spaceData.spaceId,
                spaceType: spaceData.spaceType || "title",
                spaceName: spaceData.spaceName || "",
                parentSpaceId: spaceData.parentSpaceId || null,
                parentSpaceName: spaceData.parentSpaceName || "",
                releaseType: spaceData.releaseType || "",
                platformType: spaceData.platformType || "",
                dateCreated: spaceData.dateCreated ? new Date(spaceData.dateCreated) : new Date(),
                dateLastModified: spaceData.dateLastModified ? new Date(spaceData.dateLastModified) : new Date(),
                tags: spaceData.tags || null
            },
            { upsert: true, new: true }
        );
        stats.spaces++;
    }


    // Fetch and upsert entities for this space
    if (importConfig.import?.entities !== false) {
        let offset = 0;
        while (true) {
            const entitiesData = await get(`/v1/spaces/${spaceId}/entities?limit=100&offset=${offset}`);
            if (!entitiesData?.entities?.length) break;

            for (const e of entitiesData.entities) {
                if (skipExistingEntities) {
                    const existing = await Entity.findOne({ entityId: e.entityId });
                    if (existing) continue;
                }

                await Entity.findOneAndUpdate(
                    { entityId: e.entityId },
                    {
                        entityId: e.entityId,
                        spaceId: e.spaceId || spaceId,
                        type: e.type || "unknown",
                        name: e.name || "",
                        tags: e.tags || [],
                        obj: e.obj || {},
                        lastModified: e.lastModified ? new Date(e.lastModified) : new Date(),
                        revision: e.revision || 1
                    },
                    { upsert: true, new: true }
                );
                stats.entities++;
            }

            if (entitiesData.entities.length < 100) break;
            offset += 100;
        }
        if (offset > 0) console.log(`     ✅ Entities saved`);
    }



    // Fetch and upsert event configuration for this space
    if (importConfig.import?.events !== false) {
        let skip = false;
        if (skipExistingEvents) {
            const existing = await EventConfig.findOne({ spaceId });
            if (existing) {
                console.log(`     ⏭️  Event config already exists, skipping`);
                skip = true;
            }
        }

        if (!skip) {
            const eventConfigData = await get(`/v2/spaces/${spaceId}/configs/events`);
            if (eventConfigData) {
                await EventConfig.findOneAndUpdate(
                    { spaceId: spaceId },
                    {
                        spaceId: spaceId,
                        types: eventConfigData.types || [],
                        s2sConfig: eventConfigData.s2sConfig || {},
                        publicConfig: eventConfigData.publicConfig || {}
                    },
                    { upsert: true, new: true }
                );
                stats.events++;
                console.log(`     ✅ Event config saved`);
            }
        }
    }

    // Fetch and upsert populations for this space
    if (importConfig.import?.populations !== false) {
        let skip = false;
        if (skipExistingPopulations) {
            const existing = await Population.findOne({ spaceId });
            if (existing) {
                console.log(`     ⏭️  Populations already exist, skipping`);
                skip = true;
            }
        }

        if (!skip) {
            const populationsData = await get(`/v1/profiles/me/populations?spaceIds=${spaceId}`);
            if (populationsData?.populations?.length) {
                await Population.deleteMany({ spaceId });
                for (const p of populationsData.populations) {
                    await Population.create({
                        spaceId,
                        name: p.name,
                        subject: p.subject,
                        obj: p.obj,
                        assignmentTime: p.assignmentTime ? new Date(p.assignmentTime) : new Date()
                    });
                    stats.populations++;
                }
                console.log(`     ✅ ${populationsData.populations.length} populations saved`);
            }
        }
    }

    // Fetch actions and rewards.
    const profileIdForCrawler = importConfig.profileId || "me";

    if (importConfig.import?.actions !== false) {
        let skip = false;
        if (skipExistingActions) {
            const existing = await Action.findOne({ spaceId });
            if (existing) {
                console.log(`     ⏭️  Actions already exist, skipping`);
                skip = true;
            }
        }

        if (!skip) {
            let offset = 0;
            let allActions = [];
            while (true) {
                const actionsData = await get(`/v1/profiles/${profileIdForCrawler}/actions?spaceId=${spaceId}&limit=100&offset=${offset}`);
                if (!actionsData?.actions?.length) break;
                allActions.push(...actionsData.actions);
                if (actionsData.actions.length < 100) break;
                offset += 100;
            }

            if (allActions.length) {
                // Deduplicate by ID
                const uniqueActions = [];
                const seenIds = new Set();
                for (const a of allActions) {
                    if (!seenIds.has(a.id)) {
                        uniqueActions.push(a);
                        seenIds.add(a.id);
                    }
                }

                await Action.deleteMany({ spaceId });
                for (const a of uniqueActions) {
                    await Action.create({
                        spaceId,
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        xp: a.xp,
                        value: a.value,
                        isBadge: a.isBadge,
                        activationDate: a.activationDate ? new Date(a.activationDate) : null,
                        available: a.available,
                        images: a.images,
                        tags: a.tags,
                        groups: a.groups,
                        obj: a.obj
                    });
                    stats.actions++;
                }
                console.log(`     ✅ ${uniqueActions.length} actions saved`);
            }
        }
    }

    if (importConfig.import?.rewards !== false) {
        let skip = false;
        if (skipExistingRewards) {
            const existing = await Reward.findOne({ spaceId });
            if (existing) {
                console.log(`     ⏭️  Rewards already exist, skipping`);
                skip = true;
            }
        }

        if (!skip) {
            let offset = 0;
            let allRewards = [];
            while (true) {
                const rewardsData = await get(`/v1/profiles/${profileIdForCrawler}/rewards?spaceId=${spaceId}&limit=100&offset=${offset}`);
                if (!rewardsData?.rewards?.length) break;
                allRewards.push(...rewardsData.rewards);
                if (rewardsData.rewards.length < 100) break;
                offset += 100;
            }

            if (allRewards.length) {
                // Deduplicate by ID
                const uniqueRewards = [];
                const seenIds = new Set();
                for (const r of allRewards) {
                    if (!seenIds.has(r.id)) {
                        uniqueRewards.push(r);
                        seenIds.add(r.id);
                    }
                }

                await Reward.deleteMany({ spaceId });
                for (const r of uniqueRewards) {
                    await Reward.create({
                        spaceId,
                        id: r.id,
                        name: r.name,
                        description: r.description,
                        xp: r.xp,
                        value: r.value,
                        typeId: r.typeId,
                        typeName: r.typeName,
                        instruction: r.instruction,
                        condition: r.condition,
                        platformShared: r.platformShared,
                        images: r.images,
                        tags: r.tags,
                        groups: r.groups,
                        obj: r.obj
                    });
                    stats.rewards++;
                }
                console.log(`     ✅ ${uniqueRewards.length} rewards saved`);
            }
        }
    }

    // Fetch parameters for this space
    if (importConfig.import?.parameters !== false) {
        if (skipExistingParameters) {
            const existing = await Parameter.findOne({ targetId: spaceId });
            if (existing) {
                console.log(`     ⏭️  Parameters already exist, skipping`);
            } else {
                const groups = "us-sdkClientFeaturesSwitches,us-GlobalSpaceConfig,us-sdkClientRemoteLogsGame,us-sdkClientSettings,us-sdkClientSettingsHttpGame,us-sdkClientSettingsHttpInternal,us-sdkClientUrls,us-sdkClientMocks,us-sdkClientRemoteLogsInternal,us-sdkClientNotificationsGame,us-sdkClientNotificationsInternal,us-sdkClientNotificationsSpaceIds,us-override,us-sdkClientSettingsCacheTTL,us-sdkClientSettingsSecondaryStoreSync,us-sdkClientStorm,us-sdkClientSettingsWebSocketGame,us-sdkClientSettingsWebSocketInternal,jd-constantsFriends,jd-constantsHome,jd-constantsHttp,jd-constantsJDVersion,jd-constantsQuest,jd-constantsRecommendation,jd-constantsRelatedSongs,jd-constantsRelatedSongsAutoplay,jd-constantsRelatedSongsAutoplayTimer,jd-constantsSongsSortingByRecommendation,jd-constantsSubscription_Service,jd-constantsUnlockable,jd-constantsWDF,jd-constantsWall,jd-constantsUpsell,jd-customFeatureSwitches,jd-serverInfo,jd-constantsQuickplayDesignRules,jd-constantsQuickplayTimer,jd-constantsQuickplayFallbackLists";
                const parametersData = await get(`/v1/spaces/${spaceId}/parameters?parameterGroups=${groups}`);
                if (parametersData) {
                    await Parameter.findOneAndUpdate(
                        { targetId: spaceId },
                        { targetId: spaceId, parameters: parametersData },
                        { upsert: true, new: true }
                    );
                    stats.parameters++;
                    console.log(`     ✅ Parameters saved`);
                }
            }
        } else {
            const groups = "us-sdkClientFeaturesSwitches,us-GlobalSpaceConfig,us-sdkClientRemoteLogsGame,us-sdkClientSettings,us-sdkClientSettingsHttpGame,us-sdkClientSettingsHttpInternal,us-sdkClientUrls,us-sdkClientMocks,us-sdkClientRemoteLogsInternal,us-sdkClientNotificationsGame,us-sdkClientNotificationsInternal,us-sdkClientNotificationsSpaceIds,us-override,us-sdkClientSettingsCacheTTL,us-sdkClientSettingsSecondaryStoreSync,us-sdkClientStorm,us-sdkClientSettingsWebSocketGame,us-sdkClientSettingsWebSocketInternal,jd-constantsFriends,jd-constantsHome,jd-constantsHttp,jd-constantsJDVersion,jd-constantsQuest,jd-constantsRecommendation,jd-constantsRelatedSongs,jd-constantsRelatedSongsAutoplay,jd-constantsRelatedSongsAutoplayTimer,jd-constantsSongsSortingByRecommendation,jd-constantsSubscription_Service,jd-constantsUnlockable,jd-constantsWDF,jd-constantsWall,jd-constantsUpsell,jd-customFeatureSwitches,jd-serverInfo,jd-constantsQuickplayDesignRules,jd-constantsQuickplayTimer,jd-constantsQuickplayFallbackLists";
            const parametersData = await get(`/v1/spaces/${spaceId}/parameters?parameterGroups=${groups}`);
            if (parametersData) {
                await Parameter.findOneAndUpdate(
                    { targetId: spaceId },
                    { targetId: spaceId, parameters: parametersData },
                    { upsert: true, new: true }
                );
                stats.parameters++;
                console.log(`     ✅ Parameters saved`);
            }
        }
    }

    // Fetch events definitions
    if (importConfig.import?.eventsDefinitions !== false) {
        let skip = false;
        if (skipExistingEventsDefinitions) {
            const existing = await EventsDefinition.findOne({ spaceId });
            if (existing) {
                console.log(`     ⏭️  Events definitions already exist, skipping`);
                skip = true;
            }
        }

        if (!skip) {
            const eventsDef = await get(`/v1/spaces/${spaceId}/eventsDefinitions`);
            if (eventsDef) {
                await EventsDefinition.findOneAndUpdate(
                    { spaceId },
                    { spaceId, attributes: eventsDef.attributes, compositions: eventsDef.compositions, signals: eventsDef.signals },
                    { upsert: true, new: true }
                );
                console.log(`     ✅ Events definitions saved`);
            }
        }
    }



    // Recursively walk up the tree (parentSpaceId)
    if (spaceData.parentSpaceId) {
        await importSpace(spaceData.parentSpaceId, visitedSpaces);
    }

    return spaceData;
}

/**
 * Fetch and upsert a single app plus its configuration and full space chain.
 */
async function importApp(appId, visitedSpaces) {
    console.log(`\n📦 App: ${appId}`);

    let appData = null;
    if (skipExistingApps) {
        appData = await App.findOne({ appId }).lean();
        if (appData) {
            console.log(`  ⏭️  App already exists, skipping configuration update: ${appData.name}`);
        }
    }

    if (!appData) {
        appData = await get(`/v1/applications/${appId}`);
    }

    if (!appData) { stats.errors++; return; }

    // Fetch configuration
    if (importConfig.import?.apps !== false && (!skipExistingApps || !appData._id)) {
        const configData = await get(`/v1/applications/${appId}/configuration`);
        const configuration = configData?.configuration || {};

        // Strip platformConfig — we regenerate it from DB fields at query time
        delete configuration.platformConfig;

        await App.findOneAndUpdate(
            { appId: appData.applicationId || appId },
            {
                appId: appData.applicationId || appId,
                name: appData.name || "",
                platform: (appData.platform || "").toLowerCase(),
                spaceId: appData.spaceId || null,
                uplayGameCode: appData.uplayGameCode || null,
                buildId: appData.buildId || null,
                userAgent: appData.userAgent || null,
                configuration
            },
            { upsert: true, new: true }
        );
        stats.apps++;
        console.log(`  ✅ App saved: ${appData.name}`);
    }

    // Fetch parameters for this app
    if (importConfig.import?.parameters !== false) {
        if (skipExistingParameters) {
            const existing = await Parameter.findOne({ targetId: appId });
            if (existing) {
                console.log(`     ⏭️  Parameters already exist, skipping`);
            } else {
                const groups = "us-staging,us-sdkClientUrlsPlaceholders,us-sdkClientHttpConfig,us-sdkClientClub,us-sdkClientFeaturesSwitches,us-sdkClientLogin,us-sdkClientUrls,us-sdkClientChina,us-sdkClientUplay,us-sdkClientFleet,us-sdkClientGlobalAppConfig";
                const parametersData = await get(`/v1/applications/${appId}/parameters?parameterGroups=${groups}`);
                if (parametersData) {
                    await Parameter.findOneAndUpdate(
                        { targetId: appId },
                        { targetId: appId, parameters: parametersData },
                        { upsert: true, new: true }
                    );
                    stats.parameters++;
                    console.log(`     ✅ Parameters saved`);
                }
            }
        } else {
            const groups = "us-staging,us-sdkClientUrlsPlaceholders,us-sdkClientHttpConfig,us-sdkClientClub,us-sdkClientFeaturesSwitches,us-sdkClientLogin,us-sdkClientUrls,us-sdkClientChina,us-sdkClientUplay,us-sdkClientFleet,us-sdkClientGlobalAppConfig";
            const parametersData = await get(`/v1/applications/${appId}/parameters?parameterGroups=${groups}`);
            if (parametersData) {
                await Parameter.findOneAndUpdate(
                    { targetId: appId },
                    { targetId: appId, parameters: parametersData },
                    { upsert: true, new: true }
                );
                stats.parameters++;
                console.log(`     ✅ Parameters saved`);
            }
        }
    }


    // Walk the space tree starting from the app's spaceId
    if (appData.spaceId) {
        await importSpace(appData.spaceId, visitedSpaces);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("\n🚢 Harbour Import Tool");
    console.log(`   Base URL : ${baseUrl}`);
    console.log(`   App IDs  : ${appIds.join(", ")}`);
    console.log("");

    // Connect to MongoDB
    const dbURI = `mongodb://${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || "harbour-db"}`;
    console.log(`🗄  Connecting to MongoDB: ${dbURI}`);
    await mongoose.connect(dbURI);
    console.log("   Connected.\n");

    const visitedSpaces = new Set();

    for (const appId of appIds) {
        try {
            await importApp(appId.trim(), visitedSpaces);
        } catch (e) {
            console.error(`❌ Fatal error importing ${appId}: ${e.message}`);
            stats.errors++;
        }
    }

    await mongoose.disconnect();

    console.log("\n─────────────────────────────");
    console.log("✅ Import complete");
    console.log(`   Apps     : ${stats.apps}`);
    console.log(`   Spaces   : ${stats.spaces}`);
    console.log(`   Entities : ${stats.entities}`);
    console.log(`   Events   : ${stats.events}`);
    console.log(`   Populations: ${stats.populations}`);
    console.log(`   Actions  : ${stats.actions}`);
    console.log(`   Rewards  : ${stats.rewards}`);
    console.log(`   Parameters: ${stats.parameters}`);

    if (stats.errors) console.log(`   Errors   : ${stats.errors}`);

    console.log("─────────────────────────────\n");
}

main().catch(e => {
    console.error("Fatal:", e.message);
    process.exit(1);
});
