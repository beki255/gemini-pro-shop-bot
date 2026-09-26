// src/bot.js - Main Bot Entry Point
const { Telegraf, session } = require('telegraf');
const express = require('express');
const config = require('./config');
const { connectDB } = require('./database');

// Handlers
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');

// ─── Initialize Bot ───────────────────────────────────────
const bot = new Telegraf(config.botToken);

// Session middleware (in-memory)
bot.use(session());

// Middleware: safely catch callback_query timeout/expired errors, and provide safe no-op on message updates
bot.use(async (ctx, next) => {
  const sender = ctx.from ? `${ctx.from.id} (@${ctx.from.username || ctx.from.first_name || 'unknown'})` : 'unknown';
  const detail = ctx.message ? (ctx.message.text || '[media]') : (ctx.callbackQuery ? ctx.callbackQuery.data : '');
  console.log(`📩 [${ctx.updateType}] from ${sender} — "${detail}"`);

  if (ctx.callbackQuery) {
    const origAnswerCbQuery = ctx.answerCbQuery.bind(ctx);
    ctx.answerCbQuery = async (...args) => {
      try {
        return await origAnswerCbQuery(...args);
      } catch (err) {
        // Silently catch expired query timeout errors
        return false;
      }
    };
  } else {
    // Prevent Telegraf error if answerCbQuery is called during message update
    ctx.answerCbQuery = async () => false;
  }
  return next();
});

// ─── User Commands ────────────────────────────────────────
bot.start(userHandlers.handleStart);
bot.command('buy', userHandlers.handleBuy);
bot.command('myorders', userHandlers.handleMyOrders);
bot.command('help', userHandlers.handleHelp);
bot.command('contact', userHandlers.handleContact);
bot.command('language', userHandlers.handleLanguage);
bot.command('lang', userHandlers.handleLanguage);

// ─── Admin Commands ───────────────────────────────────────
bot.command('admin', adminHandlers.handleAdmin);
bot.command('addstock', adminHandlers.handleAddStock);
bot.command('addstockbulk', adminHandlers.handleAddStockBulk);
bot.command('stock', adminHandlers.handleStock);
bot.command(['orders', 'order'], adminHandlers.handleOrders);
bot.command(['checkouts', 'checkout'], adminHandlers.handleCheckouts);
bot.command('stats', adminHandlers.handleStats);
bot.command('setprice', adminHandlers.handleSetPrice);
bot.command('price', adminHandlers.handleSetPrice);
bot.command('resend', adminHandlers.handleResend);
bot.command('restock', adminHandlers.handleRestock);
bot.command('broadcast', adminHandlers.handleBroadcast);
bot.command('announce', adminHandlers.handleBroadcast);
bot.command(['users', 'customers', 'members'], adminHandlers.handleUsers);

// ─── Persistent Bottom Menu Text Handlers ─────────────────
bot.hears(['🛒 ምርት ግዛ (Buy Now)', '🛒 ምርት ግዛ', 'Buy'], userHandlers.handleBuy);
bot.hears(['📦 የኔ ትዕዛዞች (My Orders)', '📦 የኔ ትዕዛዞች', 'My Orders'], userHandlers.handleMyOrders);
bot.hears(['❓ እርዳታ (Help)', '❓ እርዳታ', 'Help'], userHandlers.handleHelp);
bot.hears(['📞 አግኙን (Contact)', '📞 አግኙን', 'Contact'], userHandlers.handleContact);
bot.hears(['📊 ስታቲስቲክስ (Stats)', '📊 ስታቲስቲክስ'], adminHandlers.handleStats);
bot.hears(['📦 ስቶክ (Stock)', '📦 ስቶክ'], adminHandlers.handleStock);
bot.hears(['🏠 ዋና ማውጫ (Main Menu)', '🏠 ዋና ማውጫ'], userHandlers.handleStart);

