// src/handlers/adminHandlers.js - Admin commands and approval/rejection callbacks
const config = require('../config');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const keyboards = require('../utils/keyboard');
const msg = require('../utils/messages');

// ─── Middleware: check if user is admin ──────────────────
function isAdmin(ctx) {
  return ctx.from && ctx.from.id === config.adminId;
}

function adminOnly(handler) {
  return async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('🚫 ይህ አዛዥ ለአስተዳዳሪ ብቻ ነው።');
    }
    return handler(ctx);
  };
}

// ─── HTML safe escape helper ─────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Helper: Get complete customer details with User DB fallback ──
async function getCustomerDetails(userId, cachedUserInfo) {
  let firstName = cachedUserInfo?.firstName || '';
  let lastName = cachedUserInfo?.lastName || '';
  let username = cachedUserInfo?.username || '';

  if (!firstName || !username) {
    try {
      const dbUser = await User.findOne({ telegramId: userId });
      if (dbUser) {
        if (!firstName) firstName = dbUser.firstName || '';
        if (!lastName) lastName = dbUser.lastName || '';
        if (!username) username = dbUser.username || '';
      }
    } catch {}
  }

  const rawFullName = `${firstName} ${lastName}`.trim();
  const fullName = rawFullName || 'ስም የለም';
  const displayUsername = username ? `@${username}` : 'የለውም';

  return {
    fullName,
    username: displayUsername,
    rawUsername: username,
    userId,
    safeFullName: escapeHtml(fullName),
    safeUsername: escapeHtml(displayUsername),
  };
}

// ─── /admin — Admin panel ─────────────────────────────────
const handleAdmin = adminOnly(async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  await ctx.reply(
    lang === 'en' ? '🔧 *Admin Panel*\n\nPlease select an option:' : '🔧 *የአስተዳዳሪ ፓነል (Admin Panel)*\n\nእባክዎ ምርጫ ያድርጉ:',
    {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(lang),
    }
  );
});

// ─── /addstock <link> — Add single link or start interactive flow ──
const handleAddStock = adminOnly(async (ctx) => {
  const text = ctx.message.text.replace('/addstock', '').trim();
  if (!text) {
    return startInteractiveAddStock(ctx);
  }

  // Support adding multiple links (one per line)
  const links = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let added = 0;
  const errors = [];

  for (const link of links) {
    try {
      await Stock.create({ link, addedBy: ctx.from.id });
      added++;
    } catch (e) {
      if (e.code === 11000) {
        errors.push(`ሊንኩ አስቀድሞ አለ: ${link.substring(0, 40)}...`);
      }
    }
  }

  let reply = msg.stockAdded(added);
  if (errors.length > 0) {
    reply += `\n\n⚠️ *ስህተቶች (${errors.length}):*\n${errors.join('\n')}`;
  }

  // Check if pending orders exist and prompt admin for quick approval
  const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: 1 });
  if (pendingOrders.length > 0) {
    const pendingOrder = pendingOrders[0];
    reply += `\n\n💡 *ማሳሰቢያ:* በጥበቃ ላይ ያለ ትዕዛዝ \`${pendingOrder.orderId}\` (ብዛት: ${pendingOrder.quantity || 1}) አለ! አሁን ማጽደቅ ይችላሉ፦`;
    return ctx.reply(reply, {
      parse_mode: 'Markdown',
      ...keyboards.pendingOrderPrompt(pendingOrder.orderId, pendingOrders.length, 'am'),
    });
  }

  await ctx.reply(reply, { parse_mode: 'Markdown' });
});

// ─── Interactive Add Stock Flow ───────────────────────────
const startInteractiveAddStock = adminOnly(async (ctx) => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  ctx.session = ctx.session || {};
  ctx.session.addingStockFlow = { links: [] };

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const text = isEn
    ? `➕ *Add Stock Links*\n\nPlease enter the **1st link** here:\n\n💡 _Tip: You can send one link at a time, or paste multiple links at once (one per line)._`
    : `➕ *ስቶክ መጨመሪያ (Add Stock)*\n\nእባክዎ **1ኛውን ሊንክ** እዚህ ያስገቡ፦\n\n💡 _ጠቃሚ ምክር: አንድ በአንድ ማስገባት ይችላሉ፣ ወይም ከአንድ በላይ ከሆነ ሁሉንም በአንድ ላይ በየመስመሩ ለይተው መላክ ይችላሉ።_`;

  return ctx.reply(text, {
    parse_mode: 'Markdown',
    ...keyboards.stockInputKeyboard(0, lang),
  });
});

// ─── Handle Admin Stock Text Input (Step by Step) ────────
const handleStockInput = adminOnly(async (ctx) => {
  const session = ctx.session || {};
  if (!session.addingStockFlow) return false;

  const rawText = ctx.message.text ? ctx.message.text.trim() : '';
  if (!rawText) return false;

  // Split lines if multiple
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const validLinks = lines.filter((l) => l.startsWith('http://') || l.startsWith('https://'));

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  if (validLinks.length === 0) {
    await ctx.reply(
      isEn
        ? '⚠️ Please enter a valid URL starting with `https://`'
        : '⚠️ እባክዎ በ `https://` የሚጀምር ትክክለኛ የሊንክ አድራሻ ያስገቡ።',
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  // Append valid links to session
  session.addingStockFlow.links.push(...validLinks);
  const totalCollected = session.addingStockFlow.links.length;
  const nextNumber = totalCollected + 1;

  const replyText = isEn
    ? `✅ *${totalCollected} link(s) recorded!*\n\n➕ Now enter the **next (${nextNumber}th) link** here:\n\n_(When you are finished adding, tap "Save & Finish" below)_`
    : `✅ *${totalCollected} ሊንክ(ዎች) እስካሁን ተመዝግቧል!*\n\n➕ አሁን **ቀጣዩን (${nextNumber}ኛውን) ሊንክ** እዚህ ያስገቡ፦\n\n_(ሁሉንም አስገብተው ከጨረሱ ከታች «✅ አስቀምጥ እና ጨርስ» የሚለውን ይጫኑ)_`;

  await ctx.reply(replyText, {
    parse_mode: 'Markdown',
    ...keyboards.stockInputKeyboard(totalCollected, lang),
  });
  return true;
});

// ─── Callback: Finish Add Stock & Save to MongoDB ────────
const callbackFinishAddStock = adminOnly(async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const session = ctx.session || {};
  const links = session.addingStockFlow ? session.addingStockFlow.links : [];

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  if (!links || links.length === 0) {
    return ctx.reply(
      isEn ? '⚠️ No links were provided.' : '⚠️ ምንም የተመዘገበ ሊንክ የለም።'
    );
  }

  // Clear session state
  session.addingStockFlow = null;

  // Insert into MongoDB
  const items = links.map((link) => ({
    link,
    description: 'Gemini Pro 18 Months',
    isSold: false,
    isReserved: false,
    addedBy: ctx.from.id,
  }));

  await Stock.insertMany(items);
  const totalAvailable = await Stock.countDocuments({ isSold: false, isReserved: false });

  // Check if any pending orders are waiting
  const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: 1 });
  if (pendingOrders.length > 0) {
    const pendingOrder = pendingOrders[0];
    const needed = pendingOrder.quantity || 1;
    const cust = await getCustomerDetails(pendingOrder.userId, pendingOrder.userInfo);

    const promptText = isEn
      ? `🎉 *Success! ${items.length} link(s) added to database!*\n\n` +
        `📦 Total Available Stock Now: *${totalAvailable}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 *Pending Order Waiting for Approval!* 🔔\n\n` +
        `🔢 Order ID: \`${pendingOrder.orderId}\`\n` +
        `👤 Name: *${cust.fullName}*\n` +
        `🔗 Username: *${cust.username}*\n` +
        `🆔 Telegram ID: \`${pendingOrder.userId}\`\n` +
        `📦 Quantity Needed: *${needed} link(s)*\n` +
        `💰 Amount: *${pendingOrder.amount} ETB*\n\n` +
        `👉 *You now have stock! Click below to approve and deliver right now:*`
      : `🎉 *ተሳክቷል! ${items.length} ሊንክ(ዎች) ወደ ዳታቤዝ ገብተዋል!*\n\n` +
        `📦 በአጠቃላይ አሁን የሚገኝ ስቶክ: *${totalAvailable}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 *በጥበቃ ላይ ያለ ትዕዛዝ አለ!* 🔔\n\n` +
        `🔢 የትዕዛዝ ቁጥር: \`${pendingOrder.orderId}\`\n` +
        `👤 ስም: *${cust.fullName}*\n` +
        `🔗 ዩዘርኔም: *${cust.username}*\n` +
        `🆔 Telegram ID: \`${pendingOrder.userId}\`\n` +
        `📦 የሚፈለገው ብዛት: *${needed} ሊንክ*\n` +
        `💰 የተከፈለው መጠን: *${pendingOrder.amount} ብር*\n\n` +
        `👉 *አሁን በቂ ስቶክ ስላስገቡ ወዲያውኑ ማጽደቅ ይችላሉ! ከታች ያለውን አዝራር ይጫኑ፦*`;

    return ctx.reply(promptText, {
      parse_mode: 'Markdown',
      ...keyboards.pendingOrderPrompt(pendingOrder.orderId, pendingOrders.length, lang),
    });
  }

  const doneText = isEn
    ? `🎉 *Success! ${items.length} link(s) added to database!*\n\n📦 Total Available Stock Now: *${totalAvailable}*`
    : `🎉 *ተሳክቷል! ${items.length} ሊንክ(ዎች) ወደ ዳታቤዝ ገብተዋል!*\n\n📦 በአጠቃላይ አሁን የሚገኝ ስቶክ: *${totalAvailable}*`;

  await ctx.reply(doneText, {
    parse_mode: 'Markdown',
    ...keyboards.adminPanel(lang),
  });
});

