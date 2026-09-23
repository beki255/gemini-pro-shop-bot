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
  return async (ctx, ...args) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('🚫 ይህ አዛዥ ለአስተዳዳሪ ብቻ ነው።');
    }
    return handler(ctx, ...args);
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
  const isEn = lang === 'en';
  const settingsService = require('../services/settingsService');
  const isOpen = settingsService.getIsAcceptingOrders();

  const statusBadge = isOpen
    ? (isEn ? '🟢 <b>OPEN</b> (Accepting Orders)' : '🟢 <b>ክፍት ነው</b> (ትዕዛዝ ይቀበላል)')
    : (isEn ? '🔴 <b>PAUSED / OUT OF STOCK</b> (No Orders Accepted)' : '🔴 <b>ስቶክ አልቋል / ቆሟል</b> (ትዕዛዝ አይቀበልም)');

  const panelMsg = isEn
    ? `🔧 <b>Admin Control Panel</b>\n━━━━━━━━━━━━━━━━━━━━━\n🏪 <b>Store Status:</b> ${statusBadge}\n\n<i>Use the button below to toggle accepting customer orders:</i>`
    : `🔧 <b>የአስተዳዳሪ መቆጣጠሪያ ፓነል</b>\n━━━━━━━━━━━━━━━━━━━━━\n🏪 <b>የሱቁ ሁኔታ:</b> ${statusBadge}\n\n<i>ስቶክ ሲያልቅ ወይም ደንበኞች እንዳይከፍሉ ከታች ያለውን አዝራር ይጫኑ፦</i>`;

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(panelMsg, {
        parse_mode: 'HTML',
        ...keyboards.adminPanel(lang),
      });
      return;
    } catch {}
  }

  await ctx.reply(panelMsg, {
    parse_mode: 'HTML',
    ...keyboards.adminPanel(lang),
  });
});

// ─── Callback: Toggle store status (Open vs Out of Stock) ─
const callbackToggleStoreStatus = adminOnly(async (ctx) => {
  const settingsService = require('../services/settingsService');
  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const newStatus = await settingsService.toggleAcceptingOrders();

  const alertMsg = newStatus
    ? (isEn
        ? '🟢 Store Opened!\nCustomers can now browse and place orders.'
        : '🟢 ሱቁ ክፍት ተደርጓል!\nደንበኞች እንደገና ማዘዝና መክፈል ይችላሉ።')
    : (isEn
        ? '🔴 Store Paused (Out of Stock)!\nCustomers clicking "Buy Now" will see out-of-stock message. No payments will be accepted.'
        : '🔴 ስቶክ አልቋል (ትዕዛዝ ቆሟል)!\nደንበኞች "ምርት ግዛ" ሲሉ የስቶክ ማለቂያ መልዕክት ይደርሳቸዋል፤ ምንም ክፍያ አይቀበልም።');

  await ctx.answerCbQuery(alertMsg, { show_alert: true }).catch(() => {});

  const statusBadge = newStatus
    ? (isEn ? '🟢 <b>OPEN</b> (Accepting Orders)' : '🟢 <b>ክፍት ነው</b> (ትዕዛዝ ይቀበላል)')
    : (isEn ? '🔴 <b>PAUSED / OUT OF STOCK</b> (No Orders Accepted)' : '🔴 <b>ስቶክ አልቋል / ቆሟል</b> (ትዕዛዝ አይቀበልም)');

  const panelMsg = isEn
    ? `🔧 <b>Admin Control Panel</b>\n━━━━━━━━━━━━━━━━━━━━━\n🏪 <b>Store Status:</b> ${statusBadge}\n\n<i>Use the button below to toggle accepting customer orders:</i>`
    : `🔧 <b>የአስተዳዳሪ መቆጣጠሪያ ፓነል</b>\n━━━━━━━━━━━━━━━━━━━━━\n🏪 <b>የሱቁ ሁኔታ:</b> ${statusBadge}\n\n<i>ስቶክ ሲያልቅ ወይም ደንበኞች እንዳይከፍሉ ከታች ያለውን አዝራር ይጫኑ፦</i>`;

  try {
    await ctx.editMessageText(panelMsg, {
      parse_mode: 'HTML',
      ...keyboards.adminPanel(lang),
    });
  } catch {
    try {
      await ctx.editMessageReplyMarkup(keyboards.adminPanel(lang).reply_markup);
    } catch {}
  }
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
// ─── /orders — List and filter orders (Approved, Pending, Rejected, All) ───
const handleOrders = adminOnly(async (ctx, filterOverride, pageOverride) => {
  const adminUser = await User.findOne({ telegramId: ctx.from.id });
  const lang = adminUser && adminUser.language ? adminUser.language : 'am';
  const isEn = lang === 'en';

  const text = ctx.message && ctx.message.text ? ctx.message.text.trim() : '';
  const args = text.split(/\s+/);
  const paramFilter = args.length > 1 ? args[1].toLowerCase() : null;

  // Detect filter from callbackQuery or argument
  let filter = filterOverride || paramFilter || null;
  let page = pageOverride || 1;

  if (ctx.callbackQuery && ctx.callbackQuery.data) {
    if (ctx.callbackQuery.data.startsWith('admin_orders_filter_')) {
      filter = ctx.callbackQuery.data.replace('admin_orders_filter_', '');
      page = 1;
    } else if (ctx.callbackQuery.data.startsWith('admin_orders_page_')) {
      const parts = ctx.callbackQuery.data.replace('admin_orders_page_', '').split('_');
      filter = parts[0] || 'all';
      page = parseInt(parts[1], 10) || 1;
    }
  }

  // If no filter is chosen, display the interactive Orders Category Selection Menu!
  if (!filter) {
    const [total, pending, approved, rejected] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'approved' }),
      Order.countDocuments({ status: 'rejected' }),
    ]);

    const counts = { total, pending, approved, rejected };

    const menuText = isEn
      ? `📋 <b>Orders Management</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 <b>Total Orders:</b> <code>${total}</code>\n` +
        `✅ <b>Approved (Delivered):</b> <code>${approved}</code>\n` +
        `⏳ <b>Pending (Waiting):</b> <code>${pending}</code>\n` +
        `❌ <b>Rejected:</b> <code>${rejected}</code>\n\n` +
        `👉 <b>Please select which orders to view:</b>`
      : `📋 <b>የትዕዛዞች መቆጣጠሪያ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 <b>ጠቅላላ ትዕዛዞች:</b> <code>${total}</code>\n` +
        `✅ <b>የተፈቀዱ (የደረሱ):</b> <code>${approved}</code>\n` +
        `⏳ <b>ያልተፈቀዱ / በጥበቃ ላይ:</b> <code>${pending}</code>\n` +
        `❌ <b>ውድቅ የተደረጉ:</b> <code>${rejected}</code>\n\n` +
        `👉 <b>እባክዎ ማየት የሚፈልጉትን የትዕዛዝ አይነት ይምረጡ፡</b>`;

    const kb = keyboards.adminOrdersMenu(counts, lang);

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(menuText, { parse_mode: 'HTML', ...kb });
      } catch (e) {
        if (!e.description?.includes('message is not modified')) {
          return await ctx.reply(menuText, { parse_mode: 'HTML', ...kb });
        }
        return;
      }
    }
    return await ctx.reply(menuText, { parse_mode: 'HTML', ...kb });
  }

  // Filter has been chosen: 'approved', 'pending', 'rejected', or 'all'
  let query = {};
  let titleAm = 'ሁሉም ትዕዛዞች';
  let titleEn = 'All Orders';
  let headerEmoji = '📋';

  if (filter === 'approved') {
    query = { status: 'approved' };
    titleAm = '✅ የተፈቀዱ ትዕዛዞች (Approved)';
    titleEn = '✅ Approved Orders';
    headerEmoji = '✅';
  } else if (filter === 'pending') {
    query = { status: 'pending' };
    titleAm = '⏳ ያልተፈቀዱ / በጥበቃ ላይ ያሉ ትዕዛዞች (Pending)';
    titleEn = '⏳ Pending Orders';
    headerEmoji = '⏳';
  } else if (filter === 'rejected') {
    query = { status: 'rejected' };
    titleAm = '❌ ውድቅ የተደረጉ ትዕዛዞች (Rejected)';
    titleEn = '❌ Rejected Orders';
    headerEmoji = '❌';
  } else {
    filter = 'all';
    query = {};
    titleAm = '📋 ሁሉም ትዕዛዞች (All Orders)';
    titleEn = '📋 All Orders';
    headerEmoji = '📋';
  }

  const limit = 5; // 5 orders per page for clean mobile layout
  const totalCount = await Order.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const skip = (currentPage - 1) * limit;

  const orders = await Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  if (orders.length === 0) {
    const emptyText = isEn
      ? `${headerEmoji} <b>No orders found under "${titleEn}".</b>`
      : `${headerEmoji} <b>በ «${titleAm}» ስር ምንም ትዕዛዝ አልተገኘም።</b>`;

    const kb = keyboards.adminOrdersPagination(filter, 1, 1, lang, []);
    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(emptyText, { parse_mode: 'HTML', ...kb });
      } catch (e) {
        return await ctx.reply(emptyText, { parse_mode: 'HTML', ...kb });
      }
    }
    return await ctx.reply(emptyText, { parse_mode: 'HTML', ...kb });
  }

  // Pre-fetch users for all orders to guarantee complete profile info
  const userIds = orders.map((o) => o.userId);
  const users = await User.find({ telegramId: { $in: userIds } });
  const userMap = new Map();
  users.forEach((u) => userMap.set(u.telegramId, u));

  const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
  const statusAm = { pending: 'በጥበቃ ላይ', approved: 'ተፈቅዷል', rejected: 'ውድቅ ተደርጓል' };

  let replyText =
    `${headerEmoji} <b>${isEn ? titleEn : titleAm} (${totalCount})</b>\n` +
    `📄 <b>ገጽ:</b> ${currentPage}/${totalPages}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n`;

  orders.forEach((o, idx) => {
    const u = userMap.get(o.userId);
    const firstName = o.userInfo?.firstName || u?.firstName || '';
    const lastName = o.userInfo?.lastName || u?.lastName || '';
    const rawFullName = `${firstName} ${lastName}`.trim();
    const fullName = rawFullName || (isEn ? 'No Name' : 'ስም የለም');
    o.customerName = firstName || fullName;
    const rawUsername = o.userInfo?.username || u?.username || null;
    const username = rawUsername ? `@${rawUsername}` : (isEn ? 'None' : 'የለውም');
    const userLink = rawUsername
      ? `<a href="https://t.me/${rawUsername}">${escapeHtml(fullName)}</a>`
      : `<a href="tg://user?id=${o.userId}">${escapeHtml(fullName)}</a>`;
    const qty = o.quantity || 1;
    const dateStr = new Date(o.createdAt).toLocaleString('am-ET');

    replyText += `<b>${skip + idx + 1}.</b> ${statusEmoji[o.status] || '📦'} <b>የትዕዛዝ ቁጥር:</b> <code>${escapeHtml(o.orderId)}</code> (${statusAm[o.status] || o.status})\n`;
    replyText += `   👤 <b>ደንበኛ:</b> ${userLink} (${escapeHtml(username)})\n`;
    replyText += `   🆔 <b>Telegram ID:</b> <code>${o.userId}</code>\n`;
    replyText += `   📦 <b>ብዛት:</b> <b>${qty} ሊንክ</b> | 💰 <b>ክፍያ:</b> <b>${o.amount} ብር</b> (${escapeHtml(o.paymentMethod || 'CBE')})\n`;
    replyText += `   📅 <b>ቀን:</b> ${dateStr}\n`;
    if (o.status === 'rejected' && o.adminNote) {
      replyText += `   📝 <b>የተሰረዘበት ምክንያት:</b> <i>${escapeHtml(o.adminNote)}</i>\n`;
    }
    replyText += `\n`;
  });

  const kb = keyboards.adminOrdersPagination(filter, currentPage, totalPages, lang, orders);

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(replyText, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...kb,
      });
    } catch (e) {
      if (!e.description?.includes('message is not modified')) {
        return await ctx.reply(replyText, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...kb,
        });
      }
      return;
    }
  }

  await ctx.reply(replyText, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...kb,
  });
});

// ─── /users — List registered users from database ─────────
const handleUsers = adminOnly(async (ctx, pageOverride) => {
  const text = ctx.message && ctx.message.text ? ctx.message.text.trim() : '';
  const args = text.split(/\s+/);
  const searchParam = args.length > 1 ? args[1] : null;

  const adminUser = await User.findOne({ telegramId: ctx.from.id });
  const lang = adminUser && adminUser.language ? adminUser.language : 'am';
  const isEn = lang === 'en';

  // If a specific user query is provided (/users <id or @username>)
  if (searchParam && !pageOverride) {
    let query = {};
    if (/^\d+$/.test(searchParam)) {
      query = { telegramId: parseInt(searchParam) };
    } else {
      const cleanUser = searchParam.replace(/^@/, '');
      query = { username: new RegExp(`^${cleanUser}$`, 'i') };
    }

    const foundUser = await User.findOne(query);
    if (!foundUser) {
      return ctx.reply(
        isEn
          ? `❌ User "<b>${escapeHtml(searchParam)}</b>" was not found in the database.`
          : `❌ ተጠቃሚ "<b>${escapeHtml(searchParam)}</b>" በዳታቤዝ ውስጥ አልተገኘም።`,
        { parse_mode: 'HTML', ...keyboards.adminPanel(lang) }
      );
    }

    // Fetch user's orders
    const userOrders = await Order.find({ userId: foundUser.telegramId }).sort({ createdAt: -1 });
    const approvedCount = userOrders.filter((o) => o.status === 'approved').length;
    const totalSpent = userOrders
      .filter((o) => o.status === 'approved')
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const fullName = `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || (isEn ? 'No Name' : 'ስም የለም');
    const username = foundUser.username ? `@${foundUser.username}` : (isEn ? 'None' : 'የለውም');
    const userLang = foundUser.language === 'en' ? '🇬🇧 English' : '🇪🇹 አማርኛ';
    const regDate = foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleString('am-ET') : 'ያልታወቀ';
    const statusText = foundUser.isBlocked ? '🔴 የታገደ (Blocked)' : '🟢 ንቁ (Active)';

    let detailText =
      `👤 <b>የተጠቃሚ ዝርዝር መረጃ (User Details)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ስም:</b> <b>${escapeHtml(fullName)}</b>\n` +
      `🔗 <b>ዩዘርኔም:</b> <b>${escapeHtml(username)}</b>\n` +
      `🆔 <b>Telegram ID:</b> <code>${foundUser.telegramId}</code>\n` +
      `🌐 <b>ቋንቋ:</b> ${userLang}\n` +
      `📊 <b>ሁኔታ:</b> ${statusText}\n` +
      `📅 <b>የተመዘገበበት:</b> ${regDate}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>ጠቅላላ ትዕዛዞች:</b> ${userOrders.length} (${approvedCount} የጸደቁ)\n` +
      `💰 <b>ጠቅላላ የወጣው ገንዘብ:</b> ${totalSpent} ብር\n\n`;

    if (userOrders.length > 0) {
      detailText += `📋 <b>የቅርብ ትዕዛዞች:</b>\n`;
      userOrders.slice(0, 5).forEach((o) => {
        const stEmoji = o.status === 'approved' ? '✅' : o.status === 'pending' ? '⏳' : '❌';
        detailText += `• ${stEmoji} <code>${o.orderId}</code> — ${o.amount} ብር (${escapeHtml(o.paymentMethod || 'CBE')})\n`;
      });
    }

    return ctx.reply(detailText, {
      parse_mode: 'HTML',
      ...keyboards.adminUsersPagination(1, 1, lang),
    });
  }

  // Paginated user list
  let page = pageOverride;
  if (!page && ctx.callbackQuery && ctx.callbackQuery.data && ctx.callbackQuery.data.startsWith('admin_users_page_')) {
    page = parseInt(ctx.callbackQuery.data.replace('admin_users_page_', '')) || 1;
  }
  page = page || 1;

  const PAGE_SIZE = 8;
  const totalUsers = await User.countDocuments();
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  if (users.length === 0) {
    return ctx.reply(
      isEn ? '📭 No registered users found in the database.' : '📭 በዳታቤዝ ውስጥ ምንም የተመዘገበ ተጠቃሚ አልተገኘም።',
      { ...keyboards.adminPanel(lang) }
    );
  }

  let textMsg =
    `👥 <b>የተመዘገቡ ተጠቃሚዎች (Registered Users)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>ጠቅላላ ደንበኞች:</b> <b>${totalUsers}</b>\n` +
    `📄 <b>ገጽ:</b> <b>${currentPage} / ${totalPages}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n`;

  users.forEach((u, i) => {
    const num = (currentPage - 1) * PAGE_SIZE + i + 1;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'ስም የለም';
    const username = u.username ? `@${u.username}` : 'የለውም';
    const userLang = u.language === 'en' ? '🇬🇧 EN' : '🇪🇹 AM';
    const orders = u.totalOrders || 0;
    const status = u.isBlocked ? '🔴' : '🟢';
    const regDate = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '';

    textMsg +=
      `<b>${num}.</b> ${status} <b>${escapeHtml(fullName)}</b>\n` +
      `   🔗 <b>ዩዘርኔም:</b> ${escapeHtml(username)}\n` +
      `   🆔 <b>ID:</b> <code>${u.telegramId}</code>\n` +
      `   📦 <b>ትዕዛዞች:</b> ${orders} | 🌐 ${userLang} | 📅 ${regDate}\n\n`;
  });

  textMsg += `💡 <i>አንድን ተጠቃሚ በዝርዝር ለማየት:</i> <code>/users &lt;Telegram ID ወይም @username&gt;</code>`;

  const keyboard = keyboards.adminUsersPagination(currentPage, totalPages, lang);

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(textMsg, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...keyboard,
      });
      return;
    } catch (err) {
      if (err.description && err.description.includes('message is not modified')) {
        return;
      }
      console.error('Failed to editMessageText for admin users:', err.message);
    }
  }

  return ctx.reply(textMsg, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...keyboard,
  });
});

// ─── Callback: admin_users (Page 1) ───────────────────────
const callbackUsers = adminOnly(async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  return handleUsers(ctx, 1);
});

// ─── Callback: admin_users_page_<page> ────────────────────
const callbackUsersPage = adminOnly(async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const page = parseInt(ctx.callbackQuery.data.replace('admin_users_page_', '')) || 1;
  return handleUsers(ctx, page);
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
      plainMsg += `\n📋 Activation Instructions:\n• Connect VPN for only activation, after activation you can turn off\n• Click the provided activation link\n• Sign in to the target Gmail account\n• Select Activate Offer\n\n❓ Issues? Contact: @${supportUser}\n\n🙏 እኛን ስለመረጡ እናመሰግናለን!`;

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
  const expectedAmount = order.amount || (order.quantity || 1) * (config.productPrice || 250);
  await ctx.reply(
    `❌ *ምክንያት ይጻፉ (Reason for rejection):*\n\n` +
    `📦 *የትዕዛዝ መረጃ:* ${order.quantity || 1} ሊንክ (${expectedAmount} ብር)\n\n` +
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

  // Notify customer in their preferred language with custom multiplied price
  try {
    const customer = await User.findOne({ telegramId: order.userId });
    const custLang = customer && customer.language ? customer.language : 'am';
    await ctx.telegram.sendMessage(
      order.userId,
      msg.orderRejected(reason, orderId, custLang, order.amount, order.quantity),
      {
        parse_mode: 'Markdown',
      }
    );
  } catch (err) {
    console.error('Failed to notify customer of rejection:', err.message);
  }

  ctx.session.pendingRejection = null;
  await ctx.reply(`✅ ትዕዛዝ \`${orderId}\` ተሰርዟል። ደንበኛው ተነግሯል።`, {
    parse_mode: 'Markdown',
  });
}

// ─── Callback: View Order Receipt (admin_view_receipt_<orderId>_<filter>_<page>) ───
const callbackViewReceipt = adminOnly(async (ctx) => {
  await ctx.answerCbQuery('🖼️ ደረሰኝ በማምጣት ላይ...').catch(() => {});
  const data = ctx.callbackQuery.data.replace('admin_view_receipt_', '');
  const parts = data.split('_');
  const orderId = parts[0];
  const returnFilter = parts[1] || 'all';
  const returnPage = parseInt(parts[2], 10) || 1;

  const order = await Order.findOne({ orderId });
  if (!order) {
    return ctx.reply(`❌ ትዕዛዝ ${orderId} አልተገኘም።`);
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  const cust = await getCustomerDetails(order.userId, order.userInfo);
  const statusBadge =
    order.status === 'approved'
      ? (isEn ? '✅ <b>Approved (ተፈቅዷል)</b>' : '✅ <b>ተፈቅዷል</b>')
      : (order.status === 'rejected'
          ? (isEn ? '❌ <b>Rejected (ውድቅ ተደርጓል)</b>' : '❌ <b>ውድቅ ተደርጓል</b>')
          : (isEn ? '⏳ <b>Pending Review (በጥበቃ ላይ)</b>' : '⏳ <b>በጥበቃ ላይ</b>'));

  const dateStr = new Date(order.createdAt).toLocaleString('am-ET');
  const unitPrice = config.productPrice || 250;
  const qty = order.quantity || 1;

  let caption =
    `🧾 <b>${isEn ? 'Payment Receipt & Order Details' : 'የትዕዛዝ ደረሰኝ እና ሙሉ መረጃ'}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 <b>የትዕዛዝ ቁጥር:</b> <code>${escapeHtml(order.orderId)}</code>\n` +
    `📊 <b>ሁኔታ:</b> ${statusBadge}\n` +
    `👤 <b>ደንበኛ:</b> ${cust.safeFullName}\n` +
    `🔗 <b>ዩዘርኔም:</b> ${cust.safeUsername}\n` +
    `🆔 <b>Telegram ID:</b> <code>${order.userId}</code>\n` +
    `📦 <b>የተመረጠ ብዛት:</b> <b>${qty} ሊንክ</b>\n` +
    `💰 <b>የተከፈለ ክፍያ:</b> <b>${order.amount} ብር</b> (${qty} × ${unitPrice} ብር)\n` +
    `💳 <b>የክፍያ መንገድ:</b> <b>${escapeHtml(order.paymentMethod || 'CBE')}</b>\n` +
    `📅 <b>የታዘዘበት ቀን:</b> ${dateStr}\n`;

  if (order.status === 'rejected' && order.adminNote) {
    caption += `📝 <b>ውድቅ የተደረገበት ምክንያት:</b> <i>${escapeHtml(order.adminNote)}</i>\n`;
  }
  if (order.status === 'approved' && order.deliveredLinks && order.deliveredLinks.length > 0) {
    caption += `🎁 <b>የተላከ ሊንክ:</b> ${order.deliveredLinks.length} ሊንክ ተልኳል\n`;
  }

  const kb = keyboards.adminOrderReceiptView(order, returnFilter, returnPage, lang);

  // Try sending receipt photo or document if file_id exists
  if (order.receiptFileId) {
    try {
      return await ctx.replyWithPhoto(order.receiptFileId, {
        caption,
        parse_mode: 'HTML',
        ...kb,
      });
    } catch (photoErr) {
      try {
        return await ctx.replyWithDocument(order.receiptFileId, {
          caption,
          parse_mode: 'HTML',
          ...kb,
        });
      } catch (docErr) {
        console.error('Failed to send receipt by fileId:', docErr.message);
      }
    }
  }

  // Fallback to local file if exists
  if (order.receiptPath) {
    try {
      const fs = require('fs-extra');
      if (fs.existsSync(order.receiptPath)) {
        return await ctx.replyWithPhoto(
          { source: order.receiptPath },
          {
            caption,
            parse_mode: 'HTML',
            ...kb,
          }
        );
      }
    } catch (fsErr) {
      console.error('Failed to send receipt from local path:', fsErr.message);
    }
  }

  // If no image file found, reply with rich text details
  caption += `\n⚠️ <i>ለዚህ ትዕዛዝ በቴሌግራም የተያያዘ የደረሰኝ ምስል አልተገኘም።</i>`;
  return ctx.reply(caption, {
    parse_mode: 'HTML',
    ...kb,
  });
});

// ─── Callback: details_<orderId> ─────────────────────────
async function callbackDetails(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('🚫 Admin only');
  const orderId = ctx.callbackQuery.data.replace('details_', '');
  ctx.callbackQuery.data = `admin_view_receipt_${orderId}_all_1`;
  return callbackViewReceipt(ctx);
}

// ─── Callback: resend_link_<orderId> ─────────────────────
const callbackResendOrderLink = adminOnly(async (ctx) => {
  const orderId = ctx.callbackQuery.data.replace('resend_link_', '');
  await ctx.answerCbQuery('🔄 በመላክ ላይ...').catch(() => {});

  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply(`❌ ትዕዛዝ ${orderId} አልተገኘም።`);

  const links =
    order.deliveredLinks && order.deliveredLinks.length > 0
      ? order.deliveredLinks
      : order.deliveredLink
      ? [order.deliveredLink]
      : [];

  if (links.length === 0) {
    return ctx.reply(`⚠️ ለትዕዛዝ ${orderId} የተላከ ሊንክ አልተገኘም።`);
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
    return ctx.reply('⚠️ የትዕዛዝ ቁጥር ያስገቡ፦ `/resend ORD-XXXX`', { parse_mode: 'Markdown' });
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
  handleUsers,
  callbackUsers,
  callbackUsersPage,
  callbackToggleStoreStatus,
  callbackViewReceipt,
  callbackResendOrderLink,
};

