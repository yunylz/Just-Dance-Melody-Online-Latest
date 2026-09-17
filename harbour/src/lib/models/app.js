const mongoose = require("mongoose");

/**
 * A registered application (one per platform per game title).
 * `platform` stores the platform ID string (e.g. "nx", "wiiu").
 * `configuration` stores the full Harbour configuration JSON blob.
 */
const appSchema = new mongoose.Schema({
    appId:         { type: String, required: true, unique: true },
    name:          { type: String, required: true },
    platform:      { type: String, required: true },
    spaceId:       { type: String, default: null },
    uplayGameCode: { type: String, default: null },
    buildId:       { type: String, default: null },
    userAgent:     { type: String, default: null },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    gameId:        { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("App", appSchema);
