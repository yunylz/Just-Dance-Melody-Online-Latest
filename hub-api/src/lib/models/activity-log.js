const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
    adminId: { type: String, required: true, index: true },
    adminUsername: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: String, index: true },
    targetUsername: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
}, { collection: "activity_logs" });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
