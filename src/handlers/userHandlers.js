// src/handlers/userHandlers.js - Multilingual User Commands and Callbacks
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const keyboards = require('../utils/keyboard');
const msg = require('../utils/messages');

// ─── Get or save user and return user record ────────────────
async function getOrSaveUser(from) {
  let user = await User.findOne({ telegramId: from.id });
  if (!user) {
    user = await User.create({
      telegramId: from.id,
      username: from.username || null,
      firstName: from.first_name || '',
      lastName: from.last_name || '',
      language: null, // Prompt for language on first start
    });
  } else {
    // Keep username/name fresh
    if (user.username !== (from.username || null) || user.firstName !== (from.first_name || '')) {
      user.username = from.username || null;
      user.firstName = from.first_name || '';
      user.lastName = from.last_name || '';
      await user.save();
    }
  }
  return user;
}

// ─── Helper to get user's language ─────────────────────────
async function getUserLang(telegramId) {
  const user = await User.findOne({ telegramId });
  return user && user.language ? user.language : 'am';
}

// ─── /start Command ─────────────────────────────────────────
async function handleStart(ctx) {
  const user = await getOrSaveUser(ctx.from);
  const isAdmin = ctx.from && ctx.from.id === config.adminId;

  // 1. If user hasn't chosen language yet, prompt with welcome photo & language keyboard!
  if (!user.language) {
    const welcomePhotoPath = path.join(__dirname, '../../assets/gemini_welcome.png');
    if (fs.existsSync(welcomePhotoPath)) {
      try {
        return await ctx.replyWithPhoto(
          { source: welcomePhotoPath },
          {
            caption: msg.chooseLanguage(),
            parse_mode: 'HTML',
            ...keyboards.languageSelection(),
          }
        );
      } catch (err) {
        console.error('Failed to send welcome photo:', err.message);
      }
    }

    return ctx.reply(msg.chooseLanguage(), {
      parse_mode: 'HTML',
      ...keyboards.languageSelection(),
    });
  }

  const lang = user.language;

  // 2. If Admin, show dedicated Admin Control Panel
  if (isAdmin) {
    const adminName = ctx.from.first_name || 'Admin';
    return ctx.reply(msg.adminWelcome(adminName, lang), {
      parse_mode: 'HTML',
      ...keyboards.adminMainMenu(lang),
    });
  }

  // Fetch live available stock count
  const reservationService = require('../services/reservationService');
  const stockCount = await reservationService.getAvailableStockCount();

  // 3. Customer Welcome & Main Menu in their chosen language
  await ctx.reply(msg.welcome(ctx.from.first_name, lang), {
    parse_mode: 'HTML',
    ...keyboards.mainMenu(lang, false, stockCount),
  });
}

// ─── /language Command & Callback ──────────────────────────
async function handleLanguage(ctx) {
  await getOrSaveUser(ctx.from);
  const welcomePhotoPath = path.join(__dirname, '../../assets/gemini_welcome.png');
  if (fs.existsSync(welcomePhotoPath)) {
    try {
      return await ctx.replyWithPhoto(
        { source: welcomePhotoPath },
        {
          caption: msg.chooseLanguage(),
          parse_mode: 'HTML',
          ...keyboards.languageSelection(),
        }
      );
    } catch (err) {
      console.error('Failed to send language photo:', err.message);
    }
  }

  await ctx.reply(msg.chooseLanguage(), {
    parse_mode: 'HTML',
    ...keyboards.languageSelection(),
  });
}

// ─── Callback: Set Language (am / en) ──────────────────────
async function callbackSetLanguage(ctx, lang) {
  await ctx.answerCbQuery(
    lang === 'en' ? '✅ Language set to English' : '✅ ቋንቋው ወደ አማርኛ ተቀናብሯል'
  );
  await User.updateOne({ telegramId: ctx.from.id }, { language: lang });

  // Clean up inline buttons on welcome photo so it stays clean
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});

  // Dynamically update this user's blue [Menu] button to their chosen language!
  const { updateUserMenuCommands } = require('../utils/menuCommands');
  await updateUserMenuCommands(ctx.telegram, ctx.from.id, lang);

  // Directly show main menu in chosen language
  return handleStart(ctx);
}

