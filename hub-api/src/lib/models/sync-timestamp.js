const mongoose = require("mongoose");

const syncTimestampSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    lastSyncAt: { type: Date, default: null }
}, { timestamps: true });

const SyncTimestamp = mongoose.model("SyncTimestamp", syncTimestampSchema);
module.exports = SyncTimestamp;
