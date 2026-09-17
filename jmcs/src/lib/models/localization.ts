import { Schema, model, Document } from "mongoose";

export interface ILocalization extends Document {
    locId: number;
    strings: Record<string, string>;
}

export type ILocalizationLean = Omit<ILocalization, keyof Document>;

const localizationSchema = new Schema<ILocalization>({
    locId: { type: Number, required: true },
    strings: { type: Object, required: true },
}, { versionKey: false });

export default model<ILocalization>("Localization", localizationSchema);