// ─── /contact Command ──────────────────────────────────────
async function handleContact(ctx) {
  const user = await getOrSaveUser(ctx.from);
  if (!user.language) {
    return ctx.reply(msg.chooseLanguage(), {
      parse_mode: 'HTML',
      ...keyboards.languageSelection(),
    });
  }
  await ctx.reply(msg.contact(user.language), {
    parse_mode: 'Markdown',
    ...keyboards.contactSupport(user.language),
  });
}

// ─── /buy Command ──────────────────────────────────────────
async function handleBuy(ctx) {
  const user = await getOrSaveUser(ctx.from);
  if (!user.language) {
    return ctx.reply(msg.chooseLanguage(), {
      parse_mode: 'HTML',
      ...keyboards.languageSelection(),
    });
  }
  const lang = user.language;

  // Check if store is accepting orders (Admin stock pause toggle)
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    return ctx.reply(msg.noStock(lang), {
      parse_mode: 'HTML',
      ...keyboards.backToMain(lang),
    });
  }

  // Check live available stock
  const reservationService = require('../services/reservationService');
  const available = await reservationService.getAvailableStockCount();

  const productPhotoPath = path.join(__dirname, '../../assets/gemini_product.png');
  if (fs.existsSync(productPhotoPath)) {
    try {
      return await ctx.replyWithPhoto(
        { source: productPhotoPath },
        {
          caption: msg.productDetails(available, lang),
          parse_mode: 'HTML',
          ...keyboards.quantitySelection(available, lang),
        }
      );
    } catch (err) {
      console.error('Failed to send product photo:', err.message);
    }
  }

  await ctx.reply(msg.productDetails(available, lang), {
    parse_mode: 'HTML',
    ...keyboards.quantitySelection(available, lang),
  });
}

// ─── /myorders Command ─────────────────────────────────────
async function handleMyOrders(ctx) {
  const user = await getOrSaveUser(ctx.from);
  if (!user.language) {
    return ctx.reply(msg.chooseLanguage(), {
      parse_mode: 'HTML',
      ...keyboards.languageSelection(),
    });
  }
  const lang = user.language;
  const orders = await Order.find({ userId: ctx.from.id }).sort({ createdAt: -1 }).limit(10);
  await ctx.reply(msg.myOrders(orders, lang), {
    parse_mode: 'Markdown',
    ...keyboards.backToMain(lang),
  });
}

// ─── /help Command ─────────────────────────────────────────
async function handleHelp(ctx) {
  const user = await getOrSaveUser(ctx.from);
  if (!user.language) {
    return ctx.reply(msg.chooseLanguage(), {
      parse_mode: 'HTML',
      ...keyboards.languageSelection(),
    });
  }
  const lang = user.language;
  const reservationService = require('../services/reservationService');
  const stockCount = await reservationService.getAvailableStockCount();
  await ctx.reply(msg.help(lang), {
    parse_mode: 'Markdown',
    ...keyboards.mainMenu(lang, false, stockCount),
  });
}

// ─── Callback: "buy" button ────────────────────────────────
async function callbackBuy(ctx) {
  await ctx.answerCbQuery();
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    const lang = await getUserLang(ctx.from.id);
    try {
      return await ctx.editMessageCaption(msg.noStock(lang), {
        parse_mode: 'HTML',
        ...keyboards.backToMain(lang),
      });
    } catch {
      try {
        return await ctx.editMessageText(msg.noStock(lang), {
          parse_mode: 'HTML',
          ...keyboards.backToMain(lang),
        });
      } catch {
        return ctx.reply(msg.noStock(lang), {
          parse_mode: 'HTML',
          ...keyboards.backToMain(lang),
        });
      }
    }
  }
  await handleBuy(ctx);
}

// ─── Callback: "refresh_menu" ──────────────────────────────
async function callbackRefreshMenu(ctx) {
  const user = await getOrSaveUser(ctx.from);
  const lang = user && user.language ? user.language : 'am';
  const isAdminUser = ctx.from && ctx.from.id === config.adminId;
  const reservationService = require('../services/reservationService');
  const count = await reservationService.getAvailableStockCount();
  const alertText = lang === 'en'
    ? `🔄 Stock updated: ${count} available`
    : `🔄 ስቶክ ታድሷል፡ ${count} በስቶክ ይገኛል`;
  await ctx.answerCbQuery(alertText);

  try {
    await ctx.editMessageReplyMarkup(keyboards.mainMenu(lang, isAdminUser, count).reply_markup);
  } catch {
    // Message not modified
  }
}

