const mongoose = require('mongoose');
const uuid = require("uuid");

const notificationSchema = new mongoose.Schema({
  id: { type: String, default: uuid.v4 },
  userId: { type: String, required: true, index: true }, // Recipient
  type: { type: String, required: true }, // e.g., 'friend_request', 'friend_accepted', 'news'
  title: { type: String, required: true },
  body: { type: String, required: true },
  time: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  data: { type: Object, default: {} } // For custom payload data (e.g. sender userId)
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