// ─── Callback: Cancel Add Stock ───────────────────────────
const callbackCancelAddStock = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('ተሰርዟል').catch(() => {});
  if (ctx.session) ctx.session.addingStockFlow = null;

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  await ctx.reply(
    isEn
      ? '❌ Stock adding cancelled. No changes were made.'
      : '❌ ስቶክ መጨመር ተሰርዟል። ምንም ሊንክ አልተቀመጠም።',
    {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(lang),
    }
  );
});

// ─── /restock [count] — Quickly add default activation links ───
const DEFAULT_ACTIVATION_LINK =
  'https://serviceactivation.google.com/subscription/new/AQCpiIHyxtR8zNVN7fnY2my5SQR-D3NHVVvDHSonWtAfGyvubWbMsVlz3b9Jt6h2cXoFtsQ0lzhVw_nChxWMLBHEhR7g-EnwdE5frb_49xTC-DLpUvJJIpes-DSmGyc8zSPxC-gbrgXvBnkPjftUVN86tUoZ_ijn3_qlBGWhYo145DK26bS2QeJDQ3q4GFeqW1AuSqa_o1dDdu6dKMRtFgnwB5FQk_bPKgYpdAZ544E6gv3bBgUKWBn6NGUofhxmn_dqxP-7lURmPl9Jnw==';

const handleRestock = adminOnly(async (ctx) => {
  const text = ctx.message.text.replace('/restock', '').trim();
  const count = parseInt(text) || 5;

  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      link: DEFAULT_ACTIVATION_LINK,
      description: 'Gemini Pro 18 Months',
      isSold: false,
      isReserved: false,
      addedBy: ctx.from.id,
    });
  }
  await Stock.insertMany(items);
  const totalAvailable = await Stock.countDocuments({ isSold: false, isReserved: false });

  let reply = `✅ *${count}* የ Gemini Pro አክቲቬሽን ሊንኮች ወደ ስቶክ ተጨምረዋል!\n📦 በአጠቃላይ አሁን የሚገኝ ስቶክ: *${totalAvailable}*`;
  const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: 1 });
  if (pendingOrders.length > 0) {
    const pendingOrder = pendingOrders[0];
    reply += `\n\n💡 *ማሳሰቢያ:* በጥበቃ ላይ ያለ ትዕዛዝ \`${pendingOrder.orderId}\` (ብዛት: ${pendingOrder.quantity || 1}) አለ! አሁን ማጽደቅ ይችላሉ፦`;
    return ctx.reply(reply, {
      parse_mode: 'Markdown',
      ...keyboards.pendingOrderPrompt(pendingOrder.orderId, pendingOrders.length, 'am'),
    });
  }

  await ctx.reply(reply, { parse_mode: 'Markdown' });
});

// ─── /addstockbulk — Add links from text file ──────────
const handleAddStockBulk = adminOnly(async (ctx) => {
  await ctx.reply(
    '📁 *Bulk Stock Add*\n\nእያንዳንዱ መስመር ላይ አንድ ሊንክ ያለው .txt ፋይል ይላኩ:',
    { parse_mode: 'Markdown' }
  );
  // State set in session; document handler will pick it up
  ctx.session = ctx.session || {};
  ctx.session.awaitingBulkStock = true;
});

// ─── Handle .txt file for bulk stock ─────────────────────
const handleBulkStockFile = adminOnly(async (ctx) => {
  const session = ctx.session || {};
  if (!session.awaitingBulkStock) return;

  const doc = ctx.message.document;
  if (!doc || !doc.file_name.endsWith('.txt')) {
    return ctx.reply('⚠️ .txt ፋይል ብቻ ይቀበላል።');
  }

  ctx.session.awaitingBulkStock = false;
  await ctx.reply('⏳ ሊንኮቹን በማስገባት ላይ...');

  const fileLink = await ctx.telegram.getFileLink(doc.file_id);
  const axios = require('axios');
  const resp = await axios.get(fileLink.href);
  const lines = resp.data.split('\n').map((l) => l.trim()).filter(Boolean);

  let added = 0;
  let skipped = 0;
  for (const link of lines) {
    try {
      await Stock.create({ link, addedBy: ctx.from.id });
      added++;
    } catch {
      skipped++;
    }
  }

  let reply = `✅ ተጨምሯል: *${added}* ሊንኮች\n⚠️ ተዘሉ (ያሉ): *${skipped}*`;
  const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: 1 });
  if (pendingOrders.length > 0) {
    const pendingOrder = pendingOrders[0];
    reply += `\n\n💡 *ማሳሰቢያ:* በጥበቃ ላይ ያለ ትዕዛዝ \`${pendingOrder.orderId}\` (ብዛት: ${pendingOrder.quantity || 1}) አለ! አሁን ማጽደቅ ይችላሉ፦`;
    return ctx.reply(reply, {
      parse_mode: 'Markdown',
      ...keyboards.pendingOrderPrompt(pendingOrder.orderId, pendingOrders.length, 'am'),
    });
  }

  await ctx.reply(reply, { parse_mode: 'Markdown' });
});

