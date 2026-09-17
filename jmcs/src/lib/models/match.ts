import { Schema, model, Document } from "mongoose";

export interface IRound {
    ugcId?: string;
    dancer?: string;
    creationTime?: number;
    ugcScore?: number;
    mapName?: string;
    dancerScore?: number;
    winner?: string;
    aborted?: boolean;
}

export interface IMatch extends Document {
    matchId: string;
    challengers: string[];
    rounds: IRound[];
    tauntId: number;
    creationTime: number;
    updationTime: number;
    type: number; // 0=ranked, 1=friendly
    state: number; // 0=inprogress, 1=completed, 2=updatepending
    taggedAsCanceled?: boolean;
    canceledBy?: string;
}

const roundSchema = new Schema<IRound>({
    ugcId: { type: String },
    dancer: { type: String },
    creationTime: { type: Number },
    ugcScore: { type: Number },
    mapName: { type: String },
    dancerScore: { type: Number },
    winner: { type: String },
    aborted: { type: Boolean },
}, { _id: false });

const matchSchema = new Schema<IMatch>({
    matchId: { type: String, required: true, unique: true },
    challengers: [{ type: String }],
    rounds: [roundSchema],
    tauntId: { type: Number, default: 0 },
    creationTime: { type: Number, default: 0 },
    updationTime: { type: Number, default: 0 },
    type: { type: Number, default: 0 },
    state: { type: Number, default: 2 },
    taggedAsCanceled: { type: Boolean },
    canceledBy: { type: String },
}, {
    versionKey: false,
    timestamps: false,
});

matchSchema.index({ "challengers": 1 });

export default model<IMatch>("Match", matchSchema);
