import { Schema, model, Document } from "mongoose";

export interface IUgc extends Document {
    ugcId: string;
    type: "ad" | "st" | "dm" | "ch" | "cr" | "cv";
    mapName?: string;
    profileId: string;
    content?: Record<string, {
        url?: string;
        mimetype: string;
        __class?: string;
    }>;
    gameVersion?: string;
    platform?: string;
    time: number;
    approved?: number;
    pendingConfirmation?: boolean;
    pendingExpiry?: Date;
    pendingTranscoding?: boolean;
    coach?: number;
    device?: number;
    score?: number;
    moves?: string;
    contest?: number;
    sequence?: number;
    random?: number;
    country?: number;
    name?: string;
    avatar?: number;
    portraitBorder?: number;
    likes?: number;
    views?: number;
    reports?: number;
    featured?: number;
    tags?: string[];
    deleted?: number;
    banReason?: string;
    text?: string;
    title?: string;
}

const ugcSchema = new Schema<IUgc>({
    ugcId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["ad", "st", "dm", "ch", "cr", "cv"] },
    mapName: { type: String },
    profileId: { type: String, required: true },
    content: { type: Schema.Types.Mixed },
    gameVersion: { type: String },
    platform: { type: String },
    time: { type: Number, required: true },
    approved: { type: Number },
    pendingConfirmation: { type: Boolean },
    pendingExpiry: { type: Date },
    pendingTranscoding: { type: Boolean },
    coach: { type: Number },
    device: { type: Number },
    score: { type: Number },
    moves: { type: String },
    contest: { type: Number },
    sequence: { type: Number },
    random: { type: Number },
    country: { type: Number },
    name: { type: String },
    avatar: { type: Number },
    portraitBorder: { type: Number },
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
    featured: { type: Number },
    tags: [{ type: String }],
    deleted: { type: Number },
    banReason: { type: String },
    text: { type: String },
    title: { type: String },
}, {
    versionKey: false,
    timestamps: false,
});

ugcSchema.index({ pendingExpiry: 1 }, { expireAfterSeconds: 0 });
ugcSchema.index({ profileId: 1 });
ugcSchema.index({ type: 1, time: -1 });
ugcSchema.index({ type: 1, deleted: 1, approved: 1 });
ugcSchema.index({ type: 1, platform: 1, gameVersion: 1, time: -1 });
ugcSchema.index({ type: 1, platform: 1, gameVersion: 1, featured: -1 });
ugcSchema.index({ type: 1, platform: 1, profileId: 1, time: -1 });

export default model<IUgc>("Ugc", ugcSchema);
