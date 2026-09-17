const { createClient } = require("redis");
const logger = require("../logger").createLogger({ service: "redis-client" });

let instance = null;

async function connectRedis(url) {
  const client = createClient({
    url
  });

  client.on("error", (err) => {
    logger.error("Redis error:", err);
  });

  client.on("ready", () => {
    logger.info("Redis is ready!");
  });

  await client.connect();
  instance = client;
  return client;
}

function getRedisClient() {
  if (!instance) {
    throw new Error("[redis] Client not initialized. Call connectRedis() first.");
  }
  return instance;
}

module.exports = {
  connectRedis,
  getRedisClient
};
