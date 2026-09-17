import mongoose, { Schema, model } from "mongoose";

const objectiveSchema = new Schema({
    Description: { type: Number, required: true },
    MinimumValue: { type: Number, required: true },
    ObjectiveType: { type: Number },
    __class: { type: String, required: true }
}, { _id: false });

const aliasSchema = new Schema({
    aliasId: {
        type: String,
        required: true,
        unique: true
    },
    DescriptionLocID: {
        type: Number,
        default: null
    },
    DifficultyColor: {
        type: Number,
        default: 0
    },
    RestrictedToUnlimitedSongs: {
        type: Number,
        default: 0
    },
    StringLocID: {
        type: Number,
        required: true
    },
    StringLocIDFemale: {
        type: Number,
        default: null
    },
    StringPlaceholder: {
        type: String,
        default: ""
    },
    // We'll store UnlockObjectives as a map of gameVersion -> objective
    // "common" is the default.
    UnlockObjectives: {
        type: Map,
        of: objectiveSchema,
        default: {}
    },
    __class: {
        type: String,
        default: "JD_UnlockableAliasDescriptor"
    }
});

export default model("Alias", aliasSchema);
