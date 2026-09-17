const mongoose = require("mongoose");

const populationSchema = new mongoose.Schema({
    spaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    obj: { type: mongoose.Schema.Types.Mixed, default: {} },
    assignmentTime: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: "populations"
});

module.exports = mongoose.model("Population", populationSchema);
