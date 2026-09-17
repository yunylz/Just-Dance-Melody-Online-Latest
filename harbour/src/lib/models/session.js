const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  env: { type: String, required: true },
  date: { type: Date, required: true },
  sessionId: { type: String, required: true },
  appId: { type: String, required: true },
  spaceId: { type: String, required: true },
  platform: { type: String, required: true },
  platformType: { type: String, required: true },
  userId: { type: String, required: true },
  profileId: { type: String, required: true },
  expiration: { type: Date, required: true },
  isAdmin: { type: Boolean, default: false },
  isModerator: { type: Boolean, default: false },
  jmcsEnv: { type: String, default: "prod" },
  isGuest: { type: Boolean, default: false },
  verifyCode: { type: String, default: null }
}, { timestamps: true });

// TTL index: document will be removed once "expiration" < now
sessionSchema.index({ expiration: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ verifyCode: 1 }); // for Hub → Harbour code lookup

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