// ─── /stock — View stock summary ──────────────────────────
const handleStock = adminOnly(async (ctx) => {
  const SoldStock = require('../models/SoldStock');
  const available = await Stock.countDocuments({ isReserved: false });
  const reserved = await Stock.countDocuments({ isReserved: true });
  const activeTotal = await Stock.countDocuments();
  const sold = await SoldStock.countDocuments();

  await ctx.reply(
    `📦 *ስቶክ ሁኔታ*\n\n` +
      `✅ የሚገኝ (Available): *${available}*\n` +
      `⏳ በጥበቃ ላይ (Reserved): *${reserved}*\n` +
      `📋 ጠቅላላ በመጋዘን (Active): *${activeTotal}*\n` +
      `🔴 የተሸጠ (Sold Table): *${sold}*`,
    { parse_mode: 'Markdown' }
  );
});

// ─── /orders — List recent orders ─────────────────────────
const handleOrders = adminOnly(async (ctx) => {
  const text = ctx.message && ctx.message.text ? ctx.message.text : '';
  const args = text.split(' ');
  const filter = args[1]; // e.g. "pending" / "approved" / "rejected"
  const query = filter ? { status: filter } : {};

  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(15);
  if (orders.length === 0) {
    return ctx.reply('📭 ምንም ትዕዛዝ አልተገኘም።', {
      ...keyboards.adminPanel('am'),
    });
  }

  // Pre-fetch users for all orders to guarantee complete profile info
  const userIds = orders.map((o) => o.userId);
  const users = await User.find({ telegramId: { $in: userIds } });
  const userMap = new Map();
  users.forEach((u) => userMap.set(u.telegramId, u));

  const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
  const statusAm = { pending: 'በጥበቃ ላይ', approved: 'ተፈቅዷል', rejected: 'ውድቅ ተደርጓል' };

  let replyText = `📋 <b>የቅርብ ጊዜ ትዕዛዞች (${orders.length})</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  orders.forEach((o) => {
    const u = userMap.get(o.userId);
    const firstName = o.userInfo?.firstName || u?.firstName || '';
    const lastName = o.userInfo?.lastName || u?.lastName || '';
    const rawFullName = `${firstName} ${lastName}`.trim();
    const fullName = rawFullName || 'ስም የለም';
    const rawUsername = o.userInfo?.username || u?.username || null;
    const username = rawUsername ? `@${rawUsername}` : 'የለውም';
    const qty = o.quantity || 1;
    const dateStr = new Date(o.createdAt).toLocaleString('am-ET');

    replyText += `${statusEmoji[o.status]} <b>ትዕዛዝ:</b> <code>${escapeHtml(o.orderId)}</code> (${statusAm[o.status] || o.status})\n`;
    replyText += `   👤 <b>ስም:</b> ${escapeHtml(fullName)}\n`;
    replyText += `   🔗 <b>ዩዘርኔም:</b> ${escapeHtml(username)}\n`;
    replyText += `   🆔 <b>Telegram ID:</b> <code>${o.userId}</code>\n`;
    replyText += `   📦 <b>ብዛት:</b> ${qty} ሊንክ | 💰 <b>መጠን:</b> ${o.amount} ብር (${escapeHtml(o.paymentMethod)})\n`;
    replyText += `   📅 <b>ቀን:</b> ${dateStr}\n\n`;
  });

  await ctx.reply(replyText, {
    parse_mode: 'HTML',
    ...keyboards.adminPanel('am'),
  });
});

// ─── /stats — Dashboard statistics ───────────────────────
const handleStats = adminOnly(async (ctx) => {
  const SoldStock = require('../models/SoldStock');
  const [
    totalUsers,
    totalOrders,
    approvedOrders,
    pendingOrders,
    rejectedOrders,
    availableStock,
    soldStock,
  ] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: 'approved' }),
    Order.countDocuments({ status: 'pending' }),
    Order.countDocuments({ status: 'rejected' }),
    Stock.countDocuments({ isReserved: false }),
    SoldStock.countDocuments(),
  ]);

  const totalStock = availableStock + (await Stock.countDocuments({ isReserved: true }));

  // Revenue from approved orders
  const revResult = await Order.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRevenue = revResult[0]?.total || 0;

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';

  await ctx.reply(
    msg.adminStats(
      {
        totalUsers,
        totalOrders,
        approvedOrders,
        pendingOrders,
        rejectedOrders,
        totalStock,
        availableStock,
        soldStock,
        totalRevenue,
      },
      lang
    ),
    { parse_mode: 'Markdown' }
  );
});

// ─── Callback: approve_<orderId> ─────────────────────────
async function callbackApprove(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only').catch(() => {});
  await ctx.answerCbQuery('✅ በማጽደቅ ላይ...').catch(() => {});

  const orderId = ctx.callbackQuery.data.replace('approve_', '');

  // Load order
  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply(`❌ ትዕዛዝ ${orderId} አልተገኘም።`);
  if (order.status !== 'pending') {
    if (order.status === 'approved') {
      const links =
        order.deliveredLinks && order.deliveredLinks.length > 0
          ? order.deliveredLinks
          : order.deliveredLink
          ? [order.deliveredLink]
          : [];
      if (links.length > 0) {
        try {
          const customer = await User.findOne({ telegramId: order.userId });
          const custLang = customer && customer.language ? customer.language : 'am';
          await ctx.telegram.sendMessage(
            order.userId,
            msg.orderApproved(links, orderId, custLang),
            {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              ...keyboards.deliveredLinksKeyboard(links, custLang),
            }
          );
          return ctx.reply(`✅ ትዕዛዝ ${orderId} አስቀድሞ የጸደቀ ነበር። ሊንኩ ዳግም ወደ ደንበኛው (${order.userId}) በተሳካ ሁኔታ ተልኳል!`);
        } catch (err) {
          return ctx.reply(`❌ ወደ ደንበኛው ዳግም መላክ አልተቻለም: ${err.message}`);
        }
      }
    }
    return ctx.reply(`⚠️ ትዕዛዝ ${orderId} አስቀድሞ ${order.status} ነው።`);
  }

  const neededQty = order.quantity || 1;
  const stockIds =
    order.stockIds && order.stockIds.length > 0
      ? order.stockIds
      : order.stockId
      ? [order.stockId]
      : [];

  // 1. Grab reserved stocks if any
  let stocks = stockIds.length > 0 ? await Stock.find({ _id: { $in: stockIds } }) : [];
  if (stocks.length < neededQty) {
    const linkedStocks = await Stock.find({ orderId: order._id });
    if (linkedStocks.length > 0) {
      stocks = linkedStocks;
    }
  }

  // 2. If not enough reserved stocks, grab any newly added unreserved stocks from DB
  if (stocks.length < neededQty) {
    const remainingNeeded = neededQty - stocks.length;
    const existingIds = stocks.map((s) => s._id);
    const availableStocks = await Stock.find({
      _id: { $nin: existingIds },
      isSold: false,
      isReserved: false,
    }).limit(remainingNeeded);

    stocks = stocks.concat(availableStocks);
  }

  // 3. If STILL not enough stocks in database (e.g. 0 stock):
  // Prompt the admin directly to send the link right now!
  if (stocks.length < neededQty) {
    const remainingNeeded = neededQty - stocks.length;
    ctx.session = ctx.session || {};
    ctx.session.awaitingDirectDeliveryLink = {
      orderId: order.orderId,
      orderDbId: order._id,
      userId: order.userId,
      totalNeeded: neededQty,
      remainingNeeded: remainingNeeded,
      alreadyStocks: stocks,
      collectedLinks: [],
    };

    const user = await User.findOne({ telegramId: ctx.from.id });
    const lang = user && user.language ? user.language : 'am';
    const isEn = lang === 'en';
    const cust = await getCustomerDetails(order.userId, order.userInfo);

    let promptText = '';
    if (isEn) {
      promptText =
        `⚠️ <b>No stock available in database for Order ${escapeHtml(order.orderId)}!</b>` +
        (stocks.length > 0 ? ` (${stocks.length} in DB, ${remainingNeeded} more needed)` : '') +
        `\n\n` +
        `📦 Required Quantity: <b>${neededQty} link(s)</b>\n` +
        `💰 Paid Amount: <b>${order.amount} ETB</b>\n` +
        `👤 Name: <b>${cust.safeFullName}</b>\n` +
        `🔗 Username: <b>${cust.safeUsername}</b>\n` +
        `🆔 Telegram ID: <code>${order.userId}</code>\n\n` +
        (remainingNeeded > 1
          ? `👉 <b>Please send the 1st Gemini Pro activation link here:</b>\n\n💡 <i>Tip: You can send them one by one, or paste all ${remainingNeeded} links at once (one per line).</i>`
          : `👉 <b>Please send the Gemini Pro activation link here:</b>`);
    } else {
      promptText =
        `⚠️ <b>ለትዕዛዝ ${escapeHtml(order.orderId)} በዳታቤዝ ውስጥ የተዘጋጀ ስቶክ አልተገኘም!</b>` +
        (stocks.length > 0 ? ` (${stocks.length} በዳታቤዝ አለ፣ ${remainingNeeded} ተጨማሪ ያስፈልጋል)` : '') +
        `\n\n` +
        `📦 የሚፈለገው ብዛት: <b>${neededQty} ሊንክ</b>\n` +
        `💰 የተከፈለው መጠን: <b>${order.amount} ብር</b>\n` +
        `👤 ስም: <b>${cust.safeFullName}</b>\n` +
        `🔗 ዩዘርኔም: <b>${cust.safeUsername}</b>\n` +
        `🆔 Telegram ID: <code>${order.userId}</code>\n\n` +
        (remainingNeeded > 1
          ? `👉 <b>እባክዎ 1ኛውን የ Gemini Pro አክቲቬሽን ሊንክ እዚህ ይላኩ፦</b>\n\n💡 <i>ጠቃሚ ምክር: አንድ በአንድ ማስገባት ይችላሉ፣ ወይም ሁሉንም ${remainingNeeded} ሊንኮች በአንድ ላይ በየመስመሩ ለይተው መላክ ይችላሉ።</i>`
          : `👉 <b>እባክዎ አሁን ለደንበኛው የሚላከውን የ Gemini Pro ሊንክ እዚህ ይላኩ (paste ያድርጉ)፦</b>`);
    }

    return ctx.reply(promptText, {
      parse_mode: 'HTML',
      ...keyboards.cancelDirectDelivery(lang),
    });
  }

  // Archive into SoldStock collection
  const SoldStock = require('../models/SoldStock');
  const deliveredLinks = [];
  const unitAmount = order.amount / stocks.length;

  for (const stock of stocks) {
    await SoldStock.create({
      link: stock.link,
      description: stock.description || 'Gemini Pro 18 Months',
      orderId: order.orderId,
      userId: order.userId,
      buyerUsername: order.userInfo ? order.userInfo.username : null,
      buyerName: `${order.userInfo?.firstName || ''} ${order.userInfo?.lastName || ''}`.trim(),
      amount: unitAmount,
      paymentMethod: order.paymentMethod,
      soldAt: new Date(),
      addedBy: stock.addedBy,
      processedBy: ctx.from.id,
    });
    deliveredLinks.push(stock.link);
  }

  // Delete completely from active Stock collection so it never remains in the stock table!
  await Stock.deleteMany({
    $or: [
      { _id: { $in: stocks.map((s) => s._id) } },
      { orderId: order._id },
    ],
  });

  // Update order with deliveredLink & deliveredLinks
  await Order.updateOne(
    { _id: order._id },
    {
      status: 'approved',
      deliveredLink: deliveredLinks[0] || null,
      deliveredLinks: deliveredLinks,
      processedAt: new Date(),
      processedBy: ctx.from.id,
    }
  );

  // Send link(s) to customer in HTML format with direct browser open buttons
  try {
    const customer = await User.findOne({ telegramId: order.userId });
    const custLang = customer && customer.language ? customer.language : 'am';
    await ctx.telegram.sendMessage(
      order.userId,
      msg.orderApproved(deliveredLinks, orderId, custLang),
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...keyboards.deliveredLinksKeyboard(deliveredLinks, custLang),
      }
    );
  } catch (err) {
    console.error('Failed to send approval to user with HTML:', err.message);
    try {
      const customer = await User.findOne({ telegramId: order.userId });
      const custLang = customer && customer.language ? customer.language : 'am';
      let plainMsg =
        `🎉 ትዕዛዝዎ ጸድቋል!\n\n` +
        `🔢 የትዕዛዝ ቁጥር: ${orderId}\n` +
        `📦 የተገዛ ብዛት: ${deliveredLinks.length}\n\n` +
        `🔗 የ Gemini Pro አክቲቬሽን ሊንኮችዎ:\n`;
      deliveredLinks.forEach((lnk, i) => {
        plainMsg += `\n${i + 1}️⃣ ${lnk}\n`;
      });
      const supportUser = config.supportUsername || 'Mnbvcnvhd';
      plainMsg += `\n📋 Activation Instructions:\n• Connect VPN\n• Click the provided activation link\n• Sign in to the target Gmail account\n• Select Activate Offer\n\n❓ Issues? Contact: @${supportUser}\n\n🙏 እኛን ስለመረጡ እናመሰግናለን!`;

      await ctx.telegram.sendMessage(order.userId, plainMsg, {
        ...keyboards.deliveredLinksKeyboard(deliveredLinks, custLang),
      });
    } catch (err2) {
      console.error('Fallback approval delivery also failed:', err2.message);
    }
  }

  // Update admin message
  try {
    const cust = await getCustomerDetails(order.userId, order.userInfo);
    await ctx.editMessageCaption(
      `✅ <b>ተፈቅዷል! (${deliveredLinks.length}) ሊንክ ወደ ደንበኛው ተልኳል</b>\n\n` +
        `🔢 ትዕዛዝ: <code>${escapeHtml(orderId)}</code>\n` +
        `👤 ስም: <b>${cust.safeFullName}</b>\n` +
        `🔗 ዩዘርኔም: <b>${cust.safeUsername}</b>\n` +
        `🆔 Telegram ID: <code>${order.userId}</code>\n` +
        `📦 ብዛት: <b>${deliveredLinks.length}</b>\n` +
        `💰 መጠን: <b>${order.amount} ብር</b>`,
      { parse_mode: 'HTML' }
    );
  } catch {}
}

// ─── Callback: reject_<orderId> ──────────────────────────
async function callbackReject(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only').catch(() => {});
  await ctx.answerCbQuery('❌ በማስቀረት ላይ...').catch(() => {});

  const orderId = ctx.callbackQuery.data.replace('reject_', '');
  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply(`❌ ትዕዛዝ ${orderId} አልተገኘም።`);
  if (order.status !== 'pending') {
    return ctx.reply(`⚠️ ትዕዛዝ ${orderId} አስቀድሞ ${order.status} ነው።`);
  }

  // Ask admin for rejection reason
  await ctx.reply(
    `❌ *ምክንያት ይጻፉ (Reason for rejection):*\n\n` +
    `ምሳሌ: "ደረሰኝ ትክክል አይደለም", "ብር ያነሰ ነው", ወዘተ\n\n` +
    `ወይም "skip" ብለው ያለ ምክንያት ያሰናብቱ`,
    { parse_mode: 'Markdown' }
  );

  // Store pending rejection in session
  ctx.session = ctx.session || {};
  ctx.session.pendingRejection = { orderId, messageId: ctx.callbackQuery.message.message_id };
}

// ─── Text handler: rejection reason (admin) ──────────────
async function handleRejectionReason(ctx) {
  if (!isAdmin(ctx)) return;
  const session = ctx.session || {};
  if (!session.pendingRejection) return;

  const { orderId } = session.pendingRejection;
  const reason = ctx.message.text === 'skip' ? 'ደረሰኝ ትክክል አይደለም' : ctx.message.text;

  const order = await Order.findOne({ orderId });
  if (!order) return;

  // Release reserved stocks
  const stockIds =
    order.stockIds && order.stockIds.length > 0
      ? order.stockIds
      : order.stockId
      ? [order.stockId]
      : [];

  if (stockIds.length > 0) {
    await Stock.updateMany(
      { _id: { $in: stockIds } },
      {
        $set: {
          isReserved: false,
          reservedAt: null,
          reservedBy: null,
          reservedMethod: null,
          orderId: null,
        },
      }
    );
  }

  // Update order
  await Order.updateOne(
    { _id: order._id },
    { status: 'rejected', adminNote: reason, processedAt: new Date(), processedBy: ctx.from.id }
  );

  // Notify customer in their preferred language
  try {
    const customer = await User.findOne({ telegramId: order.userId });
    const custLang = customer && customer.language ? customer.language : 'am';
    await ctx.telegram.sendMessage(order.userId, msg.orderRejected(reason, orderId, custLang), {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Failed to notify customer of rejection:', err.message);
  }

  ctx.session.pendingRejection = null;
  await ctx.reply(`✅ ትዕዛዝ \`${orderId}\` ተሰርዟል። ደንበኛው ተነግሯል።`, {
    parse_mode: 'Markdown',
  });
}

