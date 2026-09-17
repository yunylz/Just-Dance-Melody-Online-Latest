const mongoose = require("mongoose");

const eventsDefinitionSchema = new mongoose.Schema({
    spaceId: { type: String, required: true, unique: true },
    attributes: { type: Array, default: [] },
    compositions: { type: Array, default: [] },
    signals: { type: Array, default: [] }
});

module.exports = mongoose.model("EventsDefinition", eventsDefinitionSchema);
