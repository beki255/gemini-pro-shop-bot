const { Markup } = require('telegraf');
const config = require('../config');

/**
 * Safely sanitizes button text to guarantee 100% valid UTF-8:
 * - Prevents surrogate pair splitting (which causes Telegram 400 Bad Request)
 * - Removes any lone or orphaned surrogates (\uD800 - \uDFFF)
 * - Removes non-printable / control codes
 * - Slices by full Unicode code points
 */
function sanitizeButtonText(text, maxLength = 60) {
  if (!text) return '';
  let str = String(text);
  if (typeof str.toWellFormed === 'function') {
    str = str.toWellFormed();
  }
  str = str.replace(/[\uD800-\uDFFF]/g, '');
  str = str.replace(/[\x00-\x1F\x7F]/g, '');
  const codePoints = Array.from(str);
  if (codePoints.length > maxLength) {
    str = codePoints.slice(0, maxLength).join('');
  }
  return str.trim();
}

const keyboards = {
  // ─── MANDATORY CHANNEL SUBSCRIPTION KEYBOARD ─────────────────
  forceJoinChannel(channelLink, lang = 'am') {
    const isEn = lang === 'en';
    const link = channelLink || 'https://t.me/gemini_pro_shop_proof';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '📢 Join Channel' : '📢 ቻናሉን ተቀላቀል',
          url: link,
        },
      ],
      [
        {
          text: isEn ? '✅ I Have Joined (Verify)' : '✅ ተቀላቅያለሁ (አረጋግጥ)',
          callback_data: 'verify_channel_joined',
          style: 'success',
        },
      ],
    ]);
  },

  // ─── LANGUAGE SELECTION KEYBOARD (Primary Blue) ─────────────
  languageSelection() {
    return Markup.inlineKeyboard([
      [
        { text: '🇪🇹 አማርኛ', callback_data: 'set_lang_am', style: 'primary' },
        { text: '🇬🇧 English', callback_data: 'set_lang_en', style: 'primary' },
      ],
    ]);
  },

  // ─── CUSTOMER MAIN INLINE MENU (Mobile-optimized, never truncated)
  mainMenu(lang = 'am', isAdmin = false, stockCount = null) {
    const isEn = lang === 'en';
    const price = config.productPrice || 250;
    const usdt = config.calculateUsdtPrice(price);

    const buttons = [
      // Product Name & Price (Full-width headline button)
      [
        {
          text: isEn
            ? `💎 Gemini Pro 18M · ${price} ETB (${usdt} USDT)`
            : `💎 Gemini Pro 18 ወራት · ${price} ብር (${usdt} USDT)`,
          callback_data: 'buy',
          style: 'primary',
        },
      ],
      // Full-width Buy Now button
      [
        {
          text: isEn ? '🛍️ Buy Now' : '🛍️ አሁን ግዛ',
          callback_data: 'buy',
          style: 'success',
        },
      ],
      // Navigation: My Orders & Refresh
      [
        {
          text: isEn ? '📦 My Orders' : '📦 የኔ ትዕዛዞች',
          callback_data: 'my_orders',
          style: 'primary',
        },
        {
          text: isEn ? '🔄 Refresh' : '🔄 አድስ',
          callback_data: 'refresh_menu',
          style: 'primary',
        },
      ],
      // Language & Support
      [
        {
          text: isEn ? '🌐 Language' : '🌐 ቋንቋ / Language',
          callback_data: 'change_language',
          style: 'primary',
        },
        {
          text: isEn ? '💬 Support' : '💬 እርዳታ እና ድጋፍ',
          callback_data: 'contact',
          style: 'primary',
        },
      ],
    ];

    if (isAdmin) {
      buttons.unshift([
        {
          text: isEn ? '🛠️ Admin Panel' : '🛠️ የአድሚን ፓነል',
          callback_data: 'admin_panel',
          style: 'primary',
        },
      ]);
    }

    return Markup.inlineKeyboard(buttons);
  },

  // ─── QUANTITY SELECTION KEYBOARD ───────────────────────────
  quantitySelection(availableCount = 1, lang = 'am') {
    const isEn = lang === 'en';
    const unitPrice = config.productPrice || 250;
    // Always provide 1 to 5 quick selection buttons so on-demand ordering is never blocked
    const maxQuick = 5;
    const quickButtons = [];

    for (let i = 1; i <= maxQuick; i++) {
      quickButtons.push({
        text: `${i}`,
        callback_data: `qty_${i}`,
        style: 'primary',
      });
    }

    const rows = [
      quickButtons,
      [
        {
          text: isEn ? '✏️ Custom Quantity' : '✏️ ሌላ ብዛት አስገባ (Custom)',
          callback_data: 'qty_custom',
          style: 'primary',
        },
      ],
    ];

    rows.push([
      {
        text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
        callback_data: 'cancel',
        style: 'danger',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },

  // ─── PAYMENT METHOD SELECTION (With Multiplication & Total Price)
  paymentMethod(lang = 'am', quantity = 1) {
    const isEn = lang === 'en';
    const unitEtb = config.productPrice || 250;
    const totalEtb = quantity * unitEtb;
    const unitUsdt = config.calculateUsdtPrice(unitEtb);
    const totalUsdt = Number((quantity * unitUsdt).toFixed(2));

    return Markup.inlineKeyboard([
      [
        {
          text: isEn
            ? `🏦 CBE Bank — ${totalEtb} ETB (${quantity} × ${unitEtb} ETB)`
            : `🏦 የኢትዮጵያ ንግድ ባንክ — ${totalEtb} ብር (${quantity} × ${unitEtb} ብር)`,
          callback_data: `pay_cbe_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn
            ? `📱 Telebirr — ${totalEtb} ETB (${quantity} × ${unitEtb} ETB)`
            : `📱 ቴሌብር — ${totalEtb} ብር (${quantity} × ${unitEtb} ብር)`,
          callback_data: `pay_telebirr_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn
            ? `🟡 Binance Pay — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`
            : `🟡 Binance Pay — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`,
          callback_data: `pay_binance_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn
            ? `🖤 Bybit (USDT) — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`
            : `🖤 Bybit (USDT) — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`,
          callback_data: `pay_bybit_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn
            ? `🌐 USDT (BEP-20) — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`
            : `🌐 USDT (BEP-20) — ${totalUsdt} USDT (${quantity} × ${unitUsdt} USDT)`,
          callback_data: `pay_bep20_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '✏️ Change Quantity' : '✏️ ብዛት ቀይር',
          callback_data: 'buy',
          style: 'primary',
        },
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── PAYMENT DETAILS KEYBOARD (Universal Safe Callback) ─────
  paymentDetails(method, lang = 'am') {
    const isEn = lang === 'en';
    const m = (method || '').toLowerCase();
    let copyLabel = '';

    if (m === 'cbe') {
      copyLabel = isEn ? '📋 View / Copy CBE Account' : '📋 የ CBE ቁጥር ይመልከቱ / ይቅዱ';
    } else if (m === 'telebirr') {
      copyLabel = isEn ? '📋 View / Copy Telebirr Number' : '📋 የቴሌብር ስልክ ይመልከቱ / ይቅዱ';
    } else if (m === 'binance') {
      copyLabel = isEn ? '📋 View / Copy Binance ID' : '📋 የ Binance ID ይመልከቱ / ይቅዱ';
    } else if (m === 'bybit') {
      copyLabel = isEn ? '📋 View / Copy Bybit UID' : '📋 የ Bybit UID ይመልከቱ / ይቅዱ';
    } else if (m === 'bep20') {
      copyLabel = isEn ? '📋 View / Copy BEP20 Address' : '📋 የ BEP20 አድራሻ ይመልከቱ / ይቅዱ';
    } else {
      copyLabel = isEn ? '📋 View / Copy Details' : '📋 መረጃውን ይመልከቱ / ይቅዱ';
    }

    return Markup.inlineKeyboard([
      [
        {
          text: copyLabel,
          callback_data: `copy_acc_${m}`,
        },
      ],
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel',
        },
      ],
    ]);
  },

  // ─── QUICK REJECT KEYBOARD FOR ADMIN ────────────────────────
  quickRejectKeyboard(orderId) {
    return Markup.inlineKeyboard([
      [
        {
          text: '❌ ደረሰኝ ትክክል አይደለም',
          callback_data: `reject_quick_${orderId}_invalid`,
        },
      ],
      [
        {
          text: '❌ ብር አልገባም / ያነሰ ነው',
          callback_data: `reject_quick_${orderId}_amount`,
        },
      ],
      [
        {
          text: '❌ ያለ ምክንያት ውድቅ አድርግ',
          callback_data: `reject_quick_${orderId}_skip`,
        },
      ],
      [
        {
          text: '🔙 ተመለስ (ሰርዝ)',
          callback_data: 'cancel_rejection',
        },
      ],
    ]);
  },

  // ─── CONTACT SUPPORT KEYBOARD (Direct Telegram link) ──────
  contactSupport(lang = 'am') {
    const isEn = lang === 'en';
    const username = config.supportUsername || 'Mnbvcnvhd';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? `💬 Message @${username}` : `💬 አድሚኑን በቴሌግራም አግኙ (@${username})`,
          url: `https://t.me/${username}`,
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '🏠 Main Menu' : '🏠 ዋና ማውጫ',
          callback_data: 'main_menu',
          style: 'primary',
        },
      ],
    ]);
  },

  // ─── CANCEL BUTTON ONLY (Danger Red) ───────────────────────
  cancelOnly(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── CANCEL PRICE CHANGE BUTTON ────────────────────────────
  cancelPriceChange(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel_change_price',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── BACK TO MAIN MENU (Primary Blue) ──────────────────────
  backToMain(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '🏠 Main Menu' : '🏠 ዋና ማውጫ',
          callback_data: 'main_menu',
          style: 'primary',
        },
      ],
    ]);
  },

  // ─── USER ORDERS PAGINATION ────────────────────────────────
  userOrdersPagination(page = 1, totalPages = 1, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [];

    // Pagination row if multiple pages
    if (totalPages > 1) {
      const navRow = [];
      if (page > 1) {
        navRow.push({
          text: isEn ? '⬅️ Prev' : '⬅️ ቀዳሚ',
          callback_data: `my_orders_page_${page - 1}`,
        });
      }
      navRow.push({
        text: `📄 ${page}/${totalPages}`,
        callback_data: 'noop',
      });
      if (page < totalPages) {
        navRow.push({
          text: isEn ? 'Next ➡️' : 'ቀጣይ ➡️',
          callback_data: `my_orders_page_${page + 1}`,
        });
      }
      rows.push(navRow);
    }

    // Back to main menu button
    rows.push([
      {
        text: isEn ? '🏠 Main Menu' : '🏠 ዋና ማውጫ',
        callback_data: 'main_menu',
        style: 'primary',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },

  // ─── PENDING VERIFICATION KEYBOARD (Waiting for Admin Approval) ───
  pendingVerification(orderId, lang = 'am', buttonLabel = null) {
    const isEn = lang === 'en';
    const username = config.supportUsername || 'Mnbvcnvhd';
    const label = buttonLabel || (isEn ? '🕐 Verifying Payment...' : '🕐 ክፍያዎ በማረጋገጥ ላይ ነው...');
    return Markup.inlineKeyboard([
      [
        {
          text: label,
          callback_data: `check_pending_${orderId}`,
        },
      ],
      [
        {
          text: isEn ? `💬 Contact Admin (@${username})` : `💬 አድሚኑን አግኝ (@${username})`,
          url: `https://t.me/${username}`,
        },
      ],
    ]);
  },

  // ─── DELIVERED LINKS WITH DIRECT BROWSER OPEN BUTTONS ──────
  deliveredLinksKeyboard(links, lang = 'am') {
    const isEn = lang === 'en';
    const linkArray = Array.isArray(links) ? links : [links];
    const buttons = [];

    linkArray.forEach((lnk, idx) => {
      const label =
        linkArray.length > 1
          ? isEn
            ? `🚀 Open Link ${idx + 1} in Browser`
            : `🚀 ሊንክ ${idx + 1} በ Browser ክፈት`
          : isEn
            ? `🚀 Open Link in Browser (Activate)`
            : `🚀 ሊንኩን በ Browser ክፈት (አግብር)`;
      buttons.push([
        {
          text: label,
          url: lnk,
        },
      ]);
    });

    buttons.push([
      {
        text: isEn ? '🏠 Main Menu' : '🏠 ዋና ማውጫ',
        callback_data: 'main_menu',
        style: 'primary',
      },
    ]);

    return Markup.inlineKeyboard(buttons);
  },

  // ─── ADMIN APPROVAL BUTTONS (Green approve, Red reject) ────
  adminApproval(orderId) {
    return Markup.inlineKeyboard([
      [
        { text: '✅ አጽድቅ (Approve)', callback_data: `approve_${orderId}`, style: 'success' },
        { text: '❌ አትቀበል (Reject)', callback_data: `reject_${orderId}`, style: 'danger' },
      ],
      [
        { text: '🔍 ዝርዝር (Details)', callback_data: `details_${orderId}`, style: 'primary' },
      ],
    ]);
  },

  // ─── ADMIN PANEL (Primary Blue) ────────────────────────────
  adminPanel(lang = 'am') {
    const isEn = lang === 'en';
    const settingsService = require('../services/settingsService');
    const isAcceptingOrders = settingsService.getIsAcceptingOrders();

    const statusBtn = {
      text: isAcceptingOrders
        ? (isEn ? '🟢 Store Status: OPEN (Accepting Orders)' : '🟢 ሱቁ ክፍት ነው (ትዕዛዝ ይቀበላል)')
        : (isEn ? '🔴 Store Status: PAUSED (Out of Stock)' : '🔴 ስቶክ አልቋል (ትዕዛዝ ቆሟል)'),
      callback_data: 'admin_toggle_store_status',
      style: isAcceptingOrders ? 'success' : 'danger',
    };

    return Markup.inlineKeyboard([
      [statusBtn],
      [
        {
          text: isEn ? '📊 Statistics' : '📊 ስታቲስቲክስ',
          callback_data: 'admin_stats',
          style: 'primary',
        },
        {
          text: isEn ? '📦 Stock' : '📦 ስቶክ',
          callback_data: 'admin_stock',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '📋 Orders' : '📋 ትዕዛዞች',
          callback_data: 'admin_orders',
          style: 'primary',
        },
        {
          text: isEn ? '👥 Users' : '👥 ተጠቃሚዎች',
          callback_data: 'admin_users',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '💳 Active Checkouts' : '💳 በክፍያ ላይ ያሉ (Checkouts)',
          callback_data: 'admin_checkouts',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '💰 Change Price' : '💰 ዋጋ ቀይር',
          callback_data: 'admin_change_price',
          style: 'primary',
        },
        {
          text: isEn ? '➕ Add Stock' : '➕ ስቶክ ጨምር',
          callback_data: 'admin_start_add_stock',
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '📢 Broadcast' : '📢 ማስታወቂያ ላክ (Broadcast)',
          callback_data: 'admin_broadcast',
          style: 'primary',
        },
        {
          text: isEn ? '📢 Post to Channel' : '📢 ወደ ቻናል ፖስት አድርግ',
          callback_data: 'admin_channel_post',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '👀 View Store' : '👀 ሱቁን እይ',
          callback_data: 'view_customer_store',
          style: 'primary',
        },
      ],
    ]);
  },

  // ─── ADMIN USERS LIST PAGINATION ───────────────────────────
  adminUsersPagination(page, totalPages, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [];

    if (totalPages > 1) {
      const navRow = [];
      if (page > 1) {
        navRow.push({
          text: isEn ? '⬅️ Prev' : '⬅️ ቀዳሚ',
          callback_data: `admin_users_page_${page - 1}`,
        });
      }
      navRow.push({
        text: `📄 ${page}/${totalPages}`,
        callback_data: 'noop',
      });
      if (page < totalPages) {
        navRow.push({
          text: isEn ? 'Next ➡️' : 'ቀጣይ ➡️',
          callback_data: `admin_users_page_${page + 1}`,
        });
      }
      rows.push(navRow);
    }

    rows.push([
      {
        text: isEn ? '🔄 Refresh' : '🔄 አድስ',
        callback_data: `admin_users_page_${page}`,
      },
      {
        text: isEn ? '🔙 Admin Panel' : '🔙 ወደ ዋና ፓነል',
        callback_data: 'admin_panel',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },

  // ─── ADMIN ORDERS FILTER MENU ───────────────────────────────
  adminOrdersMenu(counts = {}, lang = 'am') {
    const isEn = lang === 'en';
    const pending = counts.pending || 0;
    const approved = counts.approved || 0;
    const rejected = counts.rejected || 0;
    const total = counts.total || 0;

    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? `✅ Approved Orders (${approved})` : `✅ የተፈቀዱ ትዕዛዞች (${approved})`,
          callback_data: 'admin_orders_filter_approved',
        },
      ],
      [
        {
          text: isEn ? `⏳ Pending Orders (${pending})` : `⏳ ያልተፈቀዱ / በጥበቃ ላይ (${pending})`,
          callback_data: 'admin_orders_filter_pending',
        },
      ],
      [
        {
          text: isEn ? `❌ Rejected Orders (${rejected})` : `❌ ውድቅ የተደረጉ (${rejected})`,
          callback_data: 'admin_orders_filter_rejected',
        },
      ],
      [
        {
          text: isEn ? `📋 All Orders (${total})` : `📋 ሁሉም ትዕዛዞች (${total})`,
          callback_data: 'admin_orders_filter_all',
        },
      ],
      [
        {
          text: isEn ? '🔙 Back to Admin Panel' : '🔙 ወደ ዋና ፓነል',
          callback_data: 'admin_panel',
        },
      ],
    ]);
  },

  // ─── ADMIN ORDERS LIST PAGINATION & FILTER SWITCH ───────────
  adminOrdersPagination(currentFilter = 'all', page = 1, totalPages = 1, lang = 'am', orders = []) {
    const isEn = lang === 'en';
    const rows = [];

    // Receipt buttons for orders on this page (each with customer name clearly visible)
    if (orders && orders.length > 0) {
      orders.forEach((o, index) => {
        const itemNumber = (page - 1) * 5 + index + 1;
        const name = o.customerName || o.userInfo?.firstName || '';
        const safeName = sanitizeButtonText(name, 14);
        const namePart = safeName ? `የ ${safeName}` : '';
        const btnText = sanitizeButtonText(
          isEn
            ? `👁️ #${itemNumber} ${safeName ? `${safeName}'s Receipt` : 'Receipt'} (${o.orderId})`
            : `👁️ #${itemNumber} ${namePart ? `${namePart} ደረሰኝ` : 'ደረሰኝ'} (${o.orderId})`,
          60
        );

        rows.push([
          {
            text: btnText,
            callback_data: `admin_view_receipt_${o.orderId}_${currentFilter}_${page}`,
            style: 'primary',
          },
        ]);
      });
    }

    // Pagination row if multiple pages
    if (totalPages > 1) {
      const navRow = [];
      if (page > 1) {
        navRow.push({
          text: isEn ? '⬅️ Prev' : '⬅️ ቀዳሚ',
          callback_data: `admin_orders_page_${currentFilter}_${page - 1}`,
        });
      }
      navRow.push({
        text: `📄 ${page}/${totalPages}`,
        callback_data: 'noop',
      });
      if (page < totalPages) {
        navRow.push({
          text: isEn ? 'Next ➡️' : 'ቀጣይ ➡️',
          callback_data: `admin_orders_page_${currentFilter}_${page + 1}`,
        });
      }
      rows.push(navRow);
    }

    // Quick filter switch row
    rows.push([
      {
        text: currentFilter === 'approved' ? '🔘 ✅ የተፈቀዱ' : '✅ የተፈቀዱ',
        callback_data: 'admin_orders_filter_approved',
      },
      {
        text: currentFilter === 'pending' ? '🔘 ⏳ ያልተፈቀዱ' : '⏳ ያልተፈቀዱ',
        callback_data: 'admin_orders_filter_pending',
      },
    ]);
    rows.push([
      {
        text: currentFilter === 'rejected' ? '🔘 ❌ ውድቅ' : '❌ ውድቅ',
        callback_data: 'admin_orders_filter_rejected',
      },
      {
        text: currentFilter === 'all' ? '🔘 📋 ሁሉም' : '📋 ሁሉም',
        callback_data: 'admin_orders_filter_all',
      },
    ]);

    // Back to orders menu and admin panel
    rows.push([
      {
        text: isEn ? '🔄 Refresh' : '🔄 አድስ',
        callback_data: `admin_orders_page_${currentFilter}_${page}`,
      },
      {
        text: isEn ? '🔙 Orders Menu' : '🔙 የትዕዛዝ ማውጫ',
        callback_data: 'admin_orders',
      },
    ]);
    rows.push([
      {
        text: isEn ? '🏠 Admin Panel' : '🏠 ዋና ፓነል',
        callback_data: 'admin_panel',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },

  // ─── ADMIN ORDER RECEIPT VIEW KEYBOARD ─────────────────────
  adminOrderReceiptView(order, returnFilter = 'all', returnPage = 1, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [];

    if (order.status === 'pending') {
      rows.push([
        {
          text: isEn ? '✅ Approve Order' : '✅ አጽድቅ (Approve)',
          callback_data: `approve_${order.orderId}`,
          style: 'success',
        },
        {
          text: isEn ? '❌ Reject Order' : '❌ አትቀበል (Reject)',
          callback_data: `reject_${order.orderId}`,
          style: 'danger',
        },
      ]);
    } else if (order.status === 'approved') {
      rows.push([
        {
          text: isEn ? '🔄 Resend Links to Buyer' : '🔄 ሊንኮቹን ዳግም ላክ',
          callback_data: `resend_link_${order.orderId}`,
          style: 'primary',
        },
      ]);
    }

    rows.push([
      {
        text: isEn ? '🔙 Back to Orders' : '🔙 ወደ ትዕዛዞች ዝርዝር',
        callback_data: `admin_orders_page_${returnFilter}_${returnPage}`,
        style: 'primary',
      },
      {
        text: isEn ? '🏠 Admin Panel' : '🏠 ዋና ፓነል',
        callback_data: 'admin_panel',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },

  // ─── ADMIN STORE PREVIEW KEYBOARD (No customer buttons) ─────
  adminStorePreview(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '💰 Change Price' : '💰 ዋጋ ቀይር',
          callback_data: 'admin_change_price',
          style: 'primary',
        },
        {
          text: isEn ? '➕ Add Stock' : '➕ ስቶክ ጨምር',
          callback_data: 'admin_start_add_stock',
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '🔄 Refresh' : '🔄 አድስ',
          callback_data: 'admin_refresh_store_view',
          style: 'primary',
        },
        {
          text: isEn ? '🛠️ Admin Panel' : '🛠️ ወደ አድሚን ፓነል ተመለስ',
          callback_data: 'admin_panel',
          style: 'primary',
        },
      ],
    ]);
  },

  // ─── STOCK INPUT FLOW KEYBOARD ─────────────────────────────
  stockInputKeyboard(count = 0, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [];
    if (count > 0) {
      rows.push([
        {
          text: isEn ? `✅ Save & Finish (${count})` : `✅ አስቀምጥ እና ጨርስ (${count} ሊንክ)`,
          callback_data: 'finish_add_stock',
          style: 'success',
        },
      ]);
    }
    rows.push([
      {
        text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
        callback_data: 'cancel_add_stock',
        style: 'danger',
      },
    ]);
    return Markup.inlineKeyboard(rows);
  },

  // ─── CANCEL DIRECT DELIVERY INPUT ──────────────────────────
  cancelDirectDelivery(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '❌ Cancel Delivery' : '❌ አጽድቆ መላኩን ሰርዝ (Cancel)',
          callback_data: 'cancel_direct_delivery',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── DIRECT DELIVERY REVIEW KEYBOARD (Send to customer button) ──
  directDeliveryReview(orderId, count = 1, lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn
            ? `🚀 Finished - Send to Customer (${count} link${count > 1 ? 's' : ''})`
            : `🚀 ጨርሻለሁ - ለደንበኛው ላክ (${count} ሊንክ)`,
          callback_data: `deliver_direct_${orderId}`,
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '❌ Cancel Delivery' : '❌ አጽድቆ መላኩን ሰርዝ (Cancel)',
          callback_data: 'cancel_direct_delivery',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── PENDING ORDER PROMPT (After adding stock to DB) ────────
  pendingOrderPrompt(orderId, pendingCount = 1, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [
      [
        {
          text: isEn ? `✅ Approve Order ${orderId}` : `✅ ትዕዛዝ ${orderId} አጽድቅ`,
          callback_data: `approve_${orderId}`,
          style: 'success',
        },
      ],
    ];
    if (pendingCount > 1) {
      rows.push([
        {
          text: isEn ? `📋 View All Orders (${pendingCount})` : `📋 ሁሉንም ትዕዛዞች እይ (${pendingCount})`,
          callback_data: 'admin_orders',
          style: 'primary',
        },
      ]);
    }
    rows.push([
      {
        text: isEn ? '🛠️ Admin Panel' : '🛠️ ወደ አድሚን ፓነል ተመለስ',
        callback_data: 'admin_panel',
        style: 'primary',
      },
    ]);
    return Markup.inlineKeyboard(rows);
  },

  // ─── ADMIN MAIN MENU ───────────────────────────────────────
  adminMainMenu(lang = 'am') {
    return this.adminPanel(lang);
  },

  // ─── BROADCAST CONFIRMATION KEYBOARDS ──────────────────────
  broadcastConfirm(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '🚀 Yes, Send to All Users' : '🚀 አዎ፣ ለሁሉም ተጠቃሚዎች ላክ',
          callback_data: 'confirm_broadcast',
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel_broadcast',
          style: 'danger',
        },
      ],
    ]);
  },

  cancelBroadcast(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel_broadcast',
          style: 'danger',
        },
      ],
    ]);
  },

  // ─── CHANNEL POST CONFIRMATION KEYBOARDS ───────────────────
  channelPostConfirm(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '🚀 Yes, Post to Channel' : '🚀 አዎ፣ ወደ ቻናሉ ልጠፍ',
          callback_data: 'confirm_channel_post',
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel_channel_post',
          style: 'danger',
        },
      ],
    ]);
  },

  cancelChannelPost(lang = 'am') {
    const isEn = lang === 'en';
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel_channel_post',
          style: 'danger',
        },
      ],
    ]);
  },

  channelPostBuyButton(botUsername, lang = 'am') {
    const isEn = lang === 'en';
    const username = (botUsername || config.botUsername || 'Mnbvcnvhd').replace(/^@/, '');
    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? '🛍️ Buy Now (Order Here)' : '🛍️ አሁን ግዛ (Buy Now)',
          url: `https://t.me/${username}?start=buy`,
        },
      ],
    ]);
  },

  // ─── ADMIN CHECKOUTS FILTER MENU ───────────────────────────
  adminCheckoutsMenu(counts = {}, lang = 'am') {
    const isEn = lang === 'en';
    const awaiting = counts.awaiting || 0;
    const completed = counts.completed || 0;
    const cancelled = counts.cancelled || 0;
    const total = counts.total || 0;

    return Markup.inlineKeyboard([
      [
        {
          text: isEn ? `⏳ Awaiting Receipt (${awaiting})` : `⏳ ደረሰኝ በመጠበቅ ላይ (${awaiting})`,
          callback_data: 'admin_checkouts_filter_awaiting',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? `✅ Completed / Uploaded (${completed})` : `✅ ደረሰኝ የላኩ / የተጠናቀቁ (${completed})`,
          callback_data: 'admin_checkouts_filter_completed',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? `❌ Cancelled / Expired (${cancelled})` : `❌ የተሰረዙ / ያለፈባቸው (${cancelled})`,
          callback_data: 'admin_checkouts_filter_cancelled',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? `📋 All Checkouts (${total})` : `📋 ሁሉም የክፍያ ሙከራዎች (${total})`,
          callback_data: 'admin_checkouts_filter_all',
          style: 'primary',
        },
      ],
      [
        {
          text: isEn ? '🔙 Back to Admin Panel' : '🔙 ወደ ዋና ፓነል',
          callback_data: 'admin_panel',
          style: 'primary',
        },
      ],
    ]);
  },

  // ─── ADMIN CHECKOUTS PAGINATION WITH DIRECT DM BUTTONS ──────
  adminCheckoutsPagination(currentFilter = 'awaiting', page = 1, totalPages = 1, lang = 'am', attempts = []) {
    const isEn = lang === 'en';
    const rows = [];

    // Quick direct DM & Bot Reminder buttons for customers on this page
    if (attempts && attempts.length > 0) {
      attempts.forEach((att, idx) => {
        const itemNumber = (page - 1) * 5 + idx + 1;
        const name = att.customerName || att.userInfo?.firstName || `User ${att.userId || ''}`;
        const rawUsername = att.userInfo?.username;
        const cleanUsername = rawUsername ? String(rawUsername).replace(/^@+/, '').trim() : '';
        const dmUrl = cleanUsername
          ? `https://t.me/${cleanUsername}`
          : (att.userId ? `tg://user?id=${att.userId}` : null);

        const safeName = sanitizeButtonText(name, 12) || (isEn ? 'Customer' : 'ደንበኛ');
        const safeMethod = sanitizeButtonText(att.paymentMethod || 'CBE', 10);
        const safeAmount = Number(att.amount) || 0;

        // If checkout is still active (awaiting receipt), provide quick bot reminder button!
        if (att.status === 'awaiting_receipt') {
          const remindText = sanitizeButtonText(
            isEn ? `🔔 #${itemNumber} Send Bot Reminder to ${safeName}` : `🔔 #${itemNumber} ለ${safeName} በቦቱ ማሳሰቢያ ላክ`,
            55
          );
          rows.push([
            {
              text: remindText,
              callback_data: `admin_remind_checkout_${att._id}`,
            },
          ]);
        }

        const btnText = sanitizeButtonText(`💬 #${itemNumber} DM ${safeName} (${safeMethod} · ${safeAmount} ETB)`, 55);

        if (dmUrl) {
          rows.push([
            {
              text: btnText,
              url: dmUrl,
            },
          ]);
        } else {
          rows.push([
            {
              text: btnText,
              callback_data: 'noop',
            },
          ]);
        }
      });
    }

    // Pagination row if multiple pages
    if (totalPages > 1) {
      const navRow = [];
      if (page > 1) {
        navRow.push({
          text: isEn ? '⬅️ Prev' : '⬅️ ቀዳሚ',
          callback_data: `admin_checkouts_page_${currentFilter}_${page - 1}`,
        });
      }
      navRow.push({
        text: `📄 ${page}/${totalPages}`,
        callback_data: 'noop',
      });
      if (page < totalPages) {
        navRow.push({
          text: isEn ? 'Next ➡️' : 'ቀጣይ ➡️',
          callback_data: `admin_checkouts_page_${currentFilter}_${page + 1}`,
        });
      }
      rows.push(navRow);
    }

    // Navigation and menu controls
    rows.push([
      {
        text: isEn ? '🔄 Refresh' : '🔄 አድስ',
        callback_data: `admin_checkouts_page_${currentFilter}_${page}`,
      },
      {
        text: isEn ? '📂 Categories' : '📂 ምድቦች',
        callback_data: 'admin_checkouts',
      },
      {
        text: isEn ? '🔙 Admin Panel' : '🔙 ዋና ፓነል',
        callback_data: 'admin_panel',
      },
    ]);

    return Markup.inlineKeyboard(rows);
  },
};

module.exports = keyboards;
