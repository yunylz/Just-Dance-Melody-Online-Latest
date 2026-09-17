import { Schema, model, Document } from "mongoose";

export interface IMatchHistory extends Document {
    pid: string;
    ranked: {
        inProgress: string[];
        completed: string[];
    };
    friendly: {
        inProgress: string[];
        completed: string[];
    };
    updatePending: string | null;
    lastUpdateTime: number;
}

const matchHistorySchema = new Schema<IMatchHistory>({
    pid: { type: String, required: true, unique: true },
    ranked: {
        inProgress: [{ type: String }],
        completed: [{ type: String }],
    },
    friendly: {
        inProgress: [{ type: String }],
        completed: [{ type: String }],
    },
    updatePending: { type: String, default: null },
    lastUpdateTime: { type: Number, default: 0 },
}, {
    versionKey: false,
    timestamps: false,
});

export default model<IMatchHistory>("MatchHistory", matchHistorySchema);
