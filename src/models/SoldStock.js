// src/models/SoldStock.js - Archive of Sold Stock Links
const mongoose = require('mongoose');

const soldStockSchema = new mongoose.Schema(
  {
    link: { type: String, required: true },
    description: { type: String, default: 'Gemini Pro 18 Months' },
    orderId: { type: String, required: true },
    userId: { type: Number, required: true },
    buyerUsername: { type: String, default: null },
    buyerName: { type: String, default: null },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    soldAt: { type: Date, default: Date.now },
    addedBy: { type: Number, default: null },
    processedBy: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SoldStock', soldStockSchema);
