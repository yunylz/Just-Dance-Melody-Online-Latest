import mongoose, { Schema, model } from "mongoose";

const homeTileSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ["map", "playlist", "news", "video", "feedback", "uplay", "jduCountdown", "jduTrial", "offlineGeneration", "offlineReplaceable"]
    },
    subtype: {
        type: String,
        default: ""
    },
    activationTime: {
        type: Number,
        default: () => Date.now()
    },
    contentExpiry: {
        type: Number,
        default: 0
    },
    filters: {
        type: Object,
        default: {}
    },
    // Map tile specific
    mapName: String,
    // Playlist tile specific
    playlistID: String,
    // News tile specific
    title: String,
    text: String,
    imageUrl: String,
    winnerPid: String,
    winnerPlatform: String,
    winnerName: String,
    winnerNameSuffix: Number,
    winnerCountry: Number,
    winnerAvatar: Number,
    winnerAlias: Number,
    offlineNewID: String,
    // Video tile specific
    streaming: Boolean,
    videoDataUrl: String,
    thumbnailUrl: String,
    dancerPid: String,
    // Customization
    locked: {
        type: Boolean,
        default: false
    },
    lockPosition: Number,
    lockDuration: Number,
    new: {
        type: Boolean,
        default: true
    },
    uuid: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

export default model("HomeTile", homeTileSchema);
