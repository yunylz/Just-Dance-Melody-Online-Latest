import mongoose, { Schema, Document } from "mongoose";

export interface IUserPlaylist extends Document {
    id: string; // UUID from Hub
    ownerId: string; // Profile ID
    title: string;
    description?: string;
    songs: {
        mapName: string;
        title: string;
        artist: string;
        coverUrl: string;
    }[];
    isPublic: boolean;
    updatedAt: Date;
}

const UserPlaylistSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    songs: [{
        mapName: { type: String, required: true },
        title: { type: String, required: true },
        artist: { type: String, required: true },
        coverUrl: { type: String, required: true }
    }],
    isPublic: { type: Boolean, default: false },
    updatedAt: { type: Date, required: true }
}, { timestamps: true });

// Index for fast lookup by owner
UserPlaylistSchema.index({ ownerId: 1 });

export default mongoose.model<IUserPlaylist>("UserPlaylist", UserPlaylistSchema);
