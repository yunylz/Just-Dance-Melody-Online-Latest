const jwt = require("jsonwebtoken");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const express = require("express");

const config = require("../config");
const App = require("../lib/models/app");
const Space = require("../lib/models/space");
const Entity = require("../lib/models/entity");
const EventConfig = require("../lib/models/event-config");
const Population = require("../lib/models/population");
const Action = require("../lib/models/action");
const Reward = require("../lib/models/reward");
const Parameter = require("../lib/models/parameter");
const EventsDefinition = require("../lib/models/events-definition");

const session = require("../lib/session");
const ticket = require("../lib/ticket");
const platformDefs = require("../data/platforms");
const hubHelper = require("../lib/hub-helper");

const ADMIN_SECRET = process.env.ADMIN_TOKEN_SECRET;
const JWT_EXPIRY = "7d";

// ─── Auth middleware ──────────────────────────────────────────────────────────

/**
 * Validates the dashboard JWT from the `Authorization: Bearer <jwt>` header.
 * @type {import("express").RequestHandler}
 */
const adminAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const token = header.slice(7);
    try {
        jwt.verify(token, ADMIN_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ok = (res, data) => res.json({ ok: true, ...data });
const err = (res, msg, status = 400) => res.status(status).json({ ok: false, error: msg });

/**
 * Admin (v1)
 *
 * Full CRUD for apps, spaces, entities, and sessions.
 * All routes (except /auth/*) require the dashboard JWT.
 *
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

    // ── Auth ────────────────────────────────────────────────────────────────

    /** POST /v1/admin/auth/login — exchange secret token for a 7-day JWT 
     * @deprecated No longer used, please use the SSO.
    */
    publicRouter.post("/auth/login", (req, res) => {
        return res.sendStatus(503);
    });

    /** GET /v1/admin/auth/oidc/login — Redirect to SSO */
    publicRouter.get("/auth/oidc/login", (req, res) => {
        const { OIDC } = config;
        if (!OIDC.CLIENT_ID || !OIDC.AUTHORIZE_URL) {
            return err(res, "OIDC not configured", 500);
        }

        // Generate a secure stateless state using a short-lived JWT
        const state = jwt.sign({ nonce: uuidv4() }, ADMIN_SECRET, { expiresIn: "10m" });

        const params = new URLSearchParams({
            client_id: OIDC.CLIENT_ID,
            redirect_uri: OIDC.REDIRECT_URI,
            response_type: "code",
            scope: "openid profile email",
            state: state
        });

        return res.redirect(`${OIDC.AUTHORIZE_URL}?${params.toString()}`);
    });

    /** GET /v1/admin/auth/oidc/callback — Handle SSO response */
    const oidcCallbackHandler = async (req, res) => {
        const { code, state, error } = req.query;
        const { OIDC, ADMIN_EMAILS } = config;

        if (error) return res.redirect(`/dashboard/index.html?error=${encodeURIComponent(error)}`);
        if (!code) return res.redirect(`/dashboard/index.html?error=No%20code%20provided`);

        // 1. Verify state
        try {
            jwt.verify(state, ADMIN_SECRET);
        } catch (e) {
            logger.warn({ message: "Admin: SSO state verification failed", error: e.message });
            return res.redirect(`/dashboard/index.html?error=Invalid%20session%20state`);
        }

        try {
            // 2. Exchange code for token
            const tokenRes = await axios.post(OIDC.TOKEN_URL, new URLSearchParams({
                client_id: OIDC.CLIENT_ID,
                client_secret: OIDC.CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: OIDC.REDIRECT_URI
            }).toString(), {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token } = tokenRes.data;

            // 3. Get user info
            const userRes = await axios.get(OIDC.USERINFO_URL, {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const { email, name, picture } = userRes.data;

            // 4. Check authorization
            if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
                logger.warn({ message: "Admin: SSO unauthorized access attempt", details: { email } });
                return res.redirect(`/dashboard/index.html?error=Unauthorized%20email:%20${email}`);
            }

            // 5. Issue JWT
            const jwt_token = jwt.sign({ admin: true, email, name, picture }, ADMIN_SECRET, { expiresIn: JWT_EXPIRY });

            // 6. Set cookie for server-side auth (so we can redirect /dashboard to SSO)
            res.cookie("harbour_jwt", jwt_token, {
                httpOnly: false, // Accessible by frontend JS
                secure: config.IS_HTTPS,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // 7. Redirect back to dashboard
            return res.redirect(`/v1/admin/dashboard`);

        } catch (e) {
            logger.error({ message: "Admin: OIDC callback failed", error: e.message, details: e.response?.data });
            return res.redirect(`/v1/admin/dashboard?error=SSO%20login%20failed`);
        }
    };

    publicRouter.get("/auth/oidc/callback", oidcCallbackHandler);
    publicRouter.get("/callback", oidcCallbackHandler);

    // ── Dashboard (Server-Side) ─────────────────────────────────────────────

    // Serve assets from the dashboard folder
    publicRouter.use("/assets", express.static(require("node:path").join(global.root, "public", "dashboard")));

    /** GET /v1/admin/dashboard — Protected dashboard HTML */
    publicRouter.get("/dashboard", (req, res) => {
        const token = req.headers.cookie?.split("; ").find(row => row.startsWith("harbour_jwt="))?.split("=")[1];

        if (!token) {
            return res.redirect("/v1/admin/auth/oidc/login");
        }

        try {
            jwt.verify(token, ADMIN_SECRET);
            return res.sendFile(require("node:path").join(global.root, "public", "dashboard", "app.html"));
        } catch (e) {
            return res.redirect("/v1/admin/auth/oidc/login");
        }
    });

    publicRouter.get("/logout", (req, res) => {
        res.clearCookie("harbour_jwt");
        return res.redirect("/v1/admin/auth/oidc/login");
    });

    /** GET /v1/admin/auth/me — validate current JWT and return user info */
    publicRouter.get("/auth/me", adminAuth, (req, res) => {
        const header = req.headers.authorization;
        const token = header.slice(7);
        try {
            const payload = jwt.verify(token, ADMIN_SECRET);
            return ok(res, { user: payload });
        } catch {
            return res.status(401).json({ error: "Invalid token" });
        }
    });

    // ── Apps ────────────────────────────────────────────────────────────────

    /** GET /v1/admin/apps */
    publicRouter.get("/apps", adminAuth, async (req, res) => {
        const docs = await App.find({}).sort({ name: 1 });
        return ok(res, { apps: docs });
    });

    /** POST /v1/admin/apps */
    publicRouter.post("/apps", adminAuth, async (req, res) => {
        try {
            const doc = await App.create({ ...req.body, appId: req.body.appId || uuidv4() });
            logger.info({ message: "Admin: App created", details: { appId: doc.appId } });
            return ok(res, { app: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** GET /v1/admin/apps/:appId */
    publicRouter.get("/apps/:appId", adminAuth, async (req, res) => {
        const doc = await App.findOne({ appId: req.params.appId });
        if (!doc) return err(res, "App not found", 404);
        return ok(res, { app: doc });
    });

    /** PATCH /v1/admin/apps/:appId */
    publicRouter.patch("/apps/:appId", adminAuth, async (req, res) => {
        try {
            const doc = await App.findOneAndUpdate(
                { appId: req.params.appId },
                { $set: req.body },
                { new: true }
            );
            if (!doc) return err(res, "App not found", 404);
            logger.info({ message: "Admin: App updated", details: { appId: doc.appId } });
            return ok(res, { app: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** DELETE /v1/admin/apps/:appId */
    publicRouter.delete("/apps/:appId", adminAuth, async (req, res) => {
        const result = await App.deleteOne({ appId: req.params.appId });
        if (result.deletedCount === 0) return err(res, "App not found", 404);
        logger.info({ message: "Admin: App deleted", details: { appId: req.params.appId } });
        return ok(res, {});
    });

    /** GET /v1/admin/apps/:appId/configuration */
    publicRouter.get("/apps/:appId/configuration", adminAuth, async (req, res) => {
        const doc = await App.findOne({ appId: req.params.appId });
        if (!doc) return err(res, "App not found", 404);
        return ok(res, { configuration: doc.configuration || {} });
    });

    /** PUT /v1/admin/apps/:appId/configuration — replace full config blob */
    publicRouter.put("/apps/:appId/configuration", adminAuth, async (req, res) => {
        const doc = await App.findOneAndUpdate(
            { appId: req.params.appId },
            { $set: { configuration: req.body.configuration ?? req.body } },
            { new: true }
        );
        if (!doc) return err(res, "App not found", 404);
        logger.info({ message: "Admin: App configuration updated", details: { appId: doc.appId } });
        return ok(res, { configuration: doc.configuration });
    });

    // ── Spaces ──────────────────────────────────────────────────────────────

    /** GET /v1/admin/spaces */
    publicRouter.get("/spaces", adminAuth, async (req, res) => {
        const docs = await Space.find({}).sort({ spaceName: 1 });
        return ok(res, { spaces: docs });
    });

    /** POST /v1/admin/spaces */
    publicRouter.post("/spaces", adminAuth, async (req, res) => {
        try {
            const doc = await Space.create({ ...req.body, spaceId: req.body.spaceId || uuidv4() });
            return ok(res, { space: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** GET /v1/admin/spaces/:spaceId */
    publicRouter.get("/spaces/:spaceId", adminAuth, async (req, res) => {
        const doc = await Space.findOne({ spaceId: req.params.spaceId });
        if (!doc) return err(res, "Space not found", 404);
        return ok(res, { space: doc });
    });

    /** PATCH /v1/admin/spaces/:spaceId */
    publicRouter.patch("/spaces/:spaceId", adminAuth, async (req, res) => {
        try {
            const doc = await Space.findOneAndUpdate(
                { spaceId: req.params.spaceId },
                { $set: { ...req.body, dateLastModified: new Date() } },
                { new: true }
            );
            if (!doc) return err(res, "Space not found", 404);
            return ok(res, { space: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** DELETE /v1/admin/spaces/:spaceId */
    publicRouter.delete("/spaces/:spaceId", adminAuth, async (req, res) => {
        const result = await Space.deleteOne({ spaceId: req.params.spaceId });
        if (result.deletedCount === 0) return err(res, "Space not found", 404);
        // Also delete event config if it exists
        await EventConfig.deleteOne({ spaceId: req.params.spaceId });
        return ok(res, {});
    });

    /** GET /v1/admin/spaces/:spaceId/configs/events */
    publicRouter.get("/spaces/:spaceId/configs/events", adminAuth, async (req, res) => {
        const doc = await EventConfig.findOne({ spaceId: req.params.spaceId }).lean();
        const config = doc || {
            types: [],
            s2sConfig: { maxBatchSize: 2500, sendPeriodSeconds: 1, sendPlayerEventsPeriodSeconds: 30 },
            publicConfig: { sendPeriodSeconds: 30, hmacEnabled: false }
        };
        return ok(res, { config });
    });

    /** PUT /v1/admin/spaces/:spaceId/configs/events */
    publicRouter.put("/spaces/:spaceId/configs/events", adminAuth, async (req, res) => {
        try {
            const doc = await EventConfig.findOneAndUpdate(
                { spaceId: req.params.spaceId },
                { $set: { ...req.body, spaceId: req.params.spaceId } },
                { upsert: true, new: true }
            );
            return ok(res, { config: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });


    // ── Entities ────────────────────────────────────────────────────────────

    /** GET /v1/admin/spaces/:spaceId/entities */
    publicRouter.get("/spaces/:spaceId/entities", adminAuth, async (req, res) => {
        const docs = await Entity.find({ spaceId: req.params.spaceId });
        return ok(res, { entities: docs });
    });

    /** POST /v1/admin/spaces/:spaceId/entities */
    publicRouter.post("/spaces/:spaceId/entities", adminAuth, async (req, res) => {
        try {
            const doc = await Entity.create({
                ...req.body,
                spaceId: req.params.spaceId,
                entityId: req.body.entityId || uuidv4(),
                lastModified: new Date(),
                revision: 1
            });
            return ok(res, { entity: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** PATCH /v1/admin/spaces/:spaceId/entities/:entityId */
    publicRouter.patch("/spaces/:spaceId/entities/:entityId", adminAuth, async (req, res) => {
        try {
            const doc = await Entity.findOneAndUpdate(
                { entityId: req.params.entityId, spaceId: req.params.spaceId },
                { $set: { ...req.body, lastModified: new Date() }, $inc: { revision: 1 } },
                { new: true }
            );
            if (!doc) return err(res, "Entity not found", 404);
            return ok(res, { entity: doc });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** DELETE /v1/admin/spaces/:spaceId/entities/:entityId */
    publicRouter.delete("/spaces/:spaceId/entities/:entityId", adminAuth, async (req, res) => {
        const result = await Entity.deleteOne({ entityId: req.params.entityId, spaceId: req.params.spaceId });
        if (result.deletedCount === 0) return err(res, "Entity not found", 404);
        return ok(res, {});
    });

    // ── Populations, Actions, Rewards ───────────────────────────────────────

    /** GET /v1/admin/spaces/:spaceId/populations */
    publicRouter.get("/spaces/:spaceId/populations", adminAuth, async (req, res) => {
        const docs = await Population.find({ spaceId: req.params.spaceId });
        return ok(res, { populations: docs });
    });

    /** PUT /v1/admin/spaces/:spaceId/populations — replace all for this space */
    publicRouter.put("/spaces/:spaceId/populations", adminAuth, async (req, res) => {
        try {
            await Population.deleteMany({ spaceId: req.params.spaceId });
            const populations = (req.body.populations || []).map(p => ({ ...p, spaceId: req.params.spaceId }));
            if (populations.length) {
                await Population.insertMany(populations);
            }
            return ok(res, { populations });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** GET /v1/admin/spaces/:spaceId/actions */
    publicRouter.get("/spaces/:spaceId/actions", adminAuth, async (req, res) => {
        const docs = await Action.find({ spaceId: req.params.spaceId });
        return ok(res, { actions: docs });
    });

    /** PUT /v1/admin/spaces/:spaceId/actions — replace all for this space */
    publicRouter.put("/spaces/:spaceId/actions", adminAuth, async (req, res) => {
        try {
            await Action.deleteMany({ spaceId: req.params.spaceId });
            const actions = (req.body.actions || []).map(a => ({ ...a, spaceId: req.params.spaceId }));
            if (actions.length) {
                await Action.insertMany(actions);
            }
            return ok(res, { actions });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** GET /v1/admin/spaces/:spaceId/rewards */
    publicRouter.get("/spaces/:spaceId/rewards", adminAuth, async (req, res) => {
        const docs = await Reward.find({ spaceId: req.params.spaceId });
        return ok(res, { rewards: docs });
    });

    /** PUT /v1/admin/spaces/:spaceId/rewards — replace all for this space */
    publicRouter.put("/spaces/:spaceId/rewards", adminAuth, async (req, res) => {
        try {
            await Reward.deleteMany({ spaceId: req.params.spaceId });
            const rewards = (req.body.rewards || []).map(r => ({ ...r, spaceId: req.params.spaceId }));
            if (rewards.length) {
                await Reward.insertMany(rewards);
            }
            return ok(res, { rewards });
        } catch (e) {
            return err(res, e.message);
        }
    });

    // ── Parameters ──────────────────────────────────────────────────────────

    /** GET /v1/admin/apps/:appId/parameters */
    publicRouter.get("/apps/:appId/parameters", adminAuth, async (req, res) => {
        const doc = await Parameter.findOne({ targetId: req.params.appId });
        return ok(res, { parameters: doc ? doc.parameters : { parameters: {} } });
    });

    /** PUT /v1/admin/apps/:appId/parameters */
    publicRouter.put("/apps/:appId/parameters", adminAuth, async (req, res) => {
        try {
            const doc = await Parameter.findOneAndUpdate(
                { targetId: req.params.appId },
                { parameters: req.body.parameters },
                { upsert: true, new: true }
            );
            return ok(res, { parameters: doc.parameters });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** GET /v1/admin/spaces/:spaceId/parameters */
    publicRouter.get("/spaces/:spaceId/parameters", adminAuth, async (req, res) => {
        const doc = await Parameter.findOne({ targetId: req.params.spaceId });
        return ok(res, { parameters: doc ? doc.parameters : { parameters: {} } });
    });

    /** PUT /v1/admin/spaces/:spaceId/parameters */
    publicRouter.put("/spaces/:spaceId/parameters", adminAuth, async (req, res) => {
        try {
            const doc = await Parameter.findOneAndUpdate(
                { targetId: req.params.spaceId },
                { parameters: req.body.parameters },
                { upsert: true, new: true }
            );
            return ok(res, { parameters: doc.parameters });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /** PUT /v1/admin/spaces/:spaceId/eventsDefinitions */
    publicRouter.put("/spaces/:spaceId/eventsDefinitions", adminAuth, async (req, res) => {
        try {
            const { attributes, compositions, signals } = req.body;
            const doc = await EventsDefinition.findOneAndUpdate(
                { spaceId: req.params.spaceId },
                { attributes, compositions, signals },
                { upsert: true, new: true }
            );
            return ok(res, doc);
        } catch (e) {
            return err(res, e.message);
        }
    });

    // ── Sessions ────────────────────────────────────────────────────────────

    /** GET /v1/admin/sessions */
    publicRouter.get("/sessions", adminAuth, async (req, res) => {
        const sessions = await session.listSessions();
        
        // Collect unique userIds to fetch info in bulk
        const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
        let usersMap = {};

        if (userIds.length > 0) {
            try {
                // Hub API supports comma-separated userId query
                const users = await hubHelper.getUsers({ userId: userIds.join(",") });
                if (Array.isArray(users)) {
                    users.forEach(u => {
                        usersMap[u.userId] = u;
                    });
                }
            } catch (e) {
                logger.error({ message: "Admin: Failed to fetch user info for sessions", error: e.message });
            }
        }

        const enriched = sessions.map(s => ({
            ...s,
            user: usersMap[s.userId] || null
        }));

        return ok(res, { sessions: enriched });
    });

    /** DELETE /v1/admin/sessions/:sessionId */
    publicRouter.delete("/sessions/:sessionId", adminAuth, async (req, res) => {
        await session.deleteSession(req.params.sessionId);
        return ok(res, {});
    });

    // ── Platforms ───────────────────────────────────────────────────────────

    /** GET /v1/admin/platforms */
    publicRouter.get("/platforms", adminAuth, (req, res) => {
        const list = Object.values(platformDefs).map(p => ({
            id: p.id,
            name: p.name,
            authType: p.authType,
            isAvailable: p.isAvailable ?? true
        }));
        return ok(res, { platforms: list });
    });

    // ── Ticket Tools ────────────────────────────────────────────────────────

    /**
     * POST /v1/admin/tickets/decrypt
     * Body: { ticket: "<harbour-jwt>" }
     * Returns the decoded header and claims.
     */
    publicRouter.post("/tickets/decrypt", adminAuth, (req, res) => {
        try {
            const { error, result } = ticket.decrypt(req.body.ticket);
            if (error) return err(res, typeof error === "object" ? error.message : "Invalid ticket");
            return ok(res, { header: result.header, claims: result.claims });
        } catch (e) {
            return err(res, e.message);
        }
    });

    /**
     * POST /v1/admin/tickets/encrypt
     * Body: { profile, app, platform, expiration?, sessionId? }
     * Returns a signed ticket string.
     */
    publicRouter.post("/tickets/encrypt", adminAuth, (req, res) => {
        try {
            const newTicket = ticket.encrypt({
                profile: req.body.profile || {},
                app: req.body.app || {},
                platform: req.body.platform || {},
                expiration: req.body.expiration || undefined,
                sessionId: req.body.sessionId || uuidv4(),
                isS2s: req.body.isS2s || false
            });
            return ok(res, { ticket: newTicket });
        } catch (e) {
            return err(res, e.message);
        }
    });

};