// ─── Callback: "refresh_qty" ───────────────────────────────
async function callbackRefreshQty(ctx) {
  const lang = await getUserLang(ctx.from.id);
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    const alertText = lang === 'en' ? '🔴 Out of stock' : '🔴 ስቶክ አልቋል';
    await ctx.answerCbQuery(alertText).catch(() => {});
    try {
      return await ctx.editMessageCaption(msg.noStock(lang), {
        parse_mode: 'HTML',
        ...keyboards.backToMain(lang),
      });
    } catch {
      return ctx.editMessageText(msg.noStock(lang), {
        parse_mode: 'HTML',
        ...keyboards.backToMain(lang),
      }).catch(() => {});
    }
  }

  const reservationService = require('../services/reservationService');
  const count = await reservationService.getAvailableStockCount();
  const alertText = lang === 'en'
    ? `🔄 Stock updated: ${count} available`
    : `🔄 ስቶክ ታድሷል፡ ${count} በስቶክ ይገኛል`;
  await ctx.answerCbQuery(alertText);

  if (count === 0) {
    try {
      return await ctx.editMessageCaption(msg.noStock(lang), {
        parse_mode: 'HTML',
        ...keyboards.backToMain(lang),
      });
    } catch {
      return ctx.editMessageText(msg.noStock(lang), {
        parse_mode: 'HTML',
        ...keyboards.backToMain(lang),
      }).catch(() => {});
    }
  }

  try {
    await ctx.editMessageCaption(msg.productDetails(count, lang), {
      parse_mode: 'HTML',
      ...keyboards.quantitySelection(count, lang),
    });
  } catch {
    await ctx.editMessageText(msg.productDetails(count, lang), {
      parse_mode: 'HTML',
      ...keyboards.quantitySelection(count, lang),
    }).catch(() => {});
  }
}

// ─── Callback: Select Quantity (qty_1, qty_2, etc.) ────────
async function callbackSelectQty(ctx, qty) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  const lang = await getUserLang(ctx.from.id);
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    return ctx.reply(msg.noStock(lang), {
      parse_mode: 'HTML',
      ...keyboards.backToMain(lang),
    });
  }

  const quantity = Math.max(1, parseInt(qty) || 1);
  const unitPrice = config.productPrice || 250;
  const total = quantity * unitPrice;

  const prompt = lang === 'en'
    ? `💳 *Choose Payment Method:*\n\n` +
      `📦 *Product:* ${config.productName}\n` +
      `🔢 *Quantity:* *${quantity} item(s)*\n` +
      `💵 *Unit Price:* *${unitPrice} ETB*\n` +
      `💰 *Total Amount:* *${quantity} × ${unitPrice} = ${total} ETB*\n\n` +
      `👇 Select payment method below:`
    : `💳 *የክፍያ መንገድ ይምረጡ:*\n\n` +
      `📦 *ምርት:* ${config.productName}\n` +
      `🔢 *የተመረጠው ብዛት:* *${quantity} ሊንክ*\n` +
      `💵 *የነጠላ ዋጋ:* *${unitPrice} ብር*\n` +
      `💰 *ጠቅላላ ክፍያ:* *${quantity} × ${unitPrice} = ${total} ብር*\n\n` +
      `👇 ለመክፈል ከታች አንዱን ይምረጡ:`;

  await ctx.reply(prompt, {
    parse_mode: 'Markdown',
    ...keyboards.paymentMethod(lang, quantity),
  });
}

// ─── Callback: Custom Quantity ("qty_custom") ──────────────
async function callbackCustomQty(ctx) {
  await ctx.answerCbQuery();
  const lang = await getUserLang(ctx.from.id);
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    return ctx.reply(msg.noStock(lang), {
      parse_mode: 'HTML',
      ...keyboards.backToMain(lang),
    });
  }

  const unitPrice = config.productPrice || 250;

  ctx.session = ctx.session || {};
  ctx.session.awaitingCustomQty = true;

  const prompt = lang === 'en'
    ? `✏️ *Enter Custom Quantity*\n\n` +
      `💵 Price per item: *${unitPrice} ETB*\n` +
      `📦 Status: *🟢 In Stock*\n\n` +
      `🔢 *Type the quantity number you want to buy (1 - 50):*\n` +
      `_(Total will be calculated as Quantity × ${unitPrice} ETB)_`
    : `✏️ *የሚፈልጉትን ብዛት ያስገቡ*\n\n` +
      `💵 የአንድ ሊንክ ዋጋ: *${unitPrice} ብር*\n` +
      `📦 ሁኔታ: *🟢 በስቶክ ይገኛል*\n\n` +
      `🔢 *የሚፈልጉትን ብዛት በቁጥር ጽፈው ይላኩ (ከ 1 እስከ 50):*\n` +
      `_(ጠቅላላ ክፍያው በ ${unitPrice} ብር ተባዝቶ ይሰላል)_`;

  await ctx.reply(prompt, {
    parse_mode: 'Markdown',
    ...keyboards.cancelOnly(lang),
  });
}

