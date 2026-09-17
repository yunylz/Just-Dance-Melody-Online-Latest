import { Schema, model, Document } from "mongoose";

/**
 * World Dance Floor configuration, one document per config type.
 * `name` mirrors the WDF server data files: "config" | "schedule" | "rooms" | "bosses".
 * `data` holds the full JSON content of the corresponding file.
 */
export interface IWdfConfig extends Document {
    name: string;
    data: any;
    updatedAt: number;
    updatedBy?: string;
}

const wdfConfigSchema = new Schema<IWdfConfig>({
    name: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: Number, default: 0 },
    updatedBy: { type: String },
}, {
    versionKey: false,
});

export default model<IWdfConfig>("WdfConfig", wdfConfigSchema);