// ─── Callback Query Router ────────────────────────────────
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // User callbacks
  if (data === 'buy') return userHandlers.callbackBuy(ctx);
  if (data === 'refresh_menu') return userHandlers.callbackRefreshMenu(ctx);
  if (data === 'refresh_qty') return userHandlers.callbackRefreshQty(ctx);
  if (data.startsWith('qty_')) {
    if (data === 'qty_custom') return userHandlers.callbackCustomQty(ctx);
    const qty = parseInt(data.replace('qty_', '')) || 1;
    return userHandlers.callbackSelectQty(ctx, qty);
  }
  if (data.startsWith('pay_cbe')) {
    const parts = data.split('_');
    const qty = parts.length > 2 ? parseInt(parts[2]) : 1;
    return userHandlers.callbackPaymentMethod(ctx, 'CBE', qty);
  }
  if (data.startsWith('pay_telebirr')) {
    const parts = data.split('_');
    const qty = parts.length > 2 ? parseInt(parts[2]) : 1;
    return userHandlers.callbackPaymentMethod(ctx, 'Telebirr', qty);
  }
  if (data === 'proceed_payment') return userHandlers.callbackProceedPayment(ctx);
  if (data === 'cancel') return userHandlers.callbackCancel(ctx);
  if (data.startsWith('copy_acc_')) {
    const isCbe = data === 'copy_acc_cbe';
    const acc = isCbe ? config.payment.cbe.account : config.payment.telebirr.account;
    const name = isCbe ? config.payment.cbe.name : config.payment.telebirr.name;
    const alertText = isCbe
      ? `🏦 የኢትዮጵያ ንግድ ባንክ (CBE)\n━━━━━━━━━━━━━━\n📋 የሒሳብ ቁጥር:\n${acc}\n\n👤 ስም: ${name}\n\n(ከመልዕክቱ ላይ ቁጥሩን በመንካት ወዲያው መቅዳት ይችላሉ!)`
      : `📱 ቴሌብር (Telebirr)\n━━━━━━━━━━━━━━\n📋 የስልክ ቁጥር:\n${acc}\n\n👤 ስም: ${name}\n\n(ከመልዕክቱ ላይ ቁጥሩን በመንካት ወዲያው መቅዳት ይችላሉ!)`;
    return ctx.answerCbQuery(alertText, { show_alert: true }).catch(() => {});
  }
  if (data === 'main_menu') return userHandlers.callbackMainMenu(ctx);
  if (data === 'my_orders') return userHandlers.callbackMyOrders(ctx);
  if (data.startsWith('my_orders_page_')) return userHandlers.callbackMyOrdersPage(ctx);
  if (data === 'help') return userHandlers.callbackHelp(ctx);
  if (data === 'contact') return userHandlers.callbackContact(ctx);
  if (data === 'set_lang_am') return userHandlers.callbackSetLanguage(ctx, 'am');
  if (data === 'set_lang_en') return userHandlers.callbackSetLanguage(ctx, 'en');
  if (data === 'change_language') return userHandlers.handleLanguage(ctx);
  if (data.startsWith('check_pending_')) {
    const orderId = data.replace('check_pending_', '');
    const User = require('./models/User');
    const user = await User.findOne({ telegramId: ctx.from.id });
    const lang = user && user.language ? user.language : 'am';
    const isEn = lang === 'en';
    const alertMsg = isEn
      ? `⏳ Order ${orderId} is being reviewed by the admin.\n\nYour Gemini Pro activation link will be sent here automatically as soon as it is approved!`
      : `⏳ ትዕዛዝ ${orderId} በአስተዳዳሪው በመረጋገጥ ላይ ነው!\n\nልክ እንዳረጋገጠ የ Gemini Pro አክቲቬሽን ሊንክዎ ወዲያውኑ እዚህ ይላክሎታል!`;
    return ctx.answerCbQuery(alertMsg, { show_alert: true }).catch(() => {});
  }

  // Admin callbacks
  if (data === 'open_admin' || data === 'admin_panel') return adminHandlers.handleAdmin(ctx);
  if (data === 'admin_toggle_store_status') return adminHandlers.callbackToggleStoreStatus(ctx);
  if (data === 'admin_orders') {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandlers.handleOrders(ctx);
  }
  if (data.startsWith('admin_orders_filter_')) {
    await ctx.answerCbQuery().catch(() => {});
    const filter = data.replace('admin_orders_filter_', '');
    return adminHandlers.handleOrders(ctx, filter, 1);
  }
  if (data.startsWith('admin_orders_page_')) {
    await ctx.answerCbQuery().catch(() => {});
    const parts = data.replace('admin_orders_page_', '').split('_');
    const filter = parts[0] || 'all';
    const page = parseInt(parts[1], 10) || 1;
    return adminHandlers.handleOrders(ctx, filter, page);
  }
  if (data === 'admin_checkouts') {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandlers.handleCheckouts(ctx);
  }
  if (data.startsWith('admin_checkouts_filter_')) {
    await ctx.answerCbQuery().catch(() => {});
    const filter = data.replace('admin_checkouts_filter_', '');
    return adminHandlers.handleCheckouts(ctx, filter, 1);
  }
  if (data.startsWith('admin_checkouts_page_')) {
    await ctx.answerCbQuery().catch(() => {});
    const parts = data.replace('admin_checkouts_page_', '').split('_');
    const filter = parts[0] || 'awaiting';
    const page = parseInt(parts[1], 10) || 1;
    return adminHandlers.handleCheckouts(ctx, filter, page);
  }
  if (data === 'admin_users') return adminHandlers.callbackUsers(ctx);
  if (data.startsWith('admin_users_page_')) return adminHandlers.callbackUsersPage(ctx);
  if (data === 'noop') return ctx.answerCbQuery().catch(() => {});
  if (data.startsWith('approve_')) return adminHandlers.callbackApprove(ctx);
  if (data.startsWith('reject_quick_')) return adminHandlers.callbackQuickReject(ctx);
  if (data.startsWith('reject_')) return adminHandlers.callbackReject(ctx);
  if (data === 'cancel_rejection') return adminHandlers.callbackCancelRejection(ctx);
  if (data.startsWith('details_')) return adminHandlers.callbackDetails(ctx);
  if (data.startsWith('admin_view_receipt_')) return adminHandlers.callbackViewReceipt(ctx);
  if (data.startsWith('resend_link_')) return adminHandlers.callbackResendOrderLink(ctx);
  if (data === 'admin_stats') return adminHandlers.callbackAdminStats(ctx);
  if (data === 'admin_stock') return adminHandlers.callbackAdminStock(ctx);
  if (data === 'admin_change_price') return adminHandlers.callbackChangePrice(ctx);
  if (data === 'cancel_change_price') return adminHandlers.callbackCancelPriceChange(ctx);
  if (data === 'admin_start_add_stock') return adminHandlers.startInteractiveAddStock(ctx);
  if (data === 'finish_add_stock') return adminHandlers.callbackFinishAddStock(ctx);
  if (data === 'cancel_add_stock') return adminHandlers.callbackCancelAddStock(ctx);
  if (data === 'cancel_direct_delivery') return adminHandlers.callbackCancelDirectDelivery(ctx);
  if (data.startsWith('deliver_direct_')) return adminHandlers.callbackDeliverDirect(ctx);
  if (data === 'admin_broadcast') return adminHandlers.startBroadcast(ctx);
  if (data === 'confirm_broadcast') return adminHandlers.callbackConfirmBroadcast(ctx);
  if (data === 'cancel_broadcast') return adminHandlers.callbackCancelBroadcast(ctx);
  if (data === 'admin_add_help') {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery('🚫 Admin only').catch(() => {});
    await ctx.answerCbQuery();
    return ctx.reply(
      `➕ *ስቶክ መጨመሪያ መመሪያ:*\n\n` +
      `1️⃣ *አንድ ሊንክ ለመጨመር:*\n` +
      `\`/addstock https://accounts.google.com/...\`\n\n` +
      `2️⃣ *ብዙ ሊንኮች በአንድ ጊዜ ለመጨመር:*\n` +
      `\`/addstockbulk\` ብለው የ .txt ፋይል ይላኩ\n\n` +
      `3️⃣ *ወይም ብዙ ሊንኮችን በየመስመሩ በመጻፍ:*\n` +
      `\`/addstock https://link1\nhttps://link2\nhttps://link3\``,
      { parse_mode: 'Markdown' }
    );
  }
  if (data === 'view_customer_store') {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery('🚫 Admin only').catch(() => {});
    await ctx.answerCbQuery();
    const path = require('path');
    const fs = require('fs-extra');
    const msg = require('./utils/messages');
    const keyboards = require('./utils/keyboard');
    const config = require('./config');
    const reservationService = require('./services/reservationService');
    const stockCount = await reservationService.getAvailableStockCount();
    const lang = await userHandlers.getUserLang(ctx.from.id);
    const price = config.productPrice || 250;

    const productPhotoPath = path.join(__dirname, '../assets/gemini_product.png');
    if (fs.existsSync(productPhotoPath)) {
      try {
        return await ctx.replyWithPhoto(
          { source: productPhotoPath },
          {
            caption: msg.adminStorePreview(price, stockCount, lang),
            parse_mode: 'HTML',
            ...keyboards.adminStorePreview(lang),
          }
        );
      } catch (err) {
        console.error('Failed to replyWithPhoto for store preview:', err.message);
      }
    }

    return ctx.reply(msg.adminStorePreview(price, stockCount, lang), {
      parse_mode: 'HTML',
      ...keyboards.adminStorePreview(lang),
    });
  }

  if (data === 'admin_refresh_store_view') {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery('🚫 Admin only').catch(() => {});
    const msg = require('./utils/messages');
    const keyboards = require('./utils/keyboard');
    const config = require('./config');
    const reservationService = require('./services/reservationService');
    const stockCount = await reservationService.getAvailableStockCount();
    const lang = await userHandlers.getUserLang(ctx.from.id);
    const price = config.productPrice || 250;

    await ctx.answerCbQuery(lang === 'en' ? '🔄 Store preview refreshed' : '🔄 የሱቅ ሁኔታው ታድሷል');

    try {
      return await ctx.editMessageCaption(msg.adminStorePreview(price, stockCount, lang), {
        parse_mode: 'HTML',
        ...keyboards.adminStorePreview(lang),
      });
    } catch {
      return ctx.editMessageText(msg.adminStorePreview(price, stockCount, lang), {
        parse_mode: 'HTML',
        ...keyboards.adminStorePreview(lang),
      }).catch(() => {});
    }
  }

  // Unknown
  await ctx.answerCbQuery('⚠️ ያልታወቀ ትዕዛዝ');
});