// ─── Callback: details_<orderId> ─────────────────────────
async function callbackDetails(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only');
  await ctx.answerCbQuery();

  const orderId = ctx.callbackQuery.data.replace('details_', '');
  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply('❌ ትዕዛዝ አልተገኘም።');

  const cust = await getCustomerDetails(order.userId, order.userInfo);

  const text =
    `🔍 <b>ትዕዛዝ ዝርዝር (Order Details)</b>\n\n` +
    `🔢 ትዕዛዝ: <code>${escapeHtml(order.orderId)}</code>\n` +
    `👤 ስም: <b>${cust.safeFullName}</b>\n` +
    `🔗 ዩዘርኔም: <b>${cust.safeUsername}</b>\n` +
    `🆔 Telegram ID: <code>${order.userId}</code>\n` +
    `📦 ብዛት: <b>${order.quantity || 1} ሊንክ</b>\n` +
    `💰 መጠን: <b>${order.amount} ብር</b>\n` +
    `💳 ክፍያ: <b>${escapeHtml(order.paymentMethod)}</b>\n` +
    `📊 ሁኔታ: <b>${escapeHtml(order.status)}</b>\n` +
    `📅 ቀን: ${new Date(order.createdAt).toLocaleString('am-ET')}`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...keyboards.adminPanel('am'),
  });
}

