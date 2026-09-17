import mongoose, { Schema, Document } from "mongoose";

export interface IPlayLog extends Document {
    pid: string;
    mapName: string;
    country: string;
    isReplay: boolean;
    timestamp: Date;
    // Optional score context — enriched when the play came from a scored session
    isWdf?: boolean;
    isCoop?: boolean;
    isKids?: boolean;
    isPlaylist?: boolean;
    isSweatEnabled?: boolean;
    isJduEnabled?: boolean;
}

const PlayLogSchema: Schema = new Schema({
    pid: { type: String, required: true, index: true },
    mapName: { type: String, required: true, index: true },
    country: { type: String, required: true, index: true },
    isReplay: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now, index: true },
    // Score context — optional, populated when available
    isWdf: { type: Boolean },
    isCoop: { type: Boolean },
    isKids: { type: Boolean },
    isPlaylist: { type: Boolean },
    isSweatEnabled: { type: Boolean },
    isJduEnabled: { type: Boolean },
}, { timestamps: true, versionKey: false });

// Index for global aggregation
PlayLogSchema.index({ timestamp: -1 });

export default mongoose.model<IPlayLog>("PlayLog", PlayLogSchema);
