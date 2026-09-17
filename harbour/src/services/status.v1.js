/**
 * @module services/status.v1
 *
 * Status / health-check endpoints modelled after UbiServices' public status API.
 *
 * `GET /v1/status` — lists all available status resources plus server metadata
 * (version, boot time, commit hash, branch, uptime, environment).
 *
 * `GET /v1/status/:resource` — returns a detailed health check for a specific
 * subsystem (databases, external services, etc.).
 *
 * Each resource endpoint responds with a consistent envelope:
 * ```json
 * {
 *   "transactionId": "<uuid>",
 *   "buildVersion": "1.2.2",
 *   "configVersion": "0.21.2",
 *   "databaseConnection": true,
 *   "databaseReadWrite": true,
 *   "dependenciesCheckSuccess": true,
 *   "weakDependenciesCheckSuccess": true,
 *   "strongDependenciesCheckSuccess": true,
 *   "hostName": "<hostname>",
 *   "hostIP": "<ip>",
 *   "serviceName": "Harbour.<Resource>",
 *   "status": "OK" | "DEGRADED" | "FAIL",
 *   "statusMessage": "...",
 *   "timeMilliseconds": 14
 * }
 * ```
 */

const { v4: uuidv4 } = require("uuid");
const os = require("node:os");
const mongoose = require("mongoose");
const config = require("../config");
const hubHelper = require("../lib/hub-helper");
const ubiservices = require("../lib/ubiservices");
const { getRedisClient } = require("../lib/clients/redis");

// ─── Available status resources ─────────────────────────────────────────────

