const mongoose = require('mongoose');
const uuid = require("uuid");

const newsSchema = new mongoose.Schema({
    id: { type: String, default: uuid.v4() },
    title: { type: String, required: true },
    content: { type: String, required: true }, // Markdown/HTML content
    imageUrl: { type: String },
    author: { type: String, required: true },
    published: { type: Boolean, default: true },
    category: { type: String, default: "general" }
}, {
    timestamps: true
});

const News = mongoose.model('News', newsSchema);

module.exports = News;
