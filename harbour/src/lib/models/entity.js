const mongoose = require("mongoose");

/**
 * A space entity. `obj` is a free-form JSON object whose structure
 * depends on the entity `type` (e.g. "server", "song_info").
 */
const entitySchema = new mongoose.Schema({
    entityId:     { type: String, required: true, unique: true },
    spaceId:      { type: String, required: true, index: true },
    type:         { type: String, required: true },
    name:         { type: String, required: true },
    tags:         { type: [String], default: [] },
    obj:          { type: mongoose.Schema.Types.Mixed, default: {} },
    lastModified: { type: Date, default: Date.now },
    revision:     { type: Number, default: 1 }
});

module.exports = mongoose.model("Entity", entitySchema);
