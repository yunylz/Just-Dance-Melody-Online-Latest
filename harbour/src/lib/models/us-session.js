const mongoose = require('mongoose');

const usSessionSchema = new mongoose.Schema({
    harbourSessionId: { type: String, required: true, unique: true }, // foreign key to Session
    usSessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // usUserId
    profileId: { type: String, required: true }, // usProfileId
    nameOnPlatform: { type: String, required: true },
    ticket: { type: String, required: true }, // full Ubiservices JWE token
    expiration: { type: Date, required: true }, // mirrors Session.expiration
}, { timestamps: true });

// Auto-delete when expiration passes — mirrors the Session TTL
usSessionSchema.index({ expiration: 1 }, { expireAfterSeconds: 0 });

const UbiservicesSession = mongoose.model('UbiservicesSession', usSessionSchema);
module.exports = UbiservicesSession;