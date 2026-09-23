// src/utils/keyboard.js - Multilingual Inline Keyboard Builders with Button Colors
const { Markup } = require('telegraf');
const config = require('../config');

const keyboards = {
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

    const buttons = [
      // Product Name & Price (Full-width headline button)
      [
        {
          text: isEn ? `💎 Gemini Pro 18M · ${price} ETB` : `💎 Gemini Pro 18 ወራት · ${price} ብር`,
          callback_data: 'buy',
          style: 'primary',
        },
      ],
      // Prominent Green Stock Status & Buy Now (Side-by-side, 100% visible on all mobile screens)
      [
        {
          text: isEn ? '🟢 In Stock' : '🟢 በስቶክ አለ',
          callback_data: 'buy',
          style: 'success',
        },
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

    const rows = [quickButtons];

    const middleRow = [
      { text: '10', callback_data: 'qty_10', style: 'primary' },
      { text: '20', callback_data: 'qty_20', style: 'primary' },
      {
        text: isEn ? '✏️ Custom Quantity' : '✏️ ሌላ ብዛት አስገባ (Custom)',
        callback_data: 'qty_custom',
        style: 'primary',
      },
    ];
    rows.push(middleRow);

    rows.push([
      {
        text: isEn ? '🔄 Refresh' : '🔄 አድስ',
        callback_data: 'refresh_qty',
        style: 'primary',
      },
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
    const unitPrice = config.productPrice || 250;
    const total = quantity * unitPrice;
    return Markup.inlineKeyboard([
      [
        {
          text: isEn
            ? `🏦 CBE Bank — ${total} ETB (${quantity} × ${unitPrice} ETB)`
            : `🏦 የኢትዮጵያ ንግድ ባንክ — ${total} ብር (${quantity} × ${unitPrice} ብር)`,
          callback_data: `pay_cbe_${quantity}`,
          style: 'primary',
        },
      ],
      [
        {
          text: isEn
            ? `📱 Telebirr — ${total} ETB (${quantity} × ${unitPrice} ETB)`
            : `📱 ቴሌብር — ${total} ብር (${quantity} × ${unitPrice} ብር)`,
          callback_data: `pay_telebirr_${quantity}`,
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

  // ─── PAYMENT DETAILS WITH ONE-TAP COPY BUTTON ──────────────
  paymentDetails(method, lang = 'am') {
    const isEn = lang === 'en';
    const isCbe = method === 'CBE';
    const account = isCbe ? config.payment.cbe.account : config.payment.telebirr.account;
    const copyLabel = isEn
      ? (isCbe ? '📋 Copy CBE Account' : '📋 Copy Telebirr Number')
      : (isCbe ? '📋 የ CBE ቁጥር ቅዳ' : '📋 የቴሌብር ስልክ ቅዳ');

    return Markup.inlineKeyboard([
      [
        {
          text: copyLabel,
          copy_text: { text: account },
          style: 'success',
        },
      ],
      [
        {
          text: isEn ? '❌ Cancel' : '❌ ሰርዝ',
          callback_data: 'cancel',
          style: 'danger',
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

  // ─── PENDING VERIFICATION KEYBOARD (Waiting for Admin Approval) ───
  pendingVerification(orderId, lang = 'am', buttonLabel = null) {
    const isEn = lang === 'en';
    const username = config.supportUsername || 'Mnbvcnvhd';
    const label = buttonLabel || (isEn ? '🔄 Verifying Payment...' : '🔄 ክፍያዎ በማረጋገጥ ላይ ነው...');
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
    return Markup.inlineKeyboard([
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
  adminOrdersPagination(currentFilter = 'all', page = 1, totalPages = 1, lang = 'am') {
    const isEn = lang === 'en';
    const rows = [];

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
};

module.exports = keyboards;
