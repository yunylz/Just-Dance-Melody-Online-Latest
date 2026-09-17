const mongoose = require("mongoose");

/**
 * Configuration parameters for apps and spaces.
 * `targetId` is either an appId or a spaceId.
 * `parameters` is the full JSON blob containing parameter groups and fields.
 */
const parameterSchema = new mongoose.Schema({
    targetId: { type: String, required: true, unique: true },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model("Parameter", parameterSchema);
