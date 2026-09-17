global.root = __dirname;
require("dotenv").config({ quiet: true });

const async = require("async");
const express = require("express");

const config = require("./config");

const middleware = require("./lib/middleware");
const loadClients = require("./lib/load-clients");
const loadServices = require("./lib/load-services");
const utils = require("./lib/utils");
const logger = require("./lib/logger").createLogger({ service: "dp-hub" });

const app = express();

async.waterfall(
  [
    // 1. Load config (already loaded above, so just pass it along)
    function (callback) {
      callback(null, config);
    },

    // 2. Set middlewares
    function (config, callback) {
      middleware.init(app);
      callback(null, config);
    },

    // 3. Load clients
    function (config, callback) {
      loadClients();
      callback(null, config);
    },

    // 4. Load services
    function (config, callback) {
      loadServices(app);
      callback(null, config);
    },

    // 5. Start the server
    function (config, callback) {
      app.listen(config.PORT, config.HOSTNAME, () => {
        logger.info(
          `Server running on PORT ${config.PORT} in "${config.ENV}" environment.`
        );
        callback(null);
      });
    },

    // 6. Initialize push notifications
    function (callback) {
      const push = require("./lib/push");
      push.init();
      callback(null);
    },

    // 7. Start background workers
    function (callback) {
      const patreonSync = require("./lib/workers/patreonSync");
      patreonSync.start();
      callback(null);
    },

    // 8. Check spotlight cache on boot — recompute in background if missing or stale
    function (callback) {
      const jmcs = require("./lib/jmcs");
      const SPOTLIGHT_TTL_MS = 3 * 60 * 60 * 1000;

      jmcs.getSpotlightCache().then(cache => {
        if (!cache) {
          logger.info("Spotlight cache missing on boot — starting background computation");
          jmcs.computeSpotlight().catch(err => {
            logger.error(`Boot-time spotlight computation failed: ${err.message}`);
          });
        } else {
          const isStale = (Date.now() - new Date(cache.computedAt).getTime()) > SPOTLIGHT_TTL_MS;
          if (isStale) {
            logger.info("Spotlight cache stale on boot — starting background refresh");
            jmcs.computeSpotlight().catch(err => {
              logger.error(`Boot-time spotlight refresh failed: ${err.message}`);
            });
          } else {
            logger.info(`Spotlight cache is fresh (computed at ${cache.computedAt})`);
          }
        }
      }).catch(err => {
        logger.error(`Failed to check spotlight cache on boot: ${err.message}`);
      }).finally(() => callback(null));
    },

    // 9. Setup the error middleware
    function (callback) {
      app.use(middleware.errorHandler)
    }
  ],
  function (err) {
    if (err) {
      logger.error("Error during server startup", err);
      process.exit(1);
    }
  }
);
