/**
 * Harbour - altered for Just Dance Melody Online
 * Originally created for DanceParty by RyuAtelier team.
 */

const project = require("../package.json");

// Set global data
global.root = __dirname;
global.project = project;

// Record server boot time
global.bootTime = new Date().toISOString();

// Capture git info at startup (commit hash, branch)
const { execSync } = require("node:child_process");
try {
  global.gitCommit = execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
  global.gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: __dirname }).toString().trim();
} catch {
  global.gitCommit = "unknown";
  global.gitBranch = "unknown";
}

// Load dotenv file
require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");

const config = require("./config");
const middleware = require("./lib/middleware");
const loadClients = require("./lib/load-clients");
const loadServices = require("./lib/load-services");
const utils = require("./lib/utils");
const logger = require("./lib/logger").createLogger({ service: global.project.name });

const app = express();

async function startServer() {
  try {
    // 1. Check if MMDB_PATH exists
    if (!fs.existsSync(config.MMDB_PATH)) {
      logger.warn({
        message: "MMDB_PATH does not exist. Country lookup will not work."
      });
    }

    // 2. Set middlewares
    if (config.LOG_HTTP_REQUESTS) {
      const logFile = path.join(__dirname, 'requests.log');
      const logFileAdmin = path.join(__dirname, 'requests-admin.log');

      logger.info("HTTP request logging enabled.");

      app.use((req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
          const duration = Date.now() - start;
          const logEntry = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms\n | Headers: ${JSON.stringify(req.headers, null, 2)} | Body: ${JSON.stringify(req.body, null, 2)}`;

          if (req.originalUrl.startsWith('/v1/admin')) {
            fs.appendFile(logFileAdmin, logEntry, (err) => { if (err) console.error('Failed to write admin log:', err); });
          } else {
            fs.appendFile(logFile, logEntry, (err) => { if (err) console.error('Failed to write log:', err); });
          }
        });

        next();
      });
    }

    await middleware.init(app);

    app.use((req, res, next) => {
      res.setHeader('Server', `${global.project.name}-${global.project.version}-${config.ENV}`);
      next();
    });

    // Serve the documentation folder on local environment
    if (utils.isLocal()) {
      app.use("/docs/", express.static(path.resolve(__dirname, "docs")));
      app.get("/docs", (req, res) => res.redirect("/docs/"));
      logger.info({
        message: "Docs available at /docs/",
        details: { url: `http://localhost:${config.PORT}/docs/` }
      });
    };

    // 3. Load clients
    loadClients();

    // 4. Load services
    loadServices(app);

    // 5. Setup the 404 handler and error middleware (last)
    app.use(middleware.notFound);
    app.use(middleware.errorHandler);

    // 6. Start the server
    const httpPort = config.HTTP_PORT;
    const httpsPort = config.HTTPS_PORT;

    http.createServer(app).listen(httpPort, () => {
      logger.info({
        message: `HTTP server running on port ${httpPort}`,
        details: { port: httpPort }
      });
    });

    const keyPath = path.resolve(__dirname, "./certs/key.pem");
    const certPath = path.resolve(__dirname, "./certs/cert.pem");

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        minVersion: "TLSv1",
        maxVersion: "TLSv1.3",
        ciphers: "ALL:@SECLEVEL=0",
        honorCipherOrder: true
      };

      https.createServer(options, app).listen(httpsPort, () => {
        logger.info({
          message: `HTTPS server running on port ${httpsPort}`,
          details: { port: httpsPort }
        });
      });
    } else {
      logger.warn("No HTTPS certificate found. HTTPS will not be available.");
    }

  } catch (err) {
    logger.error({
      message: "Error during server startup",
      details: {
        error: err,
        stack: err.stack,
        message: err.message
      }
    });
    process.exit(1);
  }
}

startServer();

