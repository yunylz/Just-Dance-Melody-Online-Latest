const mongoose = require('mongoose');

const playlistColorsSchema = new mongoose.Schema({
    baseColor: { type: String },
    gradColor: { type: String }
}, { _id: false });

const playlistSchema = new mongoose.Schema({
    playlistId: { type: String },
    songs: { type: [String] },
    title: { type: String },
    description: { type: String },
    cover: { type: String },
    fallback: { type: Boolean },
    colors: { type: playlistColorsSchema, default: {} }
}, { _id: false });

const playlistCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'playlists'
    cacheId: { type: String, default: 'playlists', unique: true },
    playlists: { type: [playlistSchema], default: [] },
    computedAt: { type: Date, default: null }
});

const PlaylistCache = mongoose.model('PlaylistCache', playlistCacheSchema);
module.exports = PlaylistCache;
