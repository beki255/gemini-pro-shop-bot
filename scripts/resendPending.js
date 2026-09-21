// scripts/resendPending.js - Resend pending order notification to admin
require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const keyboards = require('../src/utils/keyboard');
const msg = require('../src/utils/messages');

async function resend() {
  await mongoose.connect(process.env.MONGODB_URI);
  const bot = new Telegraf(process.env.BOT_TOKEN);
  const adminId = parseInt(process.env.ADMIN_ID);

  const pendingOrders = await Order.find({ status: 'pending' });
  console.log(`Found ${pendingOrders.length} pending orders`);

  for (const order of pendingOrders) {
    try {
      console.log(`Sending order ${order.orderId} to admin ${adminId}...`);
      await bot.telegram.sendPhoto(adminId, order.receiptFileId, {
        caption: msg.adminNewOrder(order, order.userInfo),
        parse_mode: 'Markdown',
        ...keyboards.adminApproval(order.orderId),
      });
      console.log(`✅ Successfully sent ${order.orderId} to admin!`);
    } catch (err) {
      console.error(`❌ Failed with markdown: ${err.message}. Trying plain text...`);
      try {
        await bot.telegram.sendPhoto(adminId, order.receiptFileId, {
          caption: `🔔 አዲስ ትዕዛዝ!\n\n🔢 ትዕዛዝ: ${order.orderId}\n👤 ደንበኛ: ${order.userInfo.firstName} (${order.userInfo.username || ''})\n💰 መጠን: ${order.amount} ብር\n💳 ክፍያ: ${order.paymentMethod}`,
          ...keyboards.adminApproval(order.orderId),
        });
        console.log(`✅ Successfully sent plain text for ${order.orderId}!`);
      } catch (err2) {
        console.error(`❌ Plain text also failed:`, err2.message);
      }
    }
  }

  await mongoose.disconnect();
}

resend();