// ─── Admin panel callbacks ────────────────────────────────
async function callbackAdminStats(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only');
  await ctx.answerCbQuery();
  await handleStats(ctx);
}

async function callbackAdminStock(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only');
  await ctx.answerCbQuery();
  await handleStock(ctx);
}

// ─── /setprice [amount] — Update product price ──────────
const handleSetPrice = adminOnly(async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) {
    ctx.session = ctx.session || {};
    ctx.session.awaitingNewPrice = true;
    return ctx.reply(
      isEn
        ? `💰 *Change Product Price*\n\nCurrent Price: *${config.productPrice} ETB*\n\nPlease enter the **new price** below (numbers only, e.g. \`300\`):`
        : `💰 *የምርት ዋጋ ማስተካከያ*\n\nየአሁኑ ዋጋ፦ *${config.productPrice} ብር*\n\nእባክዎ **አዲሱን ዋጋ** ብቻ እዚህ ይላኩ (ምሳሌ: \`300\`):`,
      {
        parse_mode: 'Markdown',
        ...keyboards.cancelPriceChange(lang),
      }
    );
  }

  const newPrice = parseInt(parts[1]);
  if (isNaN(newPrice) || newPrice <= 0) {
    return ctx.reply(
      isEn
        ? '⚠️ Please enter a valid positive number for the price. Example: `/setprice 300`'
        : '⚠️ እባክዎ ትክክለኛ የቁጥር ዋጋ ያስገቡ። ምሳሌ: `/setprice 300`',
      { parse_mode: 'Markdown' }
    );
  }

  const settingsService = require('../services/settingsService');
  await settingsService.setProductPrice(newPrice);

  return ctx.reply(
    isEn
      ? `✅ Product price has been successfully updated to *${newPrice} ETB*!`
      : `✅ የምርት ዋጋ በተሳካ ሁኔታ ወደ *${newPrice} ብር* ተቀይሯል!`,
    {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(lang),
    }
  );
});

// ─── Callback: "admin_change_price" ───────────────────────
const callbackChangePrice = adminOnly(async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  ctx.session = ctx.session || {};
  ctx.session.awaitingNewPrice = true;

  return ctx.reply(
    isEn
      ? `💰 *Change Product Price*\n\nCurrent Price: *${config.productPrice} ETB*\n\nPlease enter the **new price** below (numbers only, e.g. \`300\`):`
      : `💰 *የምርት ዋጋ ማስተካከያ*\n\nየአሁኑ ዋጋ፦ *${config.productPrice} ብር*\n\nእባክዎ **አዲሱን ዋጋ** ብቻ እዚህ ይላኩ (ምሳሌ: \`300\`):`,
    {
      parse_mode: 'Markdown',
      ...keyboards.cancelPriceChange(lang),
    }
  );
});

// ─── Handle Direct Price Input from Admin ─────────────────
const handlePriceInput = adminOnly(async (ctx) => {
  const session = ctx.session || {};
  if (!session.awaitingNewPrice) return false;

  const rawText = ctx.message.text ? ctx.message.text.trim() : '';
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const newPrice = parseInt(rawText);
  if (isNaN(newPrice) || newPrice <= 0) {
    await ctx.reply(
      isEn
        ? '⚠️ Please enter a valid number for the price (e.g. `300`):'
        : '⚠️ እባክዎ ትክክለኛ የቁጥር ዋጋ ብቻ ያስገቡ (ምሳሌ: `300`):',
      {
        parse_mode: 'Markdown',
        ...keyboards.cancelPriceChange(lang),
      }
    );
    return true;
  }

  session.awaitingNewPrice = false;

  const settingsService = require('../services/settingsService');
  await settingsService.setProductPrice(newPrice);

  await ctx.reply(
    isEn
      ? `✅ Product price has been successfully updated to *${newPrice} ETB*!`
      : `✅ የምርት ዋጋ በተሳካ ሁኔታ ወደ *${newPrice} ብር* ተቀይሯል!`,
    {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(lang),
    }
  );
  return true;
});

