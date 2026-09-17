import { Schema, model, Document } from "mongoose";

export interface IProfile extends Document {
    name?: string;
    nickname?: string;
    avatar?: number;
    country?: number;
    skin?: number;
    alias?: number;
    aliasGender?: number;
    portraitBorder?: number;
    jdPoints?: number | Record<string, number>;
    progression?: Map<string, number>;
    unlockedAvatars?: number[];
    unlockedSkins?: number[];
    unlockedAliases?: number[];
    unlockedPortraitBorders?: number[];
    wdfRank?: number;
    stars?: number;
    unlocks?: number;
    songsPlayed?: number;
    platformId?: string;
    populations?: IPopulation;
    scores?: Map<string, {
        highest?: number;
        isCoopHighscore?: boolean;
        timesPlayed?: number;
    }>;
    history?: Map<string, number>;
    favorites?: string[];
    syncVersions?: any;
    otherPids?: string[];
    // v1: flat stats object; v2: namespaced by gameVersion e.g. { jd2022: { danceTime: 0, ... } }
    stats?: Record<string, any>;
    mapHistory?: {
        classic?: Array<{
            mapName?: string;
            timestamp?: number;
            score?: number;
        }>;
        kids?: Array<{
            mapName?: string;
            timestamp?: number;
            score?: number;
        }>;
    };
    inProgressAliases?: Array<{
        id?: number;
        progressValue?: number;
    }>;
    profileId?: string;
    diamondPoints?: number;
}

const profileSchema = new Schema<IProfile>({
    name: { type: String },
    nickname: { type: String },
    avatar: { type: Number },
    country: { type: Number },
    skin: { type: Number },
    alias: { type: Number },
    aliasGender: { type: Number },
    portraitBorder: { type: Number },
    // Mixed: supports legacy flat number (v1) and versioned object { jd2022: 1785 } (v2)
    jdPoints: { type: Schema.Types.Mixed },
    progression: { type: Map, of: Number },
    unlockedAvatars: [{ type: Number }],
    unlockedSkins: [{ type: Number }],
    unlockedAliases: [{ type: Number }],
    unlockedPortraitBorders: [{ type: Number }],
    wdfRank: { type: Number },
    stars: { type: Number },
    unlocks: { type: Number },
    songsPlayed: { type: Number },
    platformId: { type: String },
    populations: [{
        subject: { type: String },
        name: { type: String },
        spaceId: { type: String },
        obj: { type: String }
    }],
    scores: {
        type: Map,
        of: new Schema({
            highest: { type: Number },
            isCoopHighscore: { type: Boolean },
            timesPlayed: { type: Number }
        }, { _id: false })
    },
    history: { type: Map, of: Number },
    favorites: [{ type: String }],
    syncVersions: { type: Schema.Types.Mixed },
    otherPids: [{ type: String }],
    // Mixed: supports flat stats (v1) and gameVersion-namespaced stats (v2)
    stats: { type: Schema.Types.Mixed },
    mapHistory: {
        classic: [{
            mapName: { type: String },
            timestamp: { type: Number },
            score: { type: Number }
        }],
        kids: [{
            mapName: { type: String },
            timestamp: { type: Number },
            score: { type: Number }
        }]
    },
    inProgressAliases: [{
        id: { type: Number },
        progressValue: { type: Number }
    }],
    profileId: { type: String },
    diamondPoints: { type: Number }
}, { versionKey: false });

export default model<IProfile>("Profile", profileSchema);