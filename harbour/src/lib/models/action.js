const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema({
    spaceId: { type: String, required: true, index: true },
    id: { type: String, required: true }, // The ID from Ubisoft/Harbour
    name: { type: String, required: true },
    description: { type: String },
    xp: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    isBadge: { type: Boolean, default: false },
    activationDate: { type: Date },
    available: { type: Boolean, default: true },
    images: [{
        type: { type: String },
        url: { type: String }
    }],
    tags: [String],
    groups: [{
        id: String,
        name: String
    }],
    obj: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
    timestamps: true,
    collection: "actions"
});

// Compound index for uniqueness per space
actionSchema.index({ spaceId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model("Action", actionSchema);