// ─── Text Handler for Custom Quantity Input ────────────────
async function handleCustomQtyInput(ctx) {
  const session = ctx.session || {};
  if (!session.awaitingCustomQty) return false;

  const lang = await getUserLang(ctx.from.id);
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    session.awaitingCustomQty = false;
    await ctx.reply(msg.noStock(lang), {
      parse_mode: 'HTML',
      ...keyboards.backToMain(lang),
    });
    return true;
  }

  const input = ctx.message.text ? ctx.message.text.trim() : '';
  const qty = parseInt(input);

  if (isNaN(qty) || qty <= 0) {
    const warning = lang === 'en'
      ? '⚠️ Please enter a valid number (e.g. 1, 2, 5):'
      : '⚠️ እባክዎ ትክክለኛ ቁጥር ያስገቡ (ምሳሌ: 1, 2, 5):';
    await ctx.reply(warning);
    return true;
  }

  if (qty > 50) {
    const warning = lang === 'en'
      ? `⚠️ Maximum quantity per order is *50*. Please enter up to 50:`
      : `⚠️ በአንድ ጊዜ ማዘዝ የሚቻለው ከፍተኛው ብዛት *50* ነው። እባክዎ እስከ 50 የሆነ ቁጥር ያስገቡ:`;
    await ctx.reply(warning, { parse_mode: 'Markdown' });
    return true;
  }

  session.awaitingCustomQty = false;
  await callbackSelectQty(ctx, qty);
  return true;
}

// ─── Callback: "proceed_payment" ───────────────────────────
async function callbackProceedPayment(ctx) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  return callbackSelectQty(ctx, 1);
}

// ─── Callback: "pay_cbe" / "pay_telebirr" with quantity ───
async function callbackPaymentMethod(ctx, method, quantity = 1) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  const lang = await getUserLang(ctx.from.id);
  const settingsService = require('../services/settingsService');
  if (!settingsService.getIsAcceptingOrders()) {
    return ctx.reply(msg.noStock(lang), {
      parse_mode: 'HTML',
      ...keyboards.backToMain(lang),
    });
  }

  const qty = Math.max(1, parseInt(quantity) || 1);

  // Attempt to reserve stock if available in DB (supports on-demand when 0)
  const reservationService = require('../services/reservationService');
  const stocks = await reservationService.reserveStock(ctx.from.id, method, qty).catch(() => null);
  const stockIds = stocks && stocks.length > 0 ? stocks.map((s) => s._id) : [];

  const totalAmount = qty * (config.productPrice || 250);

  // Store pending info in session
  ctx.session = ctx.session || {};
  ctx.session.pendingOrder = {
    stockIds,
    stockId: stockIds[0] || null,
    quantity: qty,
    totalAmount,
    method,
    reservedAt: Date.now(),
  };

  await ctx.reply(msg.paymentInstructions(method, lang, qty, totalAmount), {
    parse_mode: 'HTML',
    ...keyboards.paymentDetails(method, lang),
  });

  const photoPrompt = lang === 'en'
    ? '📸 <b>Send the transaction receipt screenshot below:</b>'
    : '📸 <b>የደረሰኙን Screenshot ፎቶ እዚህ ይላኩ:</b>';

  await ctx.reply(photoPrompt, { parse_mode: 'HTML' });
}

