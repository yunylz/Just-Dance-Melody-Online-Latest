import mongoose, { Schema, model } from "mongoose";

interface IContentAuth {
    mapName: string;
    blockName: string;
    type: "map" | "block";
    urls: Record<string, string>;
};

const contentAuthSchema = new Schema<IContentAuth>({
    mapName: {
        type: String,
        required: true,
        unique: true
    },
    blockName: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true,
        enum: ["map", "block"],
        default: "map"
    },
    urls: {
        type: Object,
        required: true
    }
}, { versionKey: false });

export default model("ContentAuth", contentAuthSchema);