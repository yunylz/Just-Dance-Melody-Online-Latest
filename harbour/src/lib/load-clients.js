const mongoose = require("mongoose");
const config = require("../config");
const { connectRedis } = require("./clients/redis");
const logger = require("./logger").createLogger({ service: "load-clients" });

module.exports = async () => {
  if (!config.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (!config.REDIS_URI) {
    throw new Error("REDIS_URI is not defined");
  }

  try {
    // 1. Connect to MongoDB
    mongoose.set('strictQuery', false);
    await mongoose.connect(config.MONGODB_URI, {});
    global.dbClient = mongoose.connection.getClient();
    logger.success("Connected to MongoDB!");

    // 2. Connect to Redis
    const redisClient = await connectRedis(config.REDIS_URI);
    global.cacheClient = redisClient;
    logger.success("Connected to Redis!");

    // Optional: handle connection errors that happen after initial connect
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

  } catch (err) {
    logger.error("Failed to load clients:", err);
    throw err;
  }
};