import mongoose, { Schema, Document } from "mongoose";

export type ActivityType =
    | 'profile_created'
    | 'favorite_added'
    | 'favorite_removed'
    | 'score_improved';

export interface IActivityLog extends Document {
    pid: string;
    type: ActivityType;
    mapName?: string;       // favorite_* and score_improved
    score?: number;         // score_improved
    platform?: string;      // profile_created, score_improved
    gameVersion?: string;   // score_improved
    country?: string;       // all — profile's country code at event time
    timestamp: Date;
}

const ActivityLogSchema: Schema = new Schema({
    pid:         { type: String, required: true, index: true },
    type:        { type: String, required: true, enum: ['profile_created', 'favorite_added', 'favorite_removed', 'score_improved'] },
    mapName:     { type: String },
    score:       { type: Number },
    platform:    { type: String },
    gameVersion: { type: String },
    country:     { type: String },
    timestamp:   { type: Date, default: Date.now, index: true },
}, { timestamps: false });

// Friend feed: filter by pid, sort by recency
ActivityLogSchema.index({ pid: 1, timestamp: -1 });
// Admin global feed: all activities sorted by recency
ActivityLogSchema.index({ timestamp: -1 });

export default mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
