import mongoose from "mongoose";

import { createLogger } from "../logger";
const logger = createLogger({ service: "mongodb-client" });

export default async (dbURI: string) => {
    mongoose.set('strictQuery', false);

    try {
        await mongoose.connect(dbURI);
        logger.info("Connected to MongoDB!");
    } catch (err) {
        logger.error("Failed to connect to MongoDB:", err);
        throw err;
    }

    mongoose.connection.on("error", (err: any) => {
        logger.error("MongoDB connection error:", err);
    });
};