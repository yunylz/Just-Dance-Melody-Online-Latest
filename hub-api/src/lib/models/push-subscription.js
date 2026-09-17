const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String, default: null }
}, { timestamps: true });

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
module.exports = PushSubscription;
