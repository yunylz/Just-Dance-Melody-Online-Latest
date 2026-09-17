const mongoose = require('mongoose');

const aliasCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'aliases'
    cacheId: { type: String, default: 'aliases', unique: true },
    aliases: { type: [mongoose.Schema.Types.Mixed], default: [] },
    computedAt: { type: Date, default: null }
});

const AliasCache = mongoose.model('AliasCache', aliasCacheSchema);
module.exports = AliasCache;
