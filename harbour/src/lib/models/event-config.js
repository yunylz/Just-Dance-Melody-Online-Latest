const mongoose = require("mongoose");

/**
 * Event configuration for a space.
 * GET /v4/spaces/:spaceId/configs/events
 */
const eventConfigSchema = new mongoose.Schema({
    spaceId: { type: String, required: true, unique: true },
    types:   { type: [String], default: [] },
    s2sConfig: {
        maxBatchSize:                  { type: Number, default: 2500 },
        sendPeriodSeconds:             { type: Number, default: 1 },
        sendPlayerEventsPeriodSeconds: { type: Number, default: 30 }
    },
    publicConfig: {
        sendPeriodSeconds: { type: Number, default: 30 },
        hmacEnabled:       { type: Boolean, default: false }
    }
});

module.exports = mongoose.model("EventConfig", eventConfigSchema);