const RESOURCES = [
  "/v1/status/applications",
  "/v1/status/authentication",
  "/v1/status/configuration",
  "/v1/status/connections",
  "/v1/status/gateway",
  "/v1/status/population",
  "/v1/status/profiles",
  "/v1/status/spaces",
  "/v1/status/users"
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds a consistent status response envelope.
 *
 * @param {Object} options
 * @param {string}  options.serviceName   - e.g. "Harbour.Applications"
 * @param {boolean} [options.dbConn=true]
 * @param {boolean} [options.dbRw=true]
 * @param {boolean} [options.depsOk=true]
 * @param {boolean} [options.weakDepsOk=true]
 * @param {boolean} [options.strongDepsOk=true]
 * @param {string}  [options.status="OK"]
 * @param {string}  [options.message]
 * @param {number}  [options.elapsed]
 * @returns {Object}
 */
const statusResponse = ({
  serviceName,
  dbConn = true,
  dbRw = true,
  depsOk = true,
  weakDepsOk = true,
  strongDepsOk = true,
  status = "OK",
  message,
  elapsed
}) => {
    return {
    transactionId: uuidv4(),
    buildVersion: config.VERSION,
    configVersion: "0.21.2",
    databaseConnection: dbConn,
    databaseReadWrite: dbRw,
    dependenciesCheckSuccess: depsOk,
    weakDependenciesCheckSuccess: weakDepsOk,
    strongDependenciesCheckSuccess: strongDepsOk,
    hostName: "***********",
    hostIP: "***********",
    serviceName,
    status,
    statusMessage: message || `Status: ${status}`,
    timeMilliseconds: elapsed || 0
  };
};

/**
 * Wraps an async health check with timing and error handling.
 *
 * @param {string}   serviceName
 * @param {Function} checkFn - async function that throws on failure
 * @returns {Promise<Object>} status response
 */
const runCheck = async (serviceName, checkFn) => {
  const start = Date.now();
  try {
    await checkFn();
    return statusResponse({
      serviceName,
      elapsed: Date.now() - start,
      status: "OK",
      message: "Status: OK"
    });
  } catch (err) {
    return statusResponse({
      serviceName,
      elapsed: Date.now() - start,
      status: "FAIL",
      message: err.message || "Status: FAIL",
      dbConn: false,
      dbRw: false,
      depsOk: false,
      weakDepsOk: false,
      strongDepsOk: false
    });
  }
};

/**
 * Pings MongoDB by running a lightweight command.
 */
const checkMongo = async () => {
  await mongoose.connection.db.admin().ping();
};

/**
 * Pings Redis by running a simple PING command.
 */
const checkRedis = async () => {
  const redis = getRedisClient();
  await redis.ping();
};

/**
 * Checks Hub connectivity by pinging its status endpoint.
 */
const checkHub = async () => {
  const ok = await hubHelper.ping();
  if (!ok) throw new Error("Hub did not respond");
};

// ─── Resource health checks ─────────────────────────────────────────────────

const checks = {
  applications: async () => {
    const App = require("../lib/models/app");
    const count = await App.countDocuments();
    return statusResponse({
      serviceName: "Harbour.Applications",
      elapsed: 0,
      message: `Status: OK (${count} apps registered)`
    });
  },

  authentication: async () => {
    // Auth system check — verify we can reach Hub
    const ok = await hubHelper.ping();
    if (!ok) throw new Error("Hub authentication service unreachable");

    return statusResponse({
      serviceName: "Harbour.Authentication",
      elapsed: 0,
      message: "Status: OK"
    });
  },

  configuration: async () => {
    return statusResponse({
      serviceName: "Harbour.Configuration",
      elapsed: 0,
      message: "Status: OK"
    });
  },

  connections: async () => {
    // Aggregated check of all external dependencies
    const start = Date.now();
    const results = await Promise.allSettled([
      checkMongo(),
      checkRedis(),
      checkHub()
    ]);

    const allOk = results.every(r => r.status === "fulfilled");
    const strongOk = results[0].status === "fulfilled" && results[1].status === "fulfilled"; // mongo + redis
    const weakOk = results[2].status === "fulfilled" && results[3].status === "fulfilled"; // hub + ubiservices

    const failures = results
      .filter(r => r.status === "rejected")
      .map(r => r.reason?.message || "unknown");

    return statusResponse({
      serviceName: "Harbour.Connections",
      elapsed: Date.now() - start,
      dbConn: results[0].status === "fulfilled",
      dbRw: results[0].status === "fulfilled",
      depsOk: allOk,
      weakDepsOk: weakOk,
      strongDepsOk: strongOk,
      status: allOk ? "OK" : "DEGRADED",
      message: allOk
        ? "All external connections healthy"
        : `Degraded: ${failures.join("; ")}`
    });
  },

  gateway: async () => {
    return statusResponse({
      serviceName: "Harbour.Gateway",
      elapsed: 0,
      message: "Status: OK"
    });
  },

  population: async () => {
    const Population = require("../lib/models/population");
    const count = await Population.countDocuments();
    return statusResponse({
      serviceName: "Harbour.Population",
      elapsed: 0,
      message: `Status: OK (${count} populations)`
    });
  },

  profiles: async () => {
    // Profile system check — verify Hub is reachable
    const ok = await hubHelper.ping();
    if (!ok) throw new Error("Hub profiles service unreachable");

    return statusResponse({
      serviceName: "Harbour.Profiles",
      elapsed: 0,
      message: "Status: OK"
    });
  },

  spaces: async () => {
    const Space = require("../lib/models/space");
    const count = await Space.countDocuments();
    return statusResponse({
      serviceName: "Harbour.Spaces",
      elapsed: 0,
      message: `Status: OK (${count} spaces)`
    });
  },

  users: async () => {
    // Hub connectivity check
    const ok = await hubHelper.ping();
    if (!ok) throw new Error("Hub users service unreachable");

    return statusResponse({
      serviceName: "Harbour.Users",
      elapsed: 0,
      message: "Status: OK"
    });
  }
};

// ─── Service registration ───────────────────────────────────────────────────

/**
 * @param {import("express").Application} app
 * @param {import("express").Router}      publicRouter
 * @param {import("express").Router}      privateRouter
 * @param {import("winston").Logger}      logger
 */
module.exports = (app, publicRouter, privateRouter, logger) => {

  // ─── GET /v1/status ──────────────────────────────────────────────────────

  /**
   * Lists all available status resources and server metadata.
   *
   * Response:
   * ```json
   * {
   *   "info": "Available resources for status",
   *   "resources": ["/v1/status/applications", ...],
   *   "server": {
   *     "version": "1.2.2",
   *     "environment": "local",
   *     "bootTime": "2026-06-25T21:00:00.000Z",
   *     "uptimeSeconds": 3600,
   *     "commit": "06c48c5",
   *     "branch": "dev",
   *     "nodeVersion": "v22.x",
   *     "hostname": "localhost"
   *   }
   * }
   * ```
   */
  publicRouter.get("/", (req, res) => {
    const resources = RESOURCES.map(r => r);

    res.json({
      info: "Available resources for status",
      resources,
      server: {
        version: config.VERSION,
        environment: config.ENV,
        bootTime: global.bootTime,
        uptimeSeconds: Math.floor(process.uptime()),
        commit: global.gitCommit,
        branch: global.gitBranch,
        nodeVersion: process.version,
        hostname: "***********",
        platform: `${os.platform()} ${os.release()}`
      }
    });
  });

  // ─── GET /v1/status/:resource ────────────────────────────────────────────

  /**
   * Returns a detailed health check for a specific subsystem.
   */
  publicRouter.get("/:resource", async (req, res) => {
    const { resource } = req.params;

    const checkFn = checks[resource];
    if (!checkFn) {
      return res.status(404).json({
        transactionId: uuidv4(),
        buildVersion: config.VERSION,
        configVersion: "0.21.2",
        serviceName: "Harbour.Status",
        status: "FAIL",
        statusMessage: `Unknown resource: ${resource}`,
        timeMilliseconds: 0
      });
    }

    try {
      const result = await checkFn();
      return res.json(result);
    } catch (err) {
      logger.error({ message: `Status check failed for "${resource}"`, error: err.message });
      return res.json(
        statusResponse({
          serviceName: `Harbour.${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
          status: "FAIL",
          message: err.message
        })
      );
    }
  });
};
