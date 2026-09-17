const mongoose = require("mongoose");

const trackingSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    profileId: { type: String, required: true },
    gameSessionId: { type: String },
    playerSessionId: { type: String },
    spaceId: { type: String },
    platform: { type: String },
    events: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, {
    timestamps: true,
    collection: "tracking"
});

// Compound index for efficient "latest per user" lookups
trackingSchema.index({ userId: 1, createdAt: -1 });

// TTL index: auto-delete documents after 7 days
trackingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model("Tracking", trackingSchema);
