import { Schema, Document, model } from "mongoose";
import { 
    CustomizableItemStatus, 
    CustomizableItemType, CustomizableItemUnlockType, 
    OnlinePortraitBorderOriginalLockStatus 
} from "../enums/uaf";

export interface IAvatar extends Document {
    Id: number;
    jdVersion: number;
    mojoPrice: number;
    relativeQuestID: string;
    relativeSongName: string;
    relativeWDFBossName: string;
    UsedAsCoach_CoachId: number;
    UsedAsCoach_MapName: string;
    soundFamily: string;
    sounds: string[];
    status: number;
    unlockType: number;
    url: string;
    itemType: number;
    visibility: boolean;
}

export interface ISkin extends Document {
    Id: number;
    jdVersion: number;
    mojoPrice: number;
    status: number;
    unlockType: number;
    url: string;
    itemType: number;
    visibility: boolean;
}

export interface IPortraitBorder extends Document {
    Id: number;
    backgroundUrl: string;
    foregroundUrl: string;
    originalLockStatus: number;
    visibility: boolean;
}

const avatarSchema = new Schema<IAvatar>({
    Id: {
        type: Number,
        required: true,
        unique: true
    },
    UsedAsCoach_CoachId: {
        type: Number,
        required: true
    },
    UsedAsCoach_MapName: {
        type: String,
        required: true
    },
    jdVersion: {
        type: Number,
        required: true
    },
    mojoPrice: {
        type: Number,
        required: true
    },
    relativeQuestID: {
        type: String,
        required: true
    },
    relativeSongName: {
        type: String,
        required: true
    },
    relativeWDFBossName: {
        type: String,
        required: true
    },
    soundFamily: {
        type: String,
        required: true
    },
    sounds: {
        type: [String],
        required: false
    },
    status: {
        type: Number,
        enum: Object.values(CustomizableItemStatus),
        required: true
    },
    unlockType: {
        type: Number,
        enum: Object.values(CustomizableItemUnlockType),
        required: true
    },
    itemType: {
        type: Number,
        enum: Object.values(CustomizableItemType),
        required: true
    },
    url: {
        type: String,
        required: true
    },
    visibility: {
        type: Boolean,
        default: false,
        required: true
    },
});

const skinSchema = new Schema<ISkin>({
    Id: {
        type: Number,
        required: true,
        unique: true
    },
    jdVersion: {
        type: Number,
        required: true
    },
    mojoPrice: {
        type: Number,
        required: true
    },
    status: {
        type: Number,
        enum: Object.values(CustomizableItemStatus),
        required: true
    },
    unlockType: {
        type: Number,
        enum: Object.values(CustomizableItemUnlockType),
        required: true
    },
    itemType: {
        type: Number,
        enum: Object.values(CustomizableItemType),
        required: true
    },
    url: {
        type: String,
        required: true
    },
    visibility: {
        type: Boolean,
        default: false,
        required: true
    },
});

const portraitBorderSchema = new Schema<IPortraitBorder>({
    Id: {
        type: Number,
        required: true,
        unique: true
    },
    backgroundUrl: {
        type: String,
        required: true
    },
    foregroundUrl: {
        type: String,
        required: true
    }, 
    originalLockStatus: {
        type: Number,
        required: true,
        enum: Object.values(OnlinePortraitBorderOriginalLockStatus)
    },
    visibility: {
        type: Boolean,
        default: false,
        required: true
    },
});

export const Avatar        = model<IAvatar>("Avatar", avatarSchema);
export const Skin          = model<ISkin>("Skin", skinSchema);
export const PortraitBorder = model<IPortraitBorder>("PortraitBorder", portraitBorderSchema);