// ─── Photo Handler (receipt upload & admin broadcast) ────
bot.on('photo', async (ctx) => {
  // Admin broadcast announcement with photo
  if (ctx.from && ctx.from.id === config.adminId && ctx.session?.awaitingBroadcastMessage) {
    const handled = await adminHandlers.handleBroadcastMessage(ctx);
    if (handled) return;
  }
  // User receipt upload
  await userHandlers.handleReceipt(ctx);
});

// ─── Document Handler (bulk stock file for admin & user receipt) ─────────
bot.on('document', async (ctx) => {
  const session = ctx.session || {};
  if (session.awaitingBulkStock && ctx.from.id === config.adminId) {
    return adminHandlers.handleBulkStockFile(ctx);
  }
  if (ctx.from && ctx.from.id === config.adminId && session.awaitingBroadcastMessage) {
    const handled = await adminHandlers.handleBroadcastMessage(ctx);
    if (handled) return;
  }
  // User receipt upload (image sent as document, PDF receipt, etc.)
  await userHandlers.handleReceipt(ctx);
});

// ─── Text Handler (custom quantity & admin rejection) ───
bot.on('text', async (ctx) => {
  const session = ctx.session || {};

  // Skip commands (already handled)
  if (ctx.message.text.startsWith('/')) return;

  // Admin broadcast announcement message input
  if (ctx.from.id === config.adminId && session.awaitingBroadcastMessage) {
    const handled = await adminHandlers.handleBroadcastMessage(ctx);
    if (handled) return;
  }

  // Admin direct price change input
  if (ctx.from.id === config.adminId && session.awaitingNewPrice) {
    const handled = await adminHandlers.handlePriceInput(ctx);
    if (handled) return;
  }

  // Admin direct delivery link input (on-demand stock fulfillment)
  if (ctx.from.id === config.adminId && session.awaitingDirectDeliveryLink) {
    const handled = await adminHandlers.handleDirectDeliveryLink(ctx);
    if (handled) return;
  }

  // Customer custom quantity input
  if (session.awaitingCustomQty) {
    const handled = await userHandlers.handleCustomQtyInput(ctx);
    if (handled) return;
  }

  // Also support typing a number directly (e.g. 2, 3, 5) to select quantity
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (/^\d+$/.test(text) && ctx.from.id !== config.adminId) {
    const num = parseInt(text);
    if (num > 0 && num <= 500) {
      session.awaitingCustomQty = true;
      const handled = await userHandlers.handleCustomQtyInput(ctx);
      if (handled) return;
    }
  }

  // Admin rejection reason
  if (ctx.from.id === config.adminId && session.pendingRejection) {
    return adminHandlers.handleRejectionReason(ctx);
  }

  // Customer awaiting receipt but sent plain text
  if (session.pendingOrder && ctx.from.id !== config.adminId) {
    const lang = await userHandlers.getUserLang(ctx.from.id);
    return ctx.reply(
      lang === 'en'
        ? '📸 Please send your payment receipt as a **photo (screenshot)** or **file/PDF**.'
        : '📸 እባክዎ የክፍያ ደረሰኝዎን በ **ፎቶ (ስክሪንሾት)** ወይም በ **ሰነድ/PDF** ይላኩ።',
      { parse_mode: 'Markdown' }
    );
  }

  // Admin interactive stock adding flow
  if (ctx.from.id === config.adminId && session.addingStockFlow) {
    const handled = await adminHandlers.handleStockInput(ctx);
    if (handled) return;
  }
});

