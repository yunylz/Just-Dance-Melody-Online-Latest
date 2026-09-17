const mongoose = require('mongoose');

const spotlightPlayerSchema = new mongoose.Schema({
    username: { type: String },
    name: { type: String },
    avatar: { type: Number },
    country: { type: Number },
    portraitBorder: { type: Number },
    alias: { type: Number },
    aliasGender: { type: Number },
    points: { type: Number },
    reputationScore: { type: Number },
    profileId: { type: String },
    userId: { type: String },
    version: { type: String },
    totalStars: { type: Number },
    averageScore: { type: Number },
    songsPlayed: { type: Number },
    bestScore: { type: Number },
    platform: { type: String },
    wdfRank: { type: Number },
    unlocks: { type: Number },
    rank: { type: Number }
}, { _id: false });

const spotlightCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'spotlight'
    cacheId: { type: String, default: 'spotlight', unique: true },
    players: { type: [spotlightPlayerSchema], default: [] },
    total: { type: Number, default: 0 },
    computedAt: { type: Date, default: null }
});

const SpotlightCache = mongoose.model('SpotlightCache', spotlightCacheSchema);
module.exports = SpotlightCache;
