import mongoose, { Schema, model, Document } from "mongoose";
import { UAF_MAX_INT } from "../enums";

const songSchema = new Schema({
    mapName: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    artist: {
        type: String,
        required: true
    },
    originalJDVersion: {
        type: Number,
        required: true
    },
    coachCount: {
        type: Number,
        required: true,
    },
    difficulty: {
        type: Number,
        required: true
    },
    sweatDifficulty: {
        type: Number,
        required: true
    },
    songColor1A: {
        type: String,
        default: "#444444"
    },
    songColor1B: {
        type: String,
        default: "#111111"
    },
    songColor2A: {
        type: String,
        default: "#aaaaaa"
    },
    songColor2B: {
        type: String,
        default: "#777777"
    },
    lyricsColor: {
        type: String,
        default: "#ff0000"
    },
    credits: {
        type: String,
        default: "Placeholder credits. Please fill me!"
    },
    audioPreviewData: {
        type: Object,
        default: {}
    },
    assets: {
        type: Object,
        default: {}
    },
    urls: {
        type: Object,
        default: {}
    },
    packages: {
        type: Object,
        default: {}
    },
    mapPreviewMpd: {
        type: String,
        default: ""
    },
    mapLength: {
        type: Number,
        required: true
    },
    jdmAttributes: {
        type: Array,
        default: []
    },
    mainCoach: {
        type: Number,
        default: -1
    },
    lyricsType: {
        type: Number,
        default: 0
    },
    mode: {
        type: Number,
        default: 6
    },
    status: {
        type: Number,
        default: 3
    },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag"
    }],
    parentMapName: {
        type: String,
        default: ""
    },
    skuIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sku"
    }],
    serverChangelist: {
        type: Number,
        default: 0
    },
    customTypeNameId: {
        type: Number,
        default: UAF_MAX_INT
    },
    customTypeName: {
        type: String,
        default: ""
    },
    searchTagsLocIds: {
        type: Array,
        default: []
    },
    bannerTheme: {
        type: String,
        default: ""
    },
    releaseDate: {
        type: String,
        default: ""
    },
    isPatreon: {
        type: Boolean,
        default: false
    }
});

songSchema.pre('save', async function (this: any) {
    const song = this;

    if (song.isModified('packages')) {
        const newPackages = song.packages || {};

        // Fetch the existing document from DB if it's not new
        let oldPackages: Record<string, any> = {};
        if (!song.isNew) {
            // Use the model to find the old version by ID
            const oldDoc: any = await (this.constructor as any).findById(song._id).select('packages').lean();
            oldPackages = oldDoc?.packages || {};
        }

        for (const platform in newPackages) {
            const newPkg = newPackages[platform];
            const oldPkg = oldPackages[platform];

            if (newPkg && typeof newPkg === 'object') {
                // If it's a new package entry, or missing version, initialize to 1
                if (!oldPkg || !oldPkg.version) {
                    newPkg.version = 1;
                } else {
                    // Check if content changed
                    const hasChanged = newPkg.md5 !== oldPkg.md5 || newPkg.url !== oldPkg.url;
                    if (hasChanged) {
                        newPkg.version = (oldPkg.version || 1) + 1;
                    } else {
                        // Keep existing version
                        newPkg.version = oldPkg.version;
                    }
                }
            }
        }
        // Explicitly mark as modified since it's a Mixed type
        song.markModified('packages');
    }
});

export default model("Song", songSchema);