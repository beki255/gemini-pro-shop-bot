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

// Order ID generator (Generates uppercase letter-based unique IDs, keeping existing numeric IDs intact)
orderSchema.statics.generateOrderId = async function () {
  // Clean uppercase letters (avoiding easily confused I and O)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const getCode = () => {
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return `ORD-${result}`;
  };

  while (true) {
    const candidateId = getCode();
    const exists = await this.exists({ orderId: candidateId });
    if (!exists) {
      return candidateId;
    }
  }
};

module.exports = mongoose.model('Order', orderSchema);
