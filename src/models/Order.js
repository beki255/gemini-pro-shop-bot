// src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true }, // ORD-XXXX
    userId: { type: Number, required: true },
    userInfo: {
      username: String,
      firstName: String,
      lastName: String,
    },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
    stockIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stock' }],
    quantity: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CBE', 'Telebirr', 'Other'],
      required: true,
    },
    receiptFileId: { type: String, default: null }, // Telegram file_id
    receiptPath: { type: String, default: null },   // local file path
    deliveredLink: { type: String, default: null }, // activation link sent to buyer
    deliveredLinks: [{ type: String }],             // all activation links for multi-quantity
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: Number, default: null }, // Admin telegram ID
  },
  { timestamps: true }
);

// Auto-increment order ID helper (Robust against deletions and duplicate keys)
orderSchema.statics.generateOrderId = async function () {
  const orders = await this.find({ orderId: /^ORD-\d+$/ }, { orderId: 1 }).lean();
  let maxNum = 0;

  for (const o of orders) {
    if (o && o.orderId) {
      const match = o.orderId.match(/^ORD-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  while (true) {
    const candidateId = `ORD-${String(nextNum).padStart(4, '0')}`;
    const exists = await this.exists({ orderId: candidateId });
    if (!exists) {
      return candidateId;
    }
    nextNum++;
  }
};

module.exports = mongoose.model('Order', orderSchema);
