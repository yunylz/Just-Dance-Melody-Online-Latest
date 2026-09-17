const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    mapName: { type: String },
    assets: {
        cover: { type: String },
        audioPreview: { type: String }
    },
    title: { type: String },
    artist: { type: String },
    jdVersion: { type: String },
    coachCount: { type: Number },
    credits: { type: String },
    duration: { type: Number },
    difficulty: { type: String },
    sweatDifficulty: { type: String },
    tags: { type: [String] },
    isAlternative: { type: Boolean },
    isMashup: { type: Boolean },
    isFanmade: { type: Boolean },
    isKids: { type: Boolean },
    isPatreon: { type: Boolean }
}, { _id: false });

const songdbCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'songdb'
    cacheId: { type: String, default: 'songdb', unique: true },
    songs: { type: [songSchema], default: [] },
    computedAt: { type: Date, default: null }
});

const SongDBCache = mongoose.model('SongDBCache', songdbCacheSchema);
module.exports = SongDBCache;