// ─── Callback: Cancel Price Change ────────────────────────
const callbackCancelPriceChange = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('ተሰርዟል').catch(() => {});
  if (ctx.session) ctx.session.awaitingNewPrice = false;

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  await ctx.reply(
    isEn
      ? '❌ Price change cancelled.'
      : '❌ የዋጋ ለውጥ ተሰርዟል።',
    {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(lang),
    }
  );
});

// ─── /resend <orderId> — Re-send delivered link to customer ─
const handleResend = adminOnly(async (ctx) => {
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);
  const orderId = parts[1];

  if (!orderId) {
    return ctx.reply('⚠️ የትዕዛዝ ቁጥር ያስገቡ፦ `/resend ORD-0001`', { parse_mode: 'Markdown' });
  }

  const order = await Order.findOne({ orderId: orderId.toUpperCase() });
  if (!order) {
    return ctx.reply(`❌ ትዕዛዝ ${orderId} አልተገኘም።`);
  }

  const links =
    order.deliveredLinks && order.deliveredLinks.length > 0
      ? order.deliveredLinks
      : order.deliveredLink
      ? [order.deliveredLink]
      : [];

  if (links.length === 0) {
    return ctx.reply(`⚠️ ለትዕዛዝ ${orderId} የተላከ ሊንክ አልተገኘም። ትዕዛዙ ገና አልጸደቀም ወይም ሊንክ የለውም።`);
  }

  try {
    const customer = await User.findOne({ telegramId: order.userId });
    const custLang = customer && customer.language ? customer.language : 'am';
    await ctx.telegram.sendMessage(
      order.userId,
      msg.orderApproved(links, order.orderId, custLang),
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...keyboards.deliveredLinksKeyboard(links, custLang),
      }
    );
    return ctx.reply(`✅ ሊንኩ ዳግም ወደ ደንበኛው (${order.userId}) በተሳካ ሁኔታ ተልኳል!`);
  } catch (err) {
    return ctx.reply(`❌ ወደ ደንበኛው መላክ አልተቻለም: ${err.message}`);
  }
});

// ─── Execute Direct On-Demand Delivery to Customer ────────
async function executeDirectDelivery(ctx, orderId) {
  const session = ctx.session || {};
  const deliveryData = session.awaitingDirectDeliveryLink;

  const order = await Order.findOne({ orderId });
  if (!order || order.status !== 'pending') {
    if (session) session.awaitingDirectDeliveryLink = null;
    return ctx.reply(`⚠️ ትዕዛዝ ${orderId} አስቀድሞ ተስተናግዷል ወይም አልተገኘም።`);
  }

  const collectedLinks = deliveryData ? deliveryData.collectedLinks : [];
  const alreadyStocks = (deliveryData && deliveryData.alreadyStocks) ? deliveryData.alreadyStocks : [];
  const fromDbLinks = alreadyStocks.map((s) => s.link);
  const deliveredLinks = [...fromDbLinks, ...collectedLinks];

  if (deliveredLinks.length === 0) {
    return ctx.reply('⚠️ ምንም የተመዘገበ ሊንክ የለም። እባክዎ እንደገና ይሞክሩ።');
  }

  // Clear session
  session.awaitingDirectDeliveryLink = null;

  // Archive into SoldStock collection
  const SoldStock = require('../models/SoldStock');
  const unitAmount = order.amount / deliveredLinks.length;

  for (const link of deliveredLinks) {
    await SoldStock.create({
      link,
      description: 'Gemini Pro 18 Months',
      orderId: order.orderId,
      userId: order.userId,
      buyerUsername: order.userInfo ? order.userInfo.username : null,
      buyerName: `${order.userInfo?.firstName || ''} ${order.userInfo?.lastName || ''}`.trim(),
      amount: unitAmount,
      paymentMethod: order.paymentMethod,
      soldAt: new Date(),
      addedBy: ctx.from.id,
      processedBy: ctx.from.id,
    });
  }

  // If any stocks were fetched from active DB Stock, delete them to avoid duplication
  if (alreadyStocks.length > 0) {
    await Stock.deleteMany({
      _id: { $in: alreadyStocks.map((s) => s._id) },
    });
  }

  // Update order with deliveredLink & deliveredLinks
  await Order.updateOne(
    { _id: order._id },
    {
      status: 'approved',
      deliveredLink: deliveredLinks[0] || null,
      deliveredLinks: deliveredLinks,
      processedAt: new Date(),
      processedBy: ctx.from.id,
    }
  );

  // Deliver to customer with HTML format and direct browser open buttons
  try {
    const customer = await User.findOne({ telegramId: order.userId });
    const custLang = customer && customer.language ? customer.language : 'am';
    await ctx.telegram.sendMessage(
      order.userId,
      msg.orderApproved(deliveredLinks, orderId, custLang),
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...keyboards.deliveredLinksKeyboard(deliveredLinks, custLang),
      }
    );
  } catch (err) {
    console.error('Failed to send direct approval to user with HTML:', err.message);
  }

  // Confirm to admin
  const user = await User.findOne({ telegramId: ctx.from.id });
  const adminLang = user && user.language ? user.language : 'am';
  const cust = await getCustomerDetails(order.userId, order.userInfo);
  const confirmation =
    adminLang === 'en'
      ? `🎉 <b>Order ${escapeHtml(orderId)} Approved & Delivered!</b>\n\n` +
        `👤 Name: <b>${cust.safeFullName}</b>\n` +
        `🔗 Username: <b>${cust.safeUsername}</b>\n` +
        `🆔 Telegram ID: <code>${order.userId}</code>\n` +
        `📦 Quantity: <b>${deliveredLinks.length} link(s)</b>\n` +
        `💰 Paid: <b>${order.amount} ETB</b> (${escapeHtml(order.paymentMethod)})\n\n` +
        `✅ All links have been sent to the customer with direct open buttons!`
      : `🎉 <b>ትዕዛዝ ${escapeHtml(orderId)} ጸድቋል!</b>\n\n` +
        `👤 ስም: <b>${cust.safeFullName}</b>\n` +
        `🔗 ዩዘርኔም: <b>${cust.safeUsername}</b>\n` +
        `🆔 Telegram ID: <code>${order.userId}</code>\n` +
        `📦 የተላከ ብዛት: <b>${deliveredLinks.length} ሊንክ</b>\n` +
        `💰 ክፍያ: <b>${order.amount} ብር</b> (${escapeHtml(order.paymentMethod)})\n\n` +
        `✅ ሁሉም ሊንኮች ወዲያውኑ ወደ ደንበኛው በ Browser መክፈቻ አዝራር ተልከዋል!`;

  await ctx.reply(confirmation, {
    parse_mode: 'HTML',
    ...keyboards.adminPanel(adminLang),
  });

  return true;
}

