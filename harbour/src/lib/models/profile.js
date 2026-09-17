const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    profileId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    platformType: { type: String },
    idOnPlatform: { type: String },
    nameOnPlatform: { type: String }
}, {
    timestamps: true,
    collection: "profiles"
});

module.exports = mongoose.model("Profile", profileSchema);
