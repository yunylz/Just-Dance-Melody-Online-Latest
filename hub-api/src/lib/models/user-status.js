const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  lastPingAt: { type: Date, default: Date.now }
}, { timestamps: true });

const UserStatus = mongoose.model('UserStatus', userStatusSchema);
module.exports = UserStatus;
