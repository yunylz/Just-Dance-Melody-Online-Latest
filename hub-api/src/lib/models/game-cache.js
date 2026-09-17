const mongoose = require('mongoose');

const gameCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'games'
    cacheId: { type: String, default: 'games', unique: true },
    games: { type: [mongoose.Schema.Types.Mixed], default: [] },
    computedAt: { type: Date, default: null }
});

const GameCache = mongoose.model('GameCache', gameCacheSchema);
module.exports = GameCache;