// ─── Receipt Handler: Receive Photo or Document/PDF Receipt ─────
async function handleReceipt(ctx) {
  const lang = await getUserLang(ctx.from.id);
  const session = ctx.session || {};

  if (!session.pendingOrder) {
    const warning = lang === 'en'
      ? '⚠️ *To send a receipt, please first:*\n1. Tap /buy to start an order\n2. Select quantity and payment method (CBE or Telebirr)\n3. Then send your receipt photo or document.'
      : '⚠️ *ደረሰኝ ለመላክ እባክዎ መጀመሪያ:*\n1. /buy ብለው ይዘዙ\n2. ብዛት እና የክፍያ መንገድ ይምረጡ (CBE ወይም Telebirr)\n3. ከዚያ ደረሰኙን (ስክሪንሾት ወይም ሰነድ) እዚህ ይላኩ።';

    return ctx.reply(warning, { parse_mode: 'Markdown' });
  }

  const { stockIds, stockId, quantity, totalAmount, method } = session.pendingOrder;
  const from = ctx.from;
  const targetStockIds = stockIds || (stockId ? [stockId] : []);

  // Verify reserved stocks if items were pre-reserved from DB
  if (targetStockIds.length > 0) {
    const reservedCount = await Stock.countDocuments({
      _id: { $in: targetStockIds },
      isSold: false,
      isReserved: true,
      reservedBy: from.id,
    });

    const now = Date.now();
    const isExpired =
      reservedCount !== targetStockIds.length ||
      (session.pendingOrder.reservedAt && now - session.pendingOrder.reservedAt > 15 * 60 * 1000);

    if (isExpired) {
      ctx.session.pendingOrder = null;
      const reservationService = require('../services/reservationService');
      const stockCount = await reservationService.getAvailableStockCount();
      const expiredWarning =
        lang === 'en'
          ? '⚠️ *Payment time limit has expired!*\nThe reserved item(s) were released. Please tap /buy to start a new order.'
          : '⚠️ *የትዕዛዝዎ ጊዜ አልፏል!*\nየተያዘው ስቶክ ተለቋል። እባክዎ አዲስ ትዕዛዝ ለመጀመር /buy ብለው እንደገና ይዘዙ።';

      return ctx.reply(expiredWarning, {
        parse_mode: 'Markdown',
        ...keyboards.mainMenu(lang, false, stockCount),
      });
    }
  }

  // Extract file details (Supports both Photo and Document/PDF/File formats)
  let fileId = null;
  let isDocument = false;
  let fileExt = 'jpg';

  if (ctx.message.photo && ctx.message.photo.length > 0) {
    const photo = ctx.message.photo;
    fileId = photo[photo.length - 1].file_id;
    isDocument = false;
    fileExt = 'jpg';
  } else if (ctx.message.document) {
    const doc = ctx.message.document;
    fileId = doc.file_id;
    isDocument = true;
    if (doc.file_name && doc.file_name.includes('.')) {
      fileExt = doc.file_name.split('.').pop().toLowerCase();
    } else if (doc.mime_type === 'application/pdf') {
      fileExt = 'pdf';
    } else if (doc.mime_type && doc.mime_type.startsWith('image/')) {
      fileExt = doc.mime_type.split('/')[1] || 'jpg';
    }
  }

  if (!fileId) {
    const warning = lang === 'en'
      ? '⚠️ Please send your payment receipt as a photo, image file, or PDF document.'
      : '⚠️ እባክዎ የክፍያ ደረሰኝዎን በፎቶ (ስክሪንሾት)፣ በምስል ወይም በ PDF ሰነድ መልክ ይላኩ።';
    return ctx.reply(warning);
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.ensureDir(uploadsDir).catch(() => {});
  const filePath = path.join(uploadsDir, `${Date.now()}_${from.id}.${fileExt}`);

  // Optional background image/document download with strict 7s timeout
  (async () => {
    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const axios = require('axios');
      const resp = await axios({
        url: fileLink.href,
        responseType: 'stream',
        timeout: 7000,
      });
      const writer = fs.createWriteStream(filePath);
      resp.data.pipe(writer);
    } catch {
      // Telegram cloud preserves fileId permanently, local backup failure is non-fatal
    }
  })();

  const finalQty = quantity || targetStockIds.length || 1;
  const finalAmount = totalAmount || (finalQty * (config.productPrice || 250));

  // Create order (with retry protection against any duplicate key race conditions)
  let order;
  let orderId;
  for (let attempt = 0; attempt < 5; attempt++) {
    orderId = await Order.generateOrderId();
    try {
      order = await Order.create({
        orderId,
        userId: from.id,
        userInfo: {
          username: from.username || null,
          firstName: from.first_name || '',
          lastName: from.last_name || '',
        },
        stockId: targetStockIds[0],
        stockIds: targetStockIds,
        quantity: finalQty,
        amount: finalAmount,
        paymentMethod: method,
        receiptFileId: fileId,
        receiptPath: filePath,
        status: 'pending',
      });
      break;
    } catch (err) {
      if (err.code === 11000 && attempt < 4) {
        continue;
      }
      throw err;
    }
  }

  // Link all stocks to order
  await Stock.updateMany({ _id: { $in: targetStockIds } }, { orderId: order._id });

  await User.updateOne({ telegramId: from.id }, { $inc: { totalOrders: 1 } });

  // Notify customer in their language with animated shifting scanner and clockwise spinning animation
  try {
    const isEn = lang === 'en';
    const clocks = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    const dots = ['', '.', '..', '...'];
    const scannerBars = [
      '[ ▰▰▱▱▱▱▱▱ ]',
      '[ ▱▰▰▱▱▱▱▱ ]',
      '[ ▱▱▰▰▱▱▱▱ ]',
      '[ ▱▱▱▰▰▱▱▱ ]',
      '[ ▱▱▱▱▰▰▱▱ ]',
      '[ ▱▱▱▱▱▰▰▱ ]',
      '[ ▱▱▱▱▱▱▰▰ ]',
      '[ ▱▱▱▱▱▰▰▱ ]',
      '[ ▱▱▱▱▰▰▱▱ ]',
      '[ ▱▱▱▰▰▱▱▱ ]',
      '[ ▱▱▰▰▱▱▱▱ ]',
      '[ ▱▰▰▱▱▱▱▱ ]',
    ];

    const initialLabel = isEn ? '🕐 Verifying Payment...' : '🕐 ክፍያዎ በማረጋገጥ ላይ ነው...';
    const sentCustomerMsg = await ctx.reply(
      msg.receiptReceived(orderId, lang, scannerBars[0], clocks[0]),
      {
        parse_mode: 'HTML',
        ...keyboards.pendingVerification(orderId, lang, initialLabel),
      }
    );

    // Live continuous animation: moving bold box inside scanner + clockwise rotating emoji
    (async () => {
      try {
        let tick = 0;
        const maxTicks = 300; // ~6 minutes of live continuous animation

        while (tick < maxTicks) {
          await new Promise((r) => setTimeout(r, 1200)); // Smooth 1.2s interval
          tick++;

          // Periodically trigger Telegram native animated indicator in chat header
          if (tick % 4 === 1) {
            ctx.sendChatAction('typing').catch(() => {});
          }

          // Periodically check DB (every 2.4s) to detect approval or rejection
          if (tick % 2 === 0) {
            const orderCheck = await Order.findOne({ orderId }).select('status').lean();
            if (!orderCheck || orderCheck.status !== 'pending') {
              break; // Order was approved or rejected! Stop animating immediately
            }
          }

          const currentClock = clocks[tick % clocks.length];
          const currentBar = scannerBars[tick % scannerBars.length];
          const currentDot = dots[tick % dots.length];
          const currentLabel = isEn
            ? `${currentClock} Verifying Payment ${currentDot}`.trim()
            : `${currentClock} ክፍያዎ በማረጋገጥ ላይ ነው ${currentDot}`.trim();

          const newKb = keyboards.pendingVerification(orderId, lang, currentLabel);
          const updatedText = msg.receiptReceived(orderId, lang, currentBar, currentClock);

          try {
            await ctx.telegram.editMessageText(
              from.id,
              sentCustomerMsg.message_id,
              null,
              updatedText,
              {
                parse_mode: 'HTML',
                ...newKb,
              }
            );
          } catch (editErr) {
            if (editErr.response?.parameters?.retry_after) {
              await new Promise((r) => setTimeout(r, (editErr.response.parameters.retry_after + 1) * 1000));
            } else if (
              editErr.description &&
              (editErr.description.includes('message to edit not found') ||
                editErr.description.includes('chat not found'))
            ) {
              break;
            }
          }
        }
      } catch (loopErr) {
        console.error('Receipt verification animation error:', loopErr.message);
      }
    })();
  } catch (err) {
    console.error('Failed to send HTML receipt message:', err.message);
    await ctx.reply(
      `⏳ ክፍያዎ በማረጋገጥ ላይ ነው... (የትዕዛዝ ቁጥር: ${orderId})\nአስተዳዳሪው እንዳረጋገጠ የሊንኩ መረጃ ወዲያውኑ እዚህ ይላክልዎታል!`,
      { ...keyboards.pendingVerification(orderId, lang) }
    );
  }

  ctx.session.pendingOrder = null;

  // Notify admin with photo or document accordingly
  try {
    if (isDocument) {
      await ctx.telegram.sendDocument(config.adminId, fileId, {
        caption: msg.adminNewOrder(order, { username: from.username, firstName: from.first_name, lastName: from.last_name }),
        parse_mode: 'HTML',
        ...keyboards.adminApproval(orderId),
      });
    } else {
      await ctx.telegram.sendPhoto(config.adminId, fileId, {
        caption: msg.adminNewOrder(order, { username: from.username, firstName: from.first_name, lastName: from.last_name }),
        parse_mode: 'HTML',
        ...keyboards.adminApproval(orderId),
      });
    }
    console.log(`✅ Order notification sent to admin (${config.adminId}) for ${orderId}`);
  } catch (err) {
    console.error('Failed to notify admin with HTML:', err.message);
    try {
      const rawFullName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || 'ስም የለም';
      const username = from.username ? `@${from.username}` : 'የለውም';
      const plainCaption =
        `🔔 አዲስ ትዕዛዝ!\n\n` +
        `🔢 ትዕዛዝ: ${order.orderId}\n` +
        `👤 ስም: ${rawFullName}\n` +
        `🔗 ዩዘርኔም: ${username}\n` +
        `🆔 Telegram ID: ${order.userId}\n` +
        `📦 ብዛት: ${order.quantity} ሊንክ\n` +
        `💰 መጠን: ${order.amount} ብር\n` +
        `💳 ክፍያ: ${order.paymentMethod}\n\n` +
        `📄 ደረሰኝ ከላይ ተላኳል\n` +
        `⬇️ ምርጫ ያድርጉ:`;

      if (isDocument) {
        await ctx.telegram.sendDocument(config.adminId, fileId, {
          caption: plainCaption,
          ...keyboards.adminApproval(orderId),
        });
      } else {
        await ctx.telegram.sendPhoto(config.adminId, fileId, {
          caption: plainCaption,
          ...keyboards.adminApproval(orderId),
        });
      }
      console.log(`✅ Fallback order notification sent to admin (${config.adminId}) for ${orderId}`);
    } catch (err2) {
      console.error('Fallback notification to admin also failed:', err2.message);
    }
  }
}

