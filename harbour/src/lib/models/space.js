const mongoose = require("mongoose");

/**
 * A Ubisoft space, mirroring the original Harbour space structure exactly.
 * Spaces form a 3-level tree: brand → installment → title.
 */
const spaceSchema = new mongoose.Schema({
    spaceId: { type: String, required: true, unique: true },
    spaceType: { type: String, enum: ["brand", "installment", "title"], default: "title" },
    spaceName: { type: String, required: true },
    parentSpaceId: { type: String, default: null },
    parentSpaceName: { type: String, default: "" },
    releaseType: { type: String, default: "" },
    platformType: { type: String, default: "" },
    dateCreated: { type: Date, default: Date.now },
    dateLastModified: { type: Date, default: Date.now },
    tags: { type: [String], default: null }
});

module.exports = mongoose.model("Space", spaceSchema);
