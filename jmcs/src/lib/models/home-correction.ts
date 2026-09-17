import mongoose, { Schema, model } from "mongoose";

const homeCorrectionSchema = new Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    correction: {
        type: Object,
        required: true
    }
}, {
    timestamps: true
});

export default model("HomeCorrection", homeCorrectionSchema);
