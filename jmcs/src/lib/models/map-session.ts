import mongoose, { Schema, Document } from "mongoose";

export interface IMapSession extends Document {
    pid: string;
    userId: string;
    mapName: string;
    mapLength: number;
    startedAt: number;
    endsAt: number;
}

const MapSessionSchema: Schema = new Schema({
    pid: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    mapName: { type: String, required: true, index: true },
    mapLength: { type: Number, required: true },
    startedAt: { type: Number, required: true },
    endsAt: { type: Number, required: true },
}, { timestamps: true, versionKey: false });

MapSessionSchema.index({ pid: 1, mapName: 1 });
MapSessionSchema.index({ userId: 1, mapName: 1 });
MapSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<IMapSession>("MapSession", MapSessionSchema);
