const mongoose = require("mongoose");
const config = require("../config");
const logger = require("./logger").createLogger({ service: "load-clients" });

/**
 * Loads MongoDB client and connects to the database.
 * @returns 
 */
module.exports = async () => {
    const dbURI = config.MONGODB_URI;
    if (!dbURI) {
        throw new Error("MONGODB_URI is not defined");
    }

    mongoose.set('strictQuery', false);

    return new Promise((resolve, reject) => {
        mongoose.connect(dbURI, {})
            .then(() => {
                global.dbClient = mongoose.connection.getClient();
                logger.success("Connected to MongoDB!");
                resolve();
            })
            .catch((err) => {
                logger.error("Failed to connect to MongoDB:", err);
                reject(err);
            });

        // Optional: handle connection errors that happen after initial connect
        mongoose.connection.on("error", (err) => {
            logger.error("MongoDB connection error:", err);
        });
    });
};
