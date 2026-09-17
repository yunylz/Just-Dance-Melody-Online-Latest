const mongoose = require("mongoose");

const { COMMENT_TYPES } = require("../enums");

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  content: { type: String, required: true },
  contentId: { type: String, required: true },
  commentType: { 
    type: Number, 
    required: true, 
    enum: Object.values(COMMENT_TYPES) 
  },
  dateCreated: { type: Date, default: Date.now },
  dateModified: { type: Date, default: Date.now }
}, { _id: true, timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;