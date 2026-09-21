// src/utils/messages.js - Multilingual Message Templates (Amharic & English)
const config = require('../config');

const msg = {
  // ─── WELCOME / LANGUAGE SELECTION PROMPT ───────────────────
  chooseLanguage() {
    return (
      `✨ <b>Welcome to Gemini Pro Shop!</b> ✨\n` +
      `🛍️ <b>ወደ Gemini Pro መደብር እንኳን ደህና መጡ!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>Get 18 Months of Google Gemini Advanced with fast automated delivery!</i>\n` +
      `⚡ <i>የ 18 ወራት የ Gemini Pro አክቲቬሽን በታላቅ ቅናሽና በፈጣን አቅርቦት ያግኙ!</i>\n\n` +
      `🌐 <b>እባክዎ ቋንቋ ይምረጡ / Please choose your language:</b>`
    );
  },

  // ─── WELCOME MESSAGE ───────────────────────────────────────
  welcome(firstName, lang = 'am') {
    if (lang === 'en') {
      return (
        `🛍️ *Welcome to Gemini Pro Store*\n\n` +
        `💵 *Best prices*\n` +
        `⚡ *Fast delivery after payment*\n` +
        `⚠️ *No warranty*\n` +
        `💬 *Can't find what you need? Contact support*\n\n` +
        `Choose a section below:`
      );
    }

    return (
      `🛍️ *ወደ Gemini Pro መደብር እንኳን ደህና መጡ!*\n\n` +
      `💵 *ምርጥ እና ተመጣጣኝ ዋጋ*\n` +
      `⚡ *ከክፍያ በኋላ ፈጣን ማድረስ*\n` +
      `⚠️ *ዋስትና የለውም (No warranty)*\n` +
      `💬 *እርዳታ ይፈልጋሉ? ድጋፍ ሰጪን ያነጋግሩ*\n\n` +
      `ከታች ካሉት ክፍሎች አንዱን ይምረጡ፦`
    );
  },

  // ─── ADMIN WELCOME MESSAGE ─────────────────────────────────
  adminWelcome(adminName, lang = 'am') {
    if (lang === 'en') {
      return (
        `👋 *Hello Admin ${adminName}! Welcome to the Control Panel*\n\n` +
        `Here you can manage the bot, add stock, and review customer orders.\n\n` +
        `🛠️ *What would you like to do?* Use the buttons below:`
      );
    }

    return (
      `👋 *ሰላም አስተዳዳሪ ${adminName}! ወደ ቁጥጥር ፓነል እንኳን መጡ*\n\n` +
      `እዚህ ሆነው ቦቱን ማስተዳደር፣ ስቶክ መጨመር እና የደንበኞችን ትዕዛዝ ማረጋገጥ ይችላሉ።\n\n` +
      `🛠️ *ምን ማድረግ ይፈልጋሉ?* ከታች ያሉትን አዝራሮች ይጠቀሙ፦`
    );
  },

  // ─── ADMIN STORE PREVIEW (No customer action buttons) ───────
  adminStorePreview(price, stockCount, lang = 'am') {
    if (lang === 'en') {
      return (
        `🏪 <b>Store Status Preview (Admin Mode)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 <b>Product:</b> Google Gemini Advanced (18 Months)\n` +
        `💰 <b>Current Price:</b> ${price} ETB\n` +
        `📦 <b>Live Available Stock:</b> ${stockCount} item(s)\n\n` +
        `✨ <b>Active Customer Features:</b>\n` +
        `✅ 18-month AI Pro plan\n` +
        `✅ 5 TB cloud storage\n` +
        `✅ Supports up to five users\n` +
        `✅ Veo 3 – AI Video Generation 🎥\n` +
        `✅ Imagen 4 – AI Image Generation 🎨\n` +
        `✅ Antigravity & Jules AI Agent\n` +
        `✅ Deep Research\n` +
        `✅ NotebookLM Plus\n` +
        `⚠️ No warranty if any problem happens after it's activated\n\n` +
        `🚀 <b>Delivery is automatic after payment confirmation.</b>\n\n` +
        `⚙️ <i>Admin Control: Use the management buttons below to update price or stock.</i>`
      );
    }

    return (
      `🏪 <b>የመደብሩ ሁኔታ ቅድመ-እይታ (የአድሚን ሁነታ)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>ምርት:</b> Google Gemini Advanced (18 ወራት)\n` +
      `💰 <b>የአሁኑ ዋጋ:</b> ${price} ብር\n` +
      `📦 <b>በስቶክ የሚገኝ:</b> ${stockCount} ሊንክ\n\n` +
      `✨ <b>ለደንበኞች የሚታዩ ጥቅሞች (Features):</b>\n` +
      `✅ 18-month AI Pro plan\n` +
      `✅ 5 TB cloud storage\n` +
      `✅ Supports up to five users\n` +
      `✅ Veo 3 – AI Video Generation 🎥\n` +
      `✅ Imagen 4 – AI Image Generation 🎨\n` +
      `✅ Antigravity & Jules AI Agent\n` +
      `✅ Deep Research\n` +
      `✅ NotebookLM Plus\n` +
      `⚠️ No warranty if any problem happens after it's activated\n\n` +
      `🚀 <b>Delivery is automatic after payment confirmation.</b>\n` +
      `<i>(ከክፍያ ማረጋገጫ በኋላ ሊንኩ ወዲያውኑ በራስ-ሰር ይላካል)</i>\n\n` +
      `⚙️ <i>የአድሚን መቆጣጠሪያ፦ ዋጋ ለመቀየር ወይም ስቶክ ለመጨመር ከታች ያሉትን አዝራሮች ይጠቀሙ።</i>`
    );
  },

  // ─── PRODUCT DETAILS ───────────────────────────────────────
  productDetails(availableCount = 1, lang = 'am') {
    if (lang === 'en') {
      return (
        `🛍️ <b>Gemini Pro 18 Month Link</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 <b>Product:</b> Google Gemini Advanced (18 Months)\n` +
        `💰 <b>Price:</b> ${config.productPrice} ETB / item\n` +
        `📦 <b>Available Stock:</b> 🟢 In Stock (Instant Delivery)\n\n` +
        `✨ <b>Features:</b>\n` +
        `✅ 18-month AI Pro plan\n` +
        `✅ 5 TB cloud storage\n` +
        `✅ Supports up to five users\n` +
        `✅ Veo 3 – AI Video Generation 🎥\n` +
        `✅ Imagen 4 – AI Image Generation 🎨\n` +
        `✅ Antigravity & Jules AI Agent\n` +
        `✅ Deep Research\n` +
        `✅ NotebookLM Plus\n` +
        `⚠️ No warranty if any problem happens after it's activated (but it rarely ever causes any problems)\n\n` +
        `🚀 <b>Delivery is automatic after payment confirmation.</b>\n\n` +
        `🔢 <b>Choose the quantity you want to purchase below:</b>`
      );
    }

    return (
      `🛍️ <b>Gemini Pro 18 Month Link</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>ምርት:</b> Google Gemini Advanced (18 ወራት)\n` +
      `💰 <b>ዋጋ:</b> ${config.productPrice} ብር / በአንድ ሊንክ\n` +
      `📦 <b>በስቶክ የሚገኝ:</b> 🟢 በስቶክ ይገኛል (ፈጣን አቅርቦት)\n\n` +
      `✨ <b>Features (ጥቅሞች):</b>\n` +
      `✅ 18-month AI Pro plan\n` +
      `✅ 5 TB cloud storage\n` +
      `✅ Supports up to five users\n` +
      `✅ Veo 3 – AI Video Generation 🎥\n` +
      `✅ Imagen 4 – AI Image Generation 🎨\n` +
      `✅ Antigravity & Jules AI Agent\n` +
      `✅ Deep Research\n` +
      `✅ NotebookLM Plus\n` +
      `⚠️ No warranty if any problem happens after it's activated (but it rarely ever causes any problems)\n\n` +
      `🚀 <b>Delivery is automatic after payment confirmation.</b>\n` +
      `<i>(ከክፍያ ማረጋገጫ በኋላ ሊንኩ ወዲያውኑ በራስ-ሰር ይላካል)</i>\n\n` +
      `🔢 <b>የሚፈልጉትን ብዛት ከታች ይምረጡ፦</b>`
    );
  },

  // ─── PAYMENT INSTRUCTIONS ──────────────────────────────────
  paymentInstructions(method, lang = 'am', quantity = 1, amount = null) {
    const unitPrice = config.productPrice || 250;
    const totalAmount = amount || (quantity * unitPrice);

    if (lang === 'en') {
      const baseEn =
        `💳 <b>Payment Details</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Product:</b> ${config.productName}\n` +
        `🔢 <b>Quantity:</b> <b>${quantity} item(s)</b>\n` +
        `💵 <b>Unit Price:</b> <b>${unitPrice} ETB</b>\n` +
        `💰 <b>Total Amount:</b> <b>${quantity} × ${unitPrice} = ${totalAmount} ETB</b>\n\n`;

      if (method === 'CBE') {
        return (
          baseEn +
          `🏦 <b>Commercial Bank of Ethiopia (CBE)</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 <b>Account Number:</b>\n` +
          `👉 <code>${config.payment.cbe.account}</code> 👈\n` +
          `<i>(👆 Tap account number to copy instantly!)</i>\n\n` +
          `👤 <b>Account Name:</b>\n` +
          `👉 <b>${config.payment.cbe.name}</b>\n\n` +
          `💰 <b>Total to Pay:</b>\n` +
          `👉 <b>${totalAmount} ETB</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📸 <b>Payment Steps:</b>\n` +
          `1️⃣ Tap the account number above to copy it\n` +
          `2️⃣ Transfer <b>${totalAmount} ETB</b> via CBE Birr / Mobile Banking\n` +
          `3️⃣ Take a clear screenshot of the completed receipt\n` +
          `4️⃣ Send the screenshot directly into this chat\n\n` +
          `⏱️ <i>Reserved for 5 minutes. Deliveries are processed immediately upon verification!</i>`
        );
      } else if (method === 'Telebirr') {
        return (
          baseEn +
          `📱 <b>Telebirr</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 <b>Phone Number:</b>\n` +
          `👉 <code>${config.payment.telebirr.account}</code> 👈\n` +
          `<i>(👆 Tap phone number to copy instantly!)</i>\n\n` +
          `👤 <b>Account Name:</b>\n` +
          `👉 <b>${config.payment.telebirr.name}</b>\n\n` +
          `💰 <b>Total to Pay:</b>\n` +
          `👉 <b>${totalAmount} ETB</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📸 <b>Payment Steps:</b>\n` +
          `1️⃣ Tap the phone number above to copy it\n` +
          `2️⃣ Open Telebirr app → Send <b>${totalAmount} ETB</b>\n` +
          `3️⃣ Take a screenshot of the completed transaction\n` +
          `4️⃣ Send the screenshot directly into this chat\n\n` +
          `⏱️ <i>Reserved for 5 minutes. Deliveries are processed immediately upon verification!</i>`
        );
      }
      return baseEn;
    }

    const baseAm =
      `💳 <b>የክፍያ መረጃ</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>ምርት:</b> ${config.productName}\n` +
      `🔢 <b>የተመረጠው ብዛት:</b> <b>${quantity} ሊንክ</b>\n` +
      `💵 <b>የነጠላ ዋጋ:</b> <b>${unitPrice} ብር</b>\n` +
      `💰 <b>ጠቅላላ ክፍያ:</b> <b>${quantity} × ${unitPrice} = ${totalAmount} ብር</b>\n\n`;

    if (method === 'CBE') {
      return (
        baseAm +
        `🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>የሒሳብ ቁጥር (Account Number):</b>\n` +
        `👉 <code>${config.payment.cbe.account}</code> 👈\n` +
        `<i>(👆 ለመቅዳት ቁጥሩን ይጫኑ / Tap to copy!)</i>\n\n` +
        `👤 <b>የሂሳብ ስም (Account Name):</b>\n` +
        `👉 <b>${config.payment.cbe.name}</b>\n\n` +
        `💰 <b>የሚከፈለው ጠቅላላ መጠን:</b>\n` +
        `👉 <b>${totalAmount} ብር</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📸 <b>የአከፋፈል ቅደም ተከተል:</b>\n` +
        `1️⃣ ከላይ ያለውን የሂሳብ ቁጥር ነክተው ይቅዱ\n` +
        `2️⃣ በ CBE Birr ወይም Mobile Banking <b>${totalAmount} ብር</b> ያስተላልፉ\n` +
        `3️⃣ የተላከበትን <b>የደረሰኝ Screenshot ፎቶ</b> ያንሱ\n` +
        `4️⃣ ፎቶውን እዚህ ቦቱ ላይ ይላኩ\n\n` +
        `⏱️ <i>ማሳሰቢያ፦ ይህ ትዕዛዝ ለ 5 ደቂቃዎች ብቻ የተጠበቀ ነው። ደረሰኙ እንደደረሰን ወዲያው ይላካል!</i>`
      );
    } else if (method === 'Telebirr') {
      return (
        baseAm +
        `📱 <b>ቴሌብር (Telebirr)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>የስልክ ቁጥር (Phone Number):</b>\n` +
        `👉 <code>${config.payment.telebirr.account}</code> 👈\n` +
        `<i>(👆 ለመቅዳት ቁጥሩን ይጫኑ / Tap to copy!)</i>\n\n` +
        `👤 <b>የተጠቃሚ ስም (Account Name):</b>\n` +
        `👉 <b>${config.payment.telebirr.name}</b>\n\n` +
        `💰 <b>የሚከፈለው ጠቅላላ መጠን:</b>\n` +
        `👉 <b>${totalAmount} ብር</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📸 <b>የአከፋፈል ቅደም ተከተል:</b>\n` +
        `1️⃣ ከላይ ያለውን ስልክ ቁጥር ነክተው ይቅዱ\n` +
        `2️⃣ በ Telebirr App Send Money በማድረግ <b>${totalAmount} ብር</b> ይላኩ\n` +
        `3️⃣ የተላከበትን <b>የደረሰኝ Screenshot ፎቶ</b> ያንሱ\n` +
        `4️⃣ ፎቶውን እዚህ ቦቱ ላይ ይላኩ\n\n` +
        `⏱️ <i>ማሳሰቢያ፦ ይህ ትዕዛዝ ለ 5 ደቂቃዎች ብቻ የተጠበቀ ነው። ደረሰኙ እንደደረሰን ወዲያው ይላካል!</i>`
      );
    }
    return baseAm;
  },

  // ─── RECEIPT RECEIVED / PENDING VERIFICATION ────────────────
  receiptReceived(orderId, lang = 'am', step = 0) {
    const isEn = lang === 'en';

    // Animated progress stages
    const stages = [
      { pct: '30%', bar: '▓▓▓░░░░░░░', amStatus: 'ደረሰኝ ተቀብለናል (Received)', enStatus: 'Receipt Received' },
      { pct: '70%', bar: '▓▓▓▓▓▓▓░░░', amStatus: 'አስተዳዳሪው በማረጋገጥ ላይ ነው (Reviewing)', enStatus: 'Admin Reviewing Payment' },
      { pct: '95%', bar: '▓▓▓▓▓▓▓▓▓░', amStatus: 'በመጨረሻው ማረጋገጫ ላይ (Finalizing)', enStatus: 'Finalizing Verification' },
    ];
    const cur = stages[Math.min(step, stages.length - 1)];

    if (isEn) {
      return (
        `⏳ <b>Verifying Payment...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔢 Order ID: <code>${orderId}</code>\n` +
        `📊 Status: <b>🟡 ${cur.enStatus}</b>\n` +
        `⚡ Progress: <code>[${cur.bar}] ${cur.pct}</code>\n\n` +
        `⏳ <i>Our admin is currently reviewing your payment receipt. Once approved, your Gemini Pro activation link will be delivered right here automatically!</i>\n\n` +
        `📲 <b>Please stay tuned — this usually takes just a few minutes.</b>`
      );
    }

    return (
      `⏳ <b>ክፍያዎ በማረጋገጥ ላይ ነው...</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🔢 የትዕዛዝ ቁጥር: <code>${orderId}</code>\n` +
      `📊 ሁኔታ: <b>🟡 ${cur.amStatus}</b>\n` +
      `⚡ ሂደት: <code>[${cur.bar}] ${cur.pct}</code>\n\n` +
      `⏳ <i>አስተዳዳሪው የላኩትን ደረሰኝ በማረጋገጥ ላይ ነው። ልክ እንዳረጋገጠ የ Gemini Pro አክቲቬሽን ሊንኩ በራስ-ሰር እዚህ ይላክሎታል!</i>\n\n` +
      `📲 <b>እባክዎ በትዕግስት ይጠብቁ — በጥቂት ደቂቃዎች ውስጥ ይደርሳል!</b>`
    );
  },

  // ─── ORDER APPROVED (HTML formatted for safe URL handling) ──
  orderApproved(links, orderId, lang = 'am') {
    const linkArray = Array.isArray(links) ? links : [links];
    const supportUser = config.supportUsername || 'Mnbvcnvhd';

    if (lang === 'en') {
      let text =
        `✅ <b>Delivered!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>${orderId}</b>\n` +
        `📦 <b>Gemini Pro 18M × ${linkArray.length}</b>\n\n` +
        `🎁 <b>Your delivery:</b>\n`;

      linkArray.forEach((lnk, idx) => {
        const safeHref = lnk.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (linkArray.length > 1) {
          text += `\n${idx + 1}️⃣ <a href="${safeHref}">${safeHref}</a>\n`;
        } else {
          text += `<a href="${safeHref}">${safeHref}</a>\n`;
        }
      });

      text +=
        `\n📋 <b>Activation Instructions:</b>\n` +
        `• Connect VPN\n` +
        `• Click the provided activation link\n` +
        `• Sign in to the target Gmail account\n` +
        `• Select Activate Offer\n\n` +
        `❓ Issues? Contact: @${supportUser}\n\n` +
        `🙏 Thank you for shopping with us!`;

      return text;
    }

    let text =
      `✅ <b>ትዕዛዝዎ ደርሷል! (Delivered)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>${orderId}</b>\n` +
      `📦 <b>Gemini Pro 18 ወራት × ${linkArray.length}</b>\n\n` +
      `🎁 <b>የተላከው ሊንክ (Your delivery):</b>\n`;

    linkArray.forEach((lnk, idx) => {
      const safeHref = lnk.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (linkArray.length > 1) {
        text += `\n${idx + 1}️⃣ <a href="${safeHref}">${safeHref}</a>\n`;
      } else {
        text += `<a href="${safeHref}">${safeHref}</a>\n`;
      }
    });

    text +=
      `\n📋 <b>የአክቲቬሽን መመሪያ (Activation Instructions):</b>\n` +
      `• Connect VPN (መጀመሪያ VPN ያገናኙ)\n` +
      `• Click the provided activation link (የተላከውን ሊንክ ይጫኑ)\n` +
      `• Sign in to the target Gmail account (በሚፈልጉት Gmail Account ይግቡ)\n` +
      `• Select Activate Offer ("Activate Offer" የሚለውን ይጫኑ)\n\n` +
      `❓ ችግር ካጋጠመዎት ያነጋግሩን፦ @${supportUser}\n\n` +
      `🙏 እኛን ስለመረጡ እናመሰግናለን!`;

    return text;
  },

  // ─── ORDER REJECTED ────────────────────────────────────────
  orderRejected(reason, orderId, lang = 'am') {
    if (lang === 'en') {
      return (
        `❌ *Order Not Approved*\n\n` +
        `🔢 Order ID: \`${orderId}\`\n\n` +
        `📝 *Reason:* ${reason || 'Receipt could not be verified'}\n\n` +
        `💡 *What can you do?*\n` +
        `• Make sure you send a valid transaction screenshot\n` +
        `• Verify that you transferred the correct amount (${config.productPrice} ETB)\n` +
        `• If you have questions, contact @${config.supportUsername || 'Mnbvcnvhd'}\n\n` +
        `You can tap /buy to try again.`
      );
    }

    return (
      `❌ *ትዕዛዝዎ ተቀባይነት አላገኘም*\n\n` +
      `🔢 የትዕዛዝ ቁጥር: \`${orderId}\`\n\n` +
      `📝 *ምክንያት:* ${reason || 'ደረሰኙ ትክክል አይደለም'}\n\n` +
      `💡 *ምን ማድረግ ይቻላል?*\n` +
      `• ትክክለኛ የደረሰኝ ስክሪንሾት ይላኩ\n` +
      `• ትክክለኛውን መጠን (${config.productPrice} ብር) ማስተላለፍዎን ያረጋግጡ\n` +
      `• ጥያቄ ካለዎት ያነጋግሩ: @${config.supportUsername || 'Mnbvcnvhd'}\n\n` +
      `/buy ብለው እንደገና መሞከር ይችላሉ።`
    );
  },

  // ─── NO STOCK ──────────────────────────────────────────────
  noStock(lang = 'am') {
    if (lang === 'en') {
      return (
        `😔 <b>Sorry, we are currently out of stock!</b>\n\n` +
        `New Gemini Pro activation links are added regularly.\n` +
        `Please check back shortly or contact: @${config.supportUsername || 'Mnbvcnvhd'}`
      );
    }

    return (
      `😔 <b>ይቅርታ! በአሁኑ ሰዓት ስቶክ አልቋል</b>\n\n` +
      `አዳዲስ የ Gemini Pro ሊንኮች በቅርቡ ይጨመራሉ።\n` +
      `እባክዎ ጥቂት ቆይተው ይሞክሩ ወይም ያነጋግሩ: @${config.supportUsername || 'Mnbvcnvhd'}`
    );
  },

  // ─── MY ORDERS ─────────────────────────────────────────────
  myOrders(orders, lang = 'am') {
    if (!orders || orders.length === 0) {
      return lang === 'en'
        ? `📦 *You have no orders yet.*\n\nTap /buy to get started!`
        : `📦 *እስካሁን ምንም ትዕዛዝ የለዎትም።*\n\nለመግዛት /buy ብለው ይጀምሩ!`;
    }

    const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
    const statusText = {
      en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
      am: { pending: 'በጥበቃ ላይ', approved: 'ተፈቅዷል', rejected: 'ውድቅ ተደርጓል' },
    };

    let text = lang === 'en'
      ? `📦 *Your Order History (${orders.length})*\n\n`
      : `📦 *የትዕዛዝ ታሪክዎ (${orders.length})*\n\n`;

    orders.slice(0, 10).forEach((order, i) => {
      const date = new Date(order.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'am-ET');
      const st = statusText[lang] ? statusText[lang][order.status] : order.status;
      text += `${i + 1}. ${statusEmoji[order.status]} \`${order.orderId}\`\n`;
      text += `   💰 ${order.amount} ${lang === 'en' ? 'ETB' : 'ብር'} | 📅 ${date} | ${st}\n\n`;
    });
    return text;
  },

  // ─── HELP ──────────────────────────────────────────────────
  help(lang = 'am') {
    if (lang === 'en') {
      return (
        `❓ *Help & FAQ*\n\n` +
        `🛒 */buy* — Purchase a Gemini Pro 18 Months link\n` +
        `📦 */myorders* — View your past orders & statuses\n` +
        `🌐 */language* — Change language (English / አማርኛ)\n` +
        `🏠 */start* — Back to main menu\n\n` +
        `📞 *Direct Support:*\n` +
        `Reach out to @${config.supportUsername || 'Mnbvcnvhd'}\n` +
        `⏰ Available 24/7 for assistance!`
      );
    }

    return (
      `❓ *እርዳታ እና መረጃ*\n\n` +
      `🛒 */buy* — የ Gemini Pro 18 ወራት ሊንክ ግዙ\n` +
      `📦 */myorders* — ያለፉ ትዕዛዞችዎን ይመልከቱ\n` +
      `🌐 */language* — ቋንቋ ይቀይሩ (አማርኛ / English)\n` +
      `🏠 */start* — ወደ ዋና ማውጫ ይመለሱ\n\n` +
      `📞 *ቀጥታ ድጋፍ:*\n` +
      `ያነጋግሩን: @${config.supportUsername || 'Mnbvcnvhd'}\n` +
      `⏰ 24/7 ፈጣን ምላሽ እንሰጣለን!`
    );
  },

  // ─── CONTACT ───────────────────────────────────────────────
  contact(lang = 'am') {
    if (lang === 'en') {
      return (
        `📞 *Contact Support*\n\n` +
        `For questions, support, or order verification:\n\n` +
        `👤 *Admin:* @${config.supportUsername || 'Mnbvcnvhd'}\n` +
        `⏰ *Support Hours:* 24/7 Quick Response\n\n` +
        `👇 Tap the button below to message directly:`
      );
    }

    return (
      `📞 *የደንበኞች ድጋፍ*\n\n` +
      `ለማንኛውም ጥያቄ፣ ድጋፍ ወይም የክፍያ ማረጋገጫ ጉዳይ በዚህ አድራሻ ያነጋግሩን፦\n\n` +
      `👤 *አድሚን / ድጋፍ:* @${config.supportUsername || 'Mnbvcnvhd'}\n` +
      `⏰ *የስራ ሰዓት:* 24/7 ፈጣን ምላሽ\n\n` +
      `👇 በቀጥታ ለማነጋገር ከታች ያለውን አዝራር ይጫኑ:`
    );
  },

  // ─── ADMIN NOTIFICATION MESSAGES ───────────────────────────
  adminNewOrder(order, user) {
    function esc(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const rawFullName = `${firstName} ${lastName}`.trim();
    const fullName = rawFullName ? rawFullName : 'ስም አልተገለጸም';
    const username = user.username ? `@${user.username}` : 'የለውም';
    const qty = order.quantity || 1;
    return (
      `🔔 <b>አዲስ ትዕዛዝ!</b>\n\n` +
      `🔢 ትዕዛዝ: <code>${esc(order.orderId)}</code>\n` +
      `👤 ስም: <b>${esc(fullName)}</b>\n` +
      `🔗 ዩዘርኔም: <b>${esc(username)}</b>\n` +
      `🆔 Telegram ID: <code>${order.userId}</code>\n` +
      `📦 ብዛት: <b>${qty} ሊንክ</b>\n` +
      `💰 መጠን: <b>${order.amount} ብር</b>\n` +
      `💳 ክፍያ: <b>${esc(order.paymentMethod)}</b>\n` +
      `📅 ቀን: ${new Date(order.createdAt || Date.now()).toLocaleString('am-ET')}\n\n` +
      `📸 ደረሰኝ ስዕል ከላይ ተላኳል\n` +
      `⬇️ ምርጫ ያድርጉ:`
    );
  },

  adminStats(stats, lang = 'am') {
    if (lang === 'en') {
      return (
        `📊 *Dashboard Statistics*\n\n` +
        `👥 Total Customers: ${stats.totalUsers}\n` +
        `📦 Total Orders: ${stats.totalOrders}\n` +
        `✅ Approved Orders: ${stats.approvedOrders}\n` +
        `⏳ Pending Orders: ${stats.pendingOrders}\n` +
        `❌ Rejected Orders: ${stats.rejectedOrders}\n\n` +
        `📦 *Stock Inventory:*\n` +
        `✅ Available: ${stats.availableStock}\n` +
        `🔴 Sold: ${stats.soldStock}\n` +
        `📋 Total: ${stats.totalStock}\n\n` +
        `💰 *Total Revenue:* ${stats.totalRevenue} ETB`
      );
    }

    return (
      `📊 *ስታቲስቲክስ (Statistics)*\n\n` +
      `👥 ደንበኞች: ${stats.totalUsers}\n` +
      `📦 ጠቅላላ ትዕዛዞች: ${stats.totalOrders}\n` +
      `✅ የተፈቀዱ: ${stats.approvedOrders}\n` +
      `⏳ በጥበቃ ላይ: ${stats.pendingOrders}\n` +
      `❌ ያልተፈቀዱ: ${stats.rejectedOrders}\n\n` +
      `📦 *ስቶክ:*\n` +
      `✅ የሚገኝ: ${stats.availableStock}\n` +
      `🔴 የተሸጠ: ${stats.soldStock}\n` +
      `📋 ጠቅላላ: ${stats.totalStock}\n\n` +
      `💰 *ገቢ:* ${stats.totalRevenue} ብር`
    );
  },

  stockAdded(count, lang = 'am') {
    return lang === 'en'
      ? `✅ *Successfully added ${count} link(s) to stock!*`
      : `✅ *${count} ሊንክ(ዎች) ወደ ስቶክ ተጨምሯል!*`;
  },
};

module.exports = msg;
