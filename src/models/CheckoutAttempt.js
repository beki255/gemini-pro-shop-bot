// src/models/CheckoutAttempt.js - Track customer checkout & payment attempts
const mongoose = require('mongoose');

const checkoutAttemptSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    userInfo: {
      username: { type: String, default: null },
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },
    quantity: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CBE', 'Telebirr', 'Other'],
      required: true,
      index: true,
    },
    stockIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stock' }],
    status: {
      type: String,
      enum: ['awaiting_receipt', 'completed', 'cancelled', 'expired'],
      default: 'awaiting_receipt',
      index: true,
    },
    orderId: { type: String, default: null }, // e.g. ORD-XXXX if completed
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckoutAttempt', checkoutAttemptSchema);