// ─── Handle Direct Activation Link Input from Admin (Step by Step) ────────
const handleDirectDeliveryLink = adminOnly(async (ctx) => {
  const session = ctx.session || {};
  if (!session.awaitingDirectDeliveryLink) return false;

  const rawText = ctx.message.text ? ctx.message.text.trim() : '';
  const lower = rawText.toLowerCase();

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const { orderId, totalNeeded, remainingNeeded, collectedLinks } = session.awaitingDirectDeliveryLink;

  // Check if admin typed cancel
  if (['cancel', 'ሰርዝ', '/cancel'].includes(lower)) {
    session.awaitingDirectDeliveryLink = null;
    await ctx.reply(
      isEn
        ? '❌ Delivery cancelled. The order remains pending.'
        : '❌ ሊንክ መላኩ ተሰርዟል። ትዕዛዙ አሁንም በጥበቃ (pending) ላይ ይቆያል።',
      { ...keyboards.adminPanel(lang) }
    );
    return true;
  }

  // Check if admin typed "ጨርሻለሁ", "finish", "done", "send", "approve"
  if (
    ['finish', 'finished', 'done', 'ጨርሻለሁ', 'ጨርስ', 'ላክ', 'send', 'approve'].includes(lower) &&
    collectedLinks.length >= remainingNeeded
  ) {
    return executeDirectDelivery(ctx, orderId);
  }

  // Extract links
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http://') || l.startsWith('https://'));

  if (lines.length === 0) {
    await ctx.reply(
      isEn
        ? '⚠️ Please enter a valid URL starting with `https://` (or tap Cancel below):'
        : '⚠️ እባክዎ በ `https://` የሚጀምር ትክክለኛ የሊንክ አድራሻ ያስገቡ (ወይም ለመሰረዝ ከታች ያለውን ይጫኑ)፦',
      {
        parse_mode: 'Markdown',
        ...keyboards.cancelDirectDelivery(lang),
      }
    );
    return true;
  }

  // Append newly received links
  collectedLinks.push(...lines);
  const currentCount = collectedLinks.length;

  // If still need more links
  if (currentCount < remainingNeeded) {
    const nextNumber = currentCount + 1;
    const remainingLeft = remainingNeeded - currentCount;
    const nextText = isEn
      ? `✅ *Link #${currentCount} recorded! (${currentCount}/${remainingNeeded})*\n\n➕ Now enter **Link #${nextNumber}** here:\n\n💡 _(${remainingLeft} more link${remainingLeft > 1 ? 's' : ''} needed)_`
      : `✅ *${currentCount}ኛውን ሊንክ ተቀብለናል! (${currentCount}/${remainingNeeded})*\n\n➕ አሁን **${nextNumber}ኛውን ሊንክ** እዚህ ያስገቡ፦\n\n💡 _(${remainingLeft} ሊንክ ይቀራል)_`;

    await ctx.reply(nextText, {
      parse_mode: 'Markdown',
      ...keyboards.cancelDirectDelivery(lang),
    });
    return true;
  }

  // All needed links are collected! Show review and Finish/Deliver button
  const finalCollected = collectedLinks.slice(0, remainingNeeded);
  session.awaitingDirectDeliveryLink.collectedLinks = finalCollected;

  const targetOrder = await Order.findOne({ orderId });
  const cust = await getCustomerDetails(targetOrder?.userId, targetOrder?.userInfo);

  let reviewMsg = isEn
    ? `🎉 <b>All ${remainingNeeded} link(s) ready!</b>\n\n` +
      `🔢 Order ID: <code>${escapeHtml(orderId)}</code>\n` +
      `👤 Name: <b>${cust.safeFullName}</b>\n` +
      `🔗 Username: <b>${cust.safeUsername}</b>\n` +
      `🆔 Telegram ID: <code>${targetOrder ? targetOrder.userId : ''}</code>\n` +
      `📦 Collected Links (${finalCollected.length}):\n`
    : `🎉 <b>ሁሉም (${remainingNeeded}) ሊንኮች ተሟልተዋል!</b> 👏\n\n` +
      `🔢 የትዕዛዝ ቁጥር: <code>${escapeHtml(orderId)}</code>\n` +
      `👤 ስም: <b>${cust.safeFullName}</b>\n` +
      `🔗 ዩዘርኔም: <b>${cust.safeUsername}</b>\n` +
      `🆔 Telegram ID: <code>${targetOrder ? targetOrder.userId : ''}</code>\n` +
      `📦 የተዘጋጁ ሊንኮች (${finalCollected.length})፦\n`;

  finalCollected.forEach((lnk, idx) => {
    reviewMsg += `\n${idx + 1}️⃣ <code>${escapeHtml(lnk.substring(0, 55))}...</code>`;
  });

  reviewMsg += isEn
    ? `\n\n👉 <b>Review the links above and tap "Finished - Send to Customer" to deliver!</b>`
    : `\n\n👉 <b>ሊንኮቹን ካረጋገጡ በኋላ ከታች ያለውን «🚀 ጨርሻለሁ - ለደንበኛው ላክ» የሚለውን አዝራር ይጫኑ፦</b>`;

  await ctx.reply(reviewMsg, {
    parse_mode: 'HTML',
    ...keyboards.directDeliveryReview(orderId, finalCollected.length, lang),
  });
  return true;
});

// ─── Callback: Deliver Direct Links (Admin tapped Finish) ───
const callbackDeliverDirect = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('🚀 በመላክ ላይ...').catch(() => {});
  const orderId = ctx.callbackQuery.data.replace('deliver_direct_', '');
  return executeDirectDelivery(ctx, orderId);
});

// ─── Callback: Cancel Direct Delivery ──────────────────────
const callbackCancelDirectDelivery = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('ተሰርዟል').catch(() => {});
  if (ctx.session) ctx.session.awaitingDirectDeliveryLink = null;
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';
  await ctx.reply(
    isEn
      ? '❌ Delivery cancelled. The order remains pending.'
      : '❌ ሊንክ መላኩ ተሰርዟል። ትዕዛዙ አሁንም በጥበቃ (pending) ላይ ይቆያል።',
    {
      ...keyboards.adminPanel(lang),
    }
  );
});

// ─── Broadcast / Announcement System ──────────────────────

// Command: /broadcast or /announce
const handleBroadcast = adminOnly(async (ctx) => {
  const text = ctx.message.text.replace(/^\/(broadcast|announce)/i, '').trim();
  if (!text) {
    return startBroadcast(ctx);
  }

  // Admin provided text directly with the command
  ctx.session = ctx.session || {};
  ctx.session.broadcastPayload = {
    type: 'text',
    text: text,
  };
  ctx.session.awaitingBroadcastMessage = false;

  return showBroadcastPreview(ctx, text);
});

// Interactive broadcast start (from button or empty /broadcast)
const startBroadcast = adminOnly(async (ctx) => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  ctx.session = ctx.session || {};
  ctx.session.awaitingBroadcastMessage = true;
  ctx.session.broadcastPayload = null;

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const promptText = isEn
    ? `📢 <b>Broadcast Announcement to All Users</b>\n\n` +
      `Please send the message you want to broadcast to all users:\n\n` +
      `💡 <i>You can send text, a photo with caption, links, or forward a message. Whatever you send will be delivered to every customer!</i>\n\n` +
      `Or tap Cancel below to abort.`
    : `📢 <b>የማስታወቂያ መልእክት መላኪያ (Broadcast to All Users)</b>\n\n` +
      `እባክዎ ለሁሉም የቦቱ ተጠቃሚዎች የሚተላለፈውን የማስታወቂያ መልእክት እዚህ ይላኩ፦\n\n` +
      `💡 <i>ማስታወሻ፦ ጽሑፍ፣ ፎቶ ከነጽሑፉ፣ ሊንክ ወይም ያማረ ፎርማት ያለው መልእክት መላክ ይችላሉ። የላኩት መልእክት እንዳለ ተባዝቶ ለሁሉም ደንበኞች ይደርሳል!</i>\n\n` +
      `ወይም ለመተው ከታች «❌ ሰርዝ» የሚለውን ይጫኑ።`;

  return ctx.reply(promptText, {
    parse_mode: 'HTML',
    ...keyboards.cancelBroadcast(lang),
  });
});

