// src/models/Stock.js
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    link: { type: String, required: true, index: true },
    description: { type: String, default: 'Gemini Pro 18 Months' },
    isSold: { type: Boolean, default: false },
    isReserved: { type: Boolean, default: false }, // reserved while order pending
    reservedAt: { type: Date, default: null },     // timestamp when reservation started
    reservedBy: { type: Number, default: null },   // user telegramId
    reservedMethod: { type: String, default: null },// CBE or Telebirr
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    soldAt: { type: Date, default: null },
    addedBy: { type: Number, default: null }, // Admin telegram ID
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);
