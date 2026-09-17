import mongoose from "mongoose";
import { createClient } from "redis";

import config from "../config";
import mongodb from "./clients/mongodb";
import { connectRedis } from "./clients/redis";

import { createLogger } from "./logger";
const logger = createLogger({ service: "load-clients" });

export default async () => {
    // 1. Connect to MongoDB first.
    try {
        const dbURI = config.MONGODB_URI as string;
        await mongodb(dbURI);
    }
    catch (err: any) {
        logger.error("Failed to connect to MongoDB:", err);
        throw err;
    };

    try {
        await connectRedis(config.REDIS_URI as string);
        logger.info("Connected to Redis!");
    } catch (err: any) {
        logger.error("Failed to connect to Redis:", err);
        throw err;
    }
};