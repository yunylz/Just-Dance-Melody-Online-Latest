import { Schema, model, Document } from "mongoose";

/**
 * Per-pair challenge history (mirrors the OG `th/<min>/<max>` document).
 * Keeps the most recent maps the two players have challenged each other on,
 * used to avoid re-challenging the same map back-to-back.
 */
export interface ITauntHistory extends Document {
    pair: string;
    maps: string[];
}

const tauntHistorySchema = new Schema<ITauntHistory>({
    pair: { type: String, required: true, unique: true },
    maps: [{ type: String }],
}, {
    versionKey: false,
});

export default model<ITauntHistory>("TauntHistory", tauntHistorySchema);
