import { Schema, model, Document } from "mongoose";

export interface IQuestAssetUrls {
    phoneImageURL: string;
    coverImageURL: string;
    logoImageURL: string;
}

/**
 * A Just Dance online quest, served by `/questdb/v1/quests`.
 * `id` is the quest identifier the client knows (e.g. "1", "2").
 */
export interface IQuest extends Document {
    id: string;
    title: string;
    locked: number;
    playlist: string[];
    assetUrls: IQuestAssetUrls;
    updatedAt: number;
    updatedBy?: string;
}

const questSchema = new Schema<IQuest>({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    locked: { type: Number, default: 0 },
    playlist: { type: [String], default: [] },
    assetUrls: {
        phoneImageURL: { type: String, default: "" },
        coverImageURL: { type: String, default: "" },
        logoImageURL: { type: String, default: "" },
    },
    updatedAt: { type: Number, default: 0 },
    updatedBy: { type: String },
}, {
    versionKey: false,
    // We have a real `id` path, so disable mongoose's default `_id` virtual.
    id: false,
});

export default model<IQuest>("Quest", questSchema);
