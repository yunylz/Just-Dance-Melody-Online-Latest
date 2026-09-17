import { Document, Schema, model } from "mongoose";
import { ISku } from "../../config/skus";

export interface IScore extends Document {
    profileId: string;
    mapName: string;
    score: number;
    isWdf: boolean;
    isCoop: boolean;
    isKids: boolean;
    isPlaylist: boolean;
    isFavPlaylist: boolean;
    isRecoForYouPlaylist: boolean;
    isTopReplayedPlaylist: boolean;
    isDiscoverPlaylist: boolean;
    isTopCountryPlaylist: boolean;
    isSweatEnabled: boolean;
    isJduEnabled: boolean;
    isKidsOnlyMap: boolean;
    isUnlockable: boolean;
    isFromProfileSync: boolean;
    scoreTimestamp: number;
    sku: ISku;
}
const scoreSchema = new Schema<IScore>({
    profileId: {
        type: String,
        required: true
    },
    mapName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    isWdf: {
        type: Boolean,
        default: false
    },
    isCoop: {
        type: Boolean,
        default: false
    },
    isKids: {
        type: Boolean,
        default: false
    },
    isPlaylist: {
        type: Boolean,
        default: false
    },
    isFavPlaylist: {
        type: Boolean,
        default: false
    },
    isRecoForYouPlaylist: {
        type: Boolean,
        default: false
    },
    isTopReplayedPlaylist: {
        type: Boolean,
        default: false
    },
    isDiscoverPlaylist: {
        type: Boolean,
        default: false
    },
    isTopCountryPlaylist: {
        type: Boolean,
        default: false
    },
    isSweatEnabled: {
        type: Boolean,
        default: false
    },
    isJduEnabled: {
        type: Boolean,
        default: false
    },
    isKidsOnlyMap: {
        type: Boolean,
        default: false
    },
    isUnlockable: {
        type: Boolean,
        default: false
    },
    isFromProfileSync: {
        type: Boolean,
        default: false
    },
    scoreTimestamp: {
        type: Number,
        default: 0,
        required: true
    },
    sku: {
        type: Object,
        required: true
    }
}, { timestamps: true, versionKey: false });

export default model("Score", scoreSchema);