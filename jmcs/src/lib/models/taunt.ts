import { Schema, model, Document } from "mongoose";

export interface ITaunt extends Document {
    from: string;
    to: string;
    mapName: string;
    message: number;
    victory: number;
    country?: number;
    time: number;
}

const tauntSchema = new Schema<ITaunt>({
    from: { type: String, required: true },
    to: { type: String, required: true },
    mapName: { type: String, required: true },
    message: { type: Number, required: true },
    victory: { type: Number, required: true },
    country: { type: Number },
    time: { type: Number, required: true },
}, {
    versionKey: false,
});

// List taunts a player has received, most recent first.
tauntSchema.index({ to: 1, time: -1 });
// One taunt per (from, to) directed pair — a player challenges another once.
tauntSchema.index({ from: 1, to: 1 }, { unique: true });

export default model<ITaunt>("Taunt", tauntSchema);
