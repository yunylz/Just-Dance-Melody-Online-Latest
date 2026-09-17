import mongoose, { Schema, Document } from "mongoose";

export interface IPlaylist extends Document {
    playlistId: string;
    titleId: number;
    descriptionId: number;
    maps: string[];
    covers: Record<string, string>; // Language -> URL
    fixedMapOrder: boolean;
    fallback: boolean;
    pinned: boolean;
    type: "curated" | "recommended";
    colors?: {
        base_color: string;
        grad_color: string;
    };
    defaultLanguage?: string;
}

const PlaylistSchema: Schema = new Schema({
    playlistId: { type: String, required: true, unique: true },
    titleId: { type: Number, required: true },
    descriptionId: { type: Number, required: true },
    maps: { type: [String], default: [] },
    covers: { type: Map, of: String },
    fixedMapOrder: { type: Boolean, default: false },
    fallback: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    type: { type: String, enum: ["curated", "recommended"], default: "curated" },
    colors: {
        base_color: String,
        grad_color: String
    },
    defaultLanguage: { type: String, default: "en" }
}, { timestamps: true });

export default mongoose.model<IPlaylist>("Playlist", PlaylistSchema);
