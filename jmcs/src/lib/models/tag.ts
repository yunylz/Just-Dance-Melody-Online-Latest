import { Schema, model } from "mongoose";

const tagSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    color: {
        type: String,
        default: "#4f46e5"
    },
    description: {
        type: String,
        default: ""
    }
});

export const Tag = model("Tag", tagSchema);