// Handle incoming message when session.awaitingBroadcastMessage is active
async function handleBroadcastMessage(ctx) {
  const session = ctx.session || {};
  if (!session.awaitingBroadcastMessage) return false;

  const rawText = ctx.message.text ? ctx.message.text.trim().toLowerCase() : '';
  if (['cancel', 'ሰርዝ', '/cancel'].includes(rawText)) {
    session.awaitingBroadcastMessage = false;
    session.broadcastPayload = null;
    const user = await User.findOne({ telegramId: ctx.from.id });
    const lang = user && user.language ? user.language : 'am';
    await ctx.reply(lang === 'en' ? '❌ Broadcast cancelled.' : '❌ ማስታወቂያ መላኩ ተሰርዟል።', {
      ...keyboards.adminPanel(lang),
    });
    return true;
  }

  session.awaitingBroadcastMessage = false;
  session.broadcastPayload = {
    type: 'copy',
    messageId: ctx.message.message_id,
    chatId: ctx.chat.id,
  };

  return showBroadcastPreview(ctx);
}

// Show preview and ask for confirmation
async function showBroadcastPreview(ctx, directText = null) {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const totalUsers = await User.countDocuments({ isBlocked: { $ne: true } });

  let text = isEn
    ? `👁️ <b>Announcement Preview & Confirmation</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      (directText
        ? `📝 <i>Message Content:</i>\n${escapeHtml(directText)}\n━━━━━━━━━━━━━━━━━━━━\n`
        : `👆 <i>The message you sent above is ready to be sent.</i>\n━━━━━━━━━━━━━━━━━━━━\n`) +
      `👥 <b>Total Recipients:</b> <code>${totalUsers}</code> active user(s)\n\n` +
      `👉 <b>Are you sure you want to broadcast this message to all users now?</b>`
    : `👁️ <b>የማስታወቂያ ቅድመ-ዕይታ እና ማረጋገጫ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      (directText
        ? `📝 <i>የመልእክቱ ይዘት፦</i>\n${escapeHtml(directText)}\n━━━━━━━━━━━━━━━━━━━━\n`
        : `👆 <i>ከላይ የላኩት መልእክት ለሁሉም ተጠቃሚዎች ለመላክ ተዘጋጅቷል።</i>\n━━━━━━━━━━━━━━━━━━━━\n`) +
      `👥 <b>ጠቅላላ ተቀባዮች:</b> <code>${totalUsers}</code> ተጠቃሚዎች\n\n` +
      `👉 <b>ይህ መልእክት አሁን ለሁሉም ተጠቃሚዎች እንዲላክ ይፈልጋሉ?</b>`;

  return ctx.reply(text, {
    parse_mode: 'HTML',
    ...keyboards.broadcastConfirm(lang),
  });
}

// Execute the broadcast loop
async function executeBroadcast(ctx) {
  const session = ctx.session || {};
  const payload = session.broadcastPayload;
  if (!payload) {
    return ctx.reply('⚠️ የሚላክ የማስታወቂያ መልእክት አልተገኘም። እባክዎ እንደገና ይሞክሩ።');
  }

  session.broadcastPayload = null;
  session.awaitingBroadcastMessage = false;

  const users = await User.find({ isBlocked: { $ne: true } });
  const total = users.length;

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  if (total === 0) {
    return ctx.reply(isEn ? '📭 No active users found in database.' : '📭 በዳታቤዝ ውስጥ ምንም ንቁ ተጠቃሚ አልተገኘም።', {
      ...keyboards.adminPanel(lang),
    });
  }

  await ctx.reply(
    isEn
      ? `⏳ <b>Broadcasting in progress...</b>\nSending to ${total} user(s). Please wait...`
      : `⏳ <b>ማስታወቂያው በመላክ ላይ ነው...</b>\nለ ${total} ተጠቃሚዎች በመላክ ላይ። እባክዎ ትንሽ ይጠብቁ...`,
    { parse_mode: 'HTML' }
  );

  let successCount = 0;
  let blockedCount = 0;
  let failedCount = 0;

  for (const u of users) {
    try {
      if (payload.type === 'copy') {
        await ctx.telegram.copyMessage(u.telegramId, payload.chatId, payload.messageId);
      } else if (payload.type === 'text') {
        await ctx.telegram.sendMessage(u.telegramId, payload.text, { parse_mode: 'HTML' });
      }
      successCount++;
    } catch (err) {
      const errMsg = err.message || '';
      if (
        errMsg.includes('403') ||
        errMsg.includes('blocked') ||
        errMsg.includes('deactivated') ||
        errMsg.includes('chat not found')
      ) {
        blockedCount++;
        await User.updateOne({ _id: u._id }, { isBlocked: true }).catch(() => {});
      } else {
        failedCount++;
      }
    }
    // Rate limit safety: 35ms between sends (~28 msgs/sec)
    await new Promise((r) => setTimeout(r, 35));
  }

  const reportText = isEn
    ? `📢 <b>Broadcast Completed!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Successfully Sent: <b>${successCount}</b>\n` +
      `🚫 Blocked / Deactivated: <b>${blockedCount}</b>\n` +
      `⚠️ Failed: <b>${failedCount}</b>\n` +
      `👥 Total Target Users: <b>${total}</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 All done!`
    : `📢 <b>የማስታወቂያ መላክ ሂደት ተጠናቋል!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ በተሳካ ሁኔታ የደረሳቸው: <b>${successCount}</b>\n` +
      `🚫 ቦቱን ያገዱ / ያልተገኙ: <b>${blockedCount}</b>\n` +
      `⚠️ ያልተሳካ: <b>${failedCount}</b>\n` +
      `👥 ጠቅላላ ተጠቃሚዎች: <b>${total}</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 ማስታወቂያው ለሁሉም ተጠቃሚዎች ተልኳል!`;

  return ctx.reply(reportText, {
    parse_mode: 'HTML',
    ...keyboards.adminPanel(lang),
  });
}

// Callback: confirm_broadcast
const callbackConfirmBroadcast = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('🚀 በማሰራጨት ላይ...').catch(() => {});
  return executeBroadcast(ctx);
});

// Callback: cancel_broadcast
const callbackCancelBroadcast = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('ተሰርዟል').catch(() => {});
  if (ctx.session) {
    ctx.session.awaitingBroadcastMessage = false;
    ctx.session.broadcastPayload = null;
  }
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  return ctx.reply(lang === 'en' ? '❌ Broadcast cancelled.' : '❌ ማስታወቂያ መላኩ ተሰርዟል።', {
    ...keyboards.adminPanel(lang),
  });
});

module.exports = {
  handleAdmin,
  handleAddStock,
  handleAddStockBulk,
  handleRestock,
  startInteractiveAddStock,
  handleStockInput,
  callbackFinishAddStock,
  callbackCancelAddStock,
  handleBulkStockFile,
  handleStock,
  handleOrders,
  handleStats,
  handleSetPrice,
  handlePriceInput,
  handleResend,
  handleRejectionReason,
  callbackApprove,
  callbackReject,
  callbackDetails,
  callbackAdminStats,
  callbackAdminStock,
  callbackChangePrice,
  callbackCancelPriceChange,
  handleDirectDeliveryLink,
  callbackDeliverDirect,
  callbackCancelDirectDelivery,
  handleBroadcast,
  startBroadcast,
  handleBroadcastMessage,
  callbackConfirmBroadcast,
  callbackCancelBroadcast,
};

