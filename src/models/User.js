// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, default: null },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    totalOrders: { type: Number, default: 0 },
    language: { type: String, default: null }, // 'am' or 'en'
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