// ─── Error Handler ────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err.message);
  if (ctx.reply) {
    ctx.reply('⚠️ ጊዜያዊ ስህተት ተፈጥሯል። እባክዎ ዳግም ይሞክሩ።').catch(() => {});
  }
});

// Prevent unexpected crashes from killing the bot process
process.on('unhandledRejection', (reason, promise) => {
  const errMsg = reason?.message || String(reason);
  console.error('⚠️ Unhandled Rejection:', errMsg);
  // If 409 conflict happens (e.g. Render deploy overlap or duplicate instance), restart container
  if (errMsg.includes('409') || errMsg.includes('Conflict')) {
    console.error('🔴 409 Conflict detected! Another instance was polling. Restarting process for clean recovery in 3s...');
    setTimeout(() => process.exit(1), 3000);
  }
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err?.message || err);
});

// ─── Start Bot + Web Server ───────────────────────────────
async function main() {
  // Connect to MongoDB
  await connectDB();

  // Initialize dynamic settings (product price, etc.)
  const settingsService = require('./services/settingsService');
  await settingsService.init();

  // Start Express server for Render health checks
  const app = express();
  app.get('/', (req, res) => res.send('🤖 Gemini Pro Shop Bot is running!'));
  app.get('/health', async (req, res) => {
    try {
      const me = await bot.telegram.getMe();
      const mongoose = require('mongoose');
      const dbConnected = mongoose.connection.readyState === 1;
      res.json({
        status: dbConnected ? 'ok' : 'degraded',
        bot: me.username,
        database: dbConnected ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime()),
        timestamp: new Date(),
      });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message, timestamp: new Date() });
    }
  });
  app.listen(config.port, () => {
    console.log(`🌐 Web server running on port ${config.port}`);
  });

  // Keep-alive self-pinger for Render Free Tier (pings every 8 minutes to prevent 15-min spin-down)
  const serviceUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVICE_URL;
  if (serviceUrl) {
    console.log(`⏱️ Keep-alive self-pinger active for: ${serviceUrl}`);
    setInterval(async () => {
      try {
        const axios = require('axios');
        await axios.get(`${serviceUrl}/health`, { timeout: 15000 });
        console.log(`💓 Keep-alive ping sent to ${serviceUrl}/health`);
      } catch (err) {
        console.error('Keep-alive ping notice:', err.message);
      }
    }, 8 * 60 * 1000); // Every 8 minutes
  }

  // Initialize clean, language-specific Telegram Menu commands
  const { initGlobalMenuCommands } = require('./utils/menuCommands');
  await initGlobalMenuCommands(bot.telegram);

  // Start automatic 5-minute stock reservation & expiry monitor
  const reservationService = require('./services/reservationService');
  reservationService.startExpiryJob(bot);

  // Delete any old webhook and drop pending stale updates to ensure clean polling
  await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {});

  // Launch bot with long polling
  const me = await bot.telegram.getMe();
  console.log(`🤖 Gemini Pro Shop Bot started! (@${me.username})`);
  console.log(`👤 Admin ID: ${config.adminId}`);
  console.log(`💰 Product: ${config.productName} — ${config.productPrice} ETB`);

  bot.launch({ dropPendingUpdates: true }).catch((err) => {
    console.error('Fatal bot launch error:', err.message);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