const handlePhotoReceipt = handleReceipt;

// ─── Callback: "cancel" ────────────────────────────────────
async function callbackCancel(ctx) {
  const lang = await getUserLang(ctx.from.id);
  await ctx.answerCbQuery(lang === 'en' ? 'Cancelled' : 'ተሰርዟል');

  const reservationService = require('../services/reservationService');
  await reservationService.releaseReservation(ctx.from.id);

  if (ctx.session) {
    ctx.session.pendingOrder = null;
    ctx.session.awaitingCustomQty = false;
  }

  const stockCount = await reservationService.getAvailableStockCount();
  const cancelMsg = lang === 'en' ? '✅ Order cancelled.' : '✅ ትዕዛዙ ተሰርዟል።';
  await ctx.reply(cancelMsg, { ...keyboards.mainMenu(lang, false, stockCount) });
}

// ─── Callback: "main_menu" ─────────────────────────────────
async function callbackMainMenu(ctx) {
  await ctx.answerCbQuery();
  return handleStart(ctx);
}

// ─── Callback: "my_orders" ─────────────────────────────────
async function callbackMyOrders(ctx) {
  await ctx.answerCbQuery();
  await handleMyOrders(ctx);
}

// ─── Callback: "help" ──────────────────────────────────────
async function callbackHelp(ctx) {
  await ctx.answerCbQuery();
  await handleHelp(ctx);
}

// ─── Callback: "contact" ───────────────────────────────────
async function callbackContact(ctx) {
  await ctx.answerCbQuery();
  await handleContact(ctx);
}

module.exports = {
  getOrSaveUser,
  getUserLang,
  handleStart,
  handleLanguage,
  callbackSetLanguage,
  handleBuy,
  handleMyOrders,
  handleHelp,
  handleContact,
  handleReceipt,
  handlePhotoReceipt,
  handleCustomQtyInput,
  callbackBuy,
  callbackRefreshMenu,
  callbackRefreshQty,
  callbackSelectQty,
  callbackCustomQty,
  callbackProceedPayment,
  callbackPaymentMethod,
  callbackCancel,
  callbackMainMenu,
  callbackMyOrders,
  callbackHelp,
  callbackContact,
};
