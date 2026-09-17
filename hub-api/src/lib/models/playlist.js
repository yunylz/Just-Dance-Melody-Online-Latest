const mongoose = require('mongoose');
const uuid = require('uuid');

const playlistSchema = new mongoose.Schema({
  id: { type: String, default: uuid.v4, unique: true },
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  songs: [{
    mapName: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    coverUrl: { type: String }
  }],
  isPublic: { type: Boolean, default: false, index: true },
  sharedWith: [{ type: String }], // Array of userIds
  clonedFrom: { type: String, default: null }, // Original playlist id if cloned
  stats: {
    clones: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
playlistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Playlist = mongoose.model('Playlist', playlistSchema);
module.exports = Playlist;
