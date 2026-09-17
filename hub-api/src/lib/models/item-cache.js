const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    id: { type: String },
    url: { type: String }
}, { _id: false });

const skinSchema = new mongoose.Schema({
    id: { type: String },
    url: { type: String }
}, { _id: false });

const portraitBorderSchema = new mongoose.Schema({
    id: { type: String },
    backgroundUrl: { type: String },
    foregroundUrl: { type: String }
}, { _id: false });

const itemsSchema = new mongoose.Schema({
    avatars: { type: [avatarSchema], default: [] },
    skins: { type: [skinSchema], default: [] },
    portraitBorders: { type: [portraitBorderSchema], default: [] }
}, { _id: false });

const itemCacheSchema = new mongoose.Schema({
    // Singleton document — always upserted with cacheId: 'items'
    cacheId: { type: String, default: 'items', unique: true },
    items: { type: itemsSchema, default: { avatars: [], skins: [], portraitBorders: [] } },
    computedAt: { type: Date, default: null }
});

const ItemCache = mongoose.model('ItemCache', itemCacheSchema);
module.exports = ItemCache;
