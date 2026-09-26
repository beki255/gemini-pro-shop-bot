// src/utils/messages.js - Multilingual Message Templates (Amharic & English)
const config = require('../config');

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
        `🛍️ <b>Welcome to Gemini Pro Store</b>\n\n` +
        `💵 <b>Best prices</b>\n` +
        `⚡ <b>Fast delivery after payment</b>\n` +
        `⚠️ <b>No warranty</b>\n` +
        `💬 <b>Can't find what you need? Contact support</b>\n\n` +
        `Choose a section below:`
      );
    }

    return (
      `🛍️ <b>ወደ Gemini Pro መደብር እንኳን ደህና መጡ!</b>\n\n` +
      `💵 <b>ምርጥ እና ተመጣጣኝ ዋጋ</b>\n` +
      `⚡ <b>ከክፍያ በኋላ ፈጣን ማድረስ</b>\n` +
      `⚠️ <b>ዋስትና የለውም (No warranty)</b>\n` +
      `💬 <b>እርዳታ ይፈልጋሉ? ድጋፍ ሰጪን ያነጋግሩ</b>\n\n` +
      `ከታች ካሉት ክፍሎች አንዱን ይምረጡ፦`
    );
  },

  // ─── ADMIN WELCOME MESSAGE ─────────────────────────────────
  adminWelcome(adminName, lang = 'am') {
    const safeName = String(adminName || 'Admin').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (lang === 'en') {
      return (
        `👋 <b>Hello Admin ${safeName}! Welcome to the Control Panel</b>\n\n` +
        `Here you can manage the bot, add stock, and review customer orders.\n\n` +
        `🛠️ <b>What would you like to do?</b> Use the buttons below:`
      );
    }

    return (
      `👋 <b>ሰላም አስተዳዳሪ ${safeName}! ወደ ቁጥጥር ፓነል እንኳን መጡ</b>\n\n` +
      `እዚህ ሆነው ቦቱን ማስተዳደር፣ ስቶክ መጨመር እና የደንበኞችን ትዕዛዝ ማረጋገጥ ይችላሉ።\n\n` +
      `🛠️ <b>ምን ማድረግ ይፈልጋሉ?</b> ከታች ያሉትን አዝራሮች ይጠቀሙ፦`
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
      `✅ Deep Research & NotebookLM Plus\n\n` +
      `📜 <b>የግዢ ፖሊሲ (Terms & Warranty):</b>\n` +
      `<blockquote>⚠️ <b>ዋስትና የለውም (No Warranty)</b>\n` +
      `• ሊንኩ አንዴ አክቲቭ ከተደረገ በኋላ ለሚፈጠር ማንኛውም ችግር ዋስትና የለውም።\n` +
      `• <i>(ሆኖም በአብዛኛው ምንም አይነት ችግር አያጋጥምም)</i>\n` +
      `⏰ <b>የአክቲቬሽን ጊዜ ገደብ (1 ሰዓት):</b>\n` +
      `• ሊንኩ እንደደረሰዎት በ 1 ሰዓት ውስጥ አክቲቭ መደረግ አለበት፤ ካለፈ ኃላፊነት አንወስድም።</blockquote>\n\n` +
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
        `📦 <b>Status:</b> 🟢 In Stock (Instant Delivery)\n\n` +
        `✨ <b>Key Features:</b>\n` +
        `✅ 18-Month AI Pro Plan\n` +
        `✅ 5 TB Cloud Storage\n` +
        `✅ Up to 5 User Accounts\n` +
        `✅ Veo 3 Video · Imagen 4 Image\n` +
        `✅ Antigravity, Jules, Deep Research & NotebookLM\n\n` +
        `📜 <b>Terms & Policy (የግዢ ፖሊሲ):</b>\n` +
        `<blockquote>⚠️ <b>No Warranty Notice:</b>\n` +
        `• No warranty if any problem happens after it's activated.\n` +
        `• <i>(Rarely ever causes any issues)</i>\n` +
        `⏰ <b>1-Hour Activation Window:</b>\n` +
        `• You must activate the link within <b>1 hour</b> of delivery.\n` +
        `• If the link expires after 1 hour, we are not responsible or liable.\n` +
        `• By purchasing, you accept these terms.</blockquote>\n\n` +
        `🚀 <b>Automatic delivery right after payment confirmation.</b>\n\n` +
        `🔢 <b>Choose the quantity you want to purchase below:</b>`
      );
    }

    return (
      `🛍️ <b>Gemini Pro 18 Month Link</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>ምርት:</b> Google Gemini Advanced (18 ወራት)\n` +
      `💰 <b>ዋጋ:</b> ${config.productPrice} ብር / በአንድ ሊንክ\n` +
      `📦 <b>ሁኔታ:</b> 🟢 በስቶክ ይገኛል (ፈጣን አቅርቦት)\n\n` +
      `✨ <b>ዋና ዋና ጥቅሞች (Features):</b>\n` +
      `✅ የ 18 ወራት AI Pro Plan\n` +
      `✅ 5 TB Cloud Storage\n` +
      `✅ እስከ 5 ሰው መጋራት የሚያስችል\n` +
      `✅ Veo 3 Video · Imagen 4 Image\n` +
      `✅ Antigravity፣ Jules፣ Deep Research እና NotebookLM\n\n` +
      `📜 <b>የግዢ ፖሊሲ እና ማስጠንቀቂያ (Terms & Policy):</b>\n` +
      `<blockquote>⚠️ <b>ዋስትና የለውም (No Warranty)</b>\n` +
      `• ሊንኩ አንዴ አክቲቭ ከተደረገ በኋላ ለሚፈጠር ማንኛውም ችግር ዋስትና የለውም።\n` +
      `• <i>(ሆኖም በአብዛኛው ምንም አይነት ችግር አያጋጥምም)</i>\n` +
      `⏰ <b>የአክቲቬሽን ጊዜ ገደብ (1 ሰዓት):</b>\n` +
      `• ሊንኩ እንደደረሰዎት በ <b>1 ሰዓት (within 1 hour)</b> ውስጥ አክቲቭ ማድረግ አለብዎት።\n` +
      `• 1 ሰዓት አልፎ ሊንኩ ኤክስፓየር (expire) ቢያደርግ ኃላፊነት አንወስድም።\n` +
      `• በመግዛትዎ ይህንን ፖሊሲ ተቀብለዋል።</blockquote>\n\n` +
      `🚀 <b>ክፍያዎ እንደተረጋገጠ ሊንኩ ወዲያውኑ ይላካል!</b>\n\n` +
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
          `👉 <code>${config.payment.cbe.account}</code> 👈\n\n` +
          `👤 <b>Account Name:</b>\n` +
          `👉 <b>${config.payment.cbe.name}</b>\n\n` +
          `💰 <b>Total to Pay:</b>\n` +
          `👉 <b>${totalAmount} ETB</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📸 <b>Payment Steps:</b>\n` +
          `1️⃣ Tap the account number above to copy\n` +
          `2️⃣ Transfer <b>${totalAmount} ETB</b> via CBE Birr / Mobile Banking\n` +
          `3️⃣ Take a clear screenshot of the completed receipt\n` +
          `4️⃣ Send the screenshot directly into this chat\n\n` +
          `⏱️ <i>Reserved for 30 minutes. Deliveries are processed immediately upon verification!</i>`
        );
      } else if (method === 'Telebirr') {
        return (
          baseEn +
          `📱 <b>Telebirr</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 <b>Phone Number:</b>\n` +
          `👉 <code>${config.payment.telebirr.account}</code> 👈\n\n` +
          `👤 <b>Account Name:</b>\n` +
          `👉 <b>${config.payment.telebirr.name}</b>\n\n` +
          `💰 <b>Total to Pay:</b>\n` +
          `👉 <b>${totalAmount} ETB</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📸 <b>Payment Steps:</b>\n` +
          `1️⃣ Tap the phone number above to copy\n` +
          `2️⃣ Open Telebirr app → Send <b>${totalAmount} ETB</b>\n` +
          `3️⃣ Take a screenshot of the completed transaction\n` +
          `4️⃣ Send the screenshot directly into this chat\n\n` +
          `⏱️ <i>Reserved for 30 minutes. Deliveries are processed immediately upon verification!</i>`
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
        `👉 <code>${config.payment.cbe.account}</code> 👈\n\n` +
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
        `⏱️ <i>ማሳሰቢያ፦ ይህ ትዕዛዝ ለ 30 ደቂቃዎች ብቻ የተጠበቀ ነው። ደረሰኙ እንደደረሰን ወዲያው ይላካል!</i>`
      );
    } else if (method === 'Telebirr') {
      return (
        baseAm +
        `📱 <b>ቴሌብር (Telebirr)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>የስልክ ቁጥር (Phone Number):</b>\n` +
        `👉 <code>${config.payment.telebirr.account}</code> 👈\n\n` +
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
        `⏱️ <i>ማሳሰቢያ፦ ይህ ትዕዛዝ ለ 30 ደቂቃዎች ብቻ የተጠበቀ ነው። ደረሰኙ እንደደረሰን ወዲያው ይላካል!</i>`
      );
    }
    return baseAm;
  },

  // ─── RECEIPT RECEIVED / PENDING VERIFICATION ────────────────
  receiptReceived(orderId, lang = 'am', scannerBar = null, clockEmoji = '🕐') {
    const isEn = lang === 'en';
    const bar = scannerBar || '[ ▰▰▱▱▱▱▱▱ ]';
    const clk = clockEmoji || '🕐';

    if (isEn) {
      return (
        `${clk} <b>Verifying Payment...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔢 Order ID: <code>${orderId}</code>\n` +
        `📊 Status: <b>🟡 Reviewing Receipt</b>\n` +
        `⚡ Process: <code>${bar}</code>\n\n` +
        `⏳ <i>Our admin is currently reviewing your payment receipt. Once approved, your Gemini Pro activation link will be delivered right here automatically!</i>\n\n` +
        `📲 <b>Please stay tuned — this usually takes just a few minutes.</b>`
      );
    }

    return (
      `${clk} <b>ክፍያዎ በማረጋገጥ ላይ ነው...</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🔢 የትዕዛዝ ቁጥር: <code>${orderId}</code>\n` +
      `📊 ሁኔታ: <b>🟡 አስተዳዳሪው በማረጋገጥ ላይ ነው</b>\n` +
      `⚡ ሂደት: <code>${bar}</code>\n\n` +
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
        `• ⏰ <b>Please activate within 1 hour of receiving this link</b>\n` +
        `• <b>Connect VPN for only activation, after activation you can turn off</b>\n` +
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
      `• ⏰ <b>እባክዎ ሊንኩ እንደደረሰዎት በ 1 ሰዓት ውስጥ አክቲቭ ያድርጉ!</b>\n` +
      `• <b>Connect VPN for only activation, after activation you can turn off</b> (VPN የሚያስፈልገው ለአክቲቬሽን ብቻ ነው፤ አክቲቭ ካደረጉ በኋላ ማጥፋት ይችላሉ)\n` +
      `• Click the provided activation link (የተላከውን ሊንክ ይጫኑ)\n` +
      `• Sign in to the target Gmail account (በሚፈልጉት Gmail Account ይግቡ)\n` +
      `• Select Activate Offer ("Activate Offer" የሚለውን ይጫኑ)\n\n` +
      `❓ ችግር ካጋጠመዎት ያነጋግሩን፦ @${supportUser}\n\n` +
      `🙏 እኛን ስለመረጡ እናመሰግናለን!`;

    return text;
  },

  // ─── ORDER REJECTED ────────────────────────────────────────
  orderRejected(reason, orderId, lang = 'am', amount = null, quantity = 1) {
    const isEn = lang === 'en';
    const unitPrice = config.productPrice || 250;
    const finalQty = quantity && parseInt(quantity, 10) > 0 ? parseInt(quantity, 10) : 1;
    const finalAmount = amount && parseInt(amount, 10) > 0 ? parseInt(amount, 10) : finalQty * unitPrice;

    const escapeHtml = (text) =>
      String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const safeReason = escapeHtml(reason || (isEn ? 'Receipt could not be verified' : 'ደረሰኙ ትክክል አይደለም'));
    const safeOrderId = escapeHtml(orderId);
    const safeSupport = escapeHtml(config.supportUsername || 'Mnbvcnvhd');

    const priceTextEn =
      finalQty > 1
        ? `${finalAmount} ETB (${finalQty} × ${unitPrice} ETB)`
        : `${finalAmount} ETB`;

    const priceTextAm =
      finalQty > 1
        ? `${finalAmount} ብር (${finalQty} × ${unitPrice} ብር)`
        : `${finalAmount} ብር`;

    if (isEn) {
      return (
        `❌ <b>Order Not Approved</b>\n\n` +
        `🔢 <b>Order ID:</b> <code>${safeOrderId}</code>\n` +
        `📦 <b>Quantity:</b> <b>${finalQty} link(s)</b>\n` +
        `💰 <b>Expected Amount:</b> <b>${priceTextEn}</b>\n\n` +
        `📝 <b>Reason:</b> ${safeReason}\n\n` +
        `💡 <b>What can you do?</b>\n` +
        `• Make sure you send a valid transaction screenshot\n` +
        `• Verify that you transferred the correct amount (${priceTextEn})\n` +
        `• If you have questions, contact: @${safeSupport}\n\n` +
        `You can tap /buy to try again.`
      );
    }

    return (
      `❌ <b>ትዕዛዝዎ ተቀባይነት አላገኘም</b>\n\n` +
      `🔢 <b>የትዕዛዝ ቁጥር:</b> <code>${safeOrderId}</code>\n` +
      `📦 <b>የተመረጠው ብዛት:</b> <b>${finalQty} ሊንክ</b>\n` +
      `💰 <b>የሚጠበቀው ጠቅላላ ክፍያ:</b> <b>${priceTextAm}</b>\n\n` +
      `📝 <b>ምክንያት:</b> ${safeReason}\n\n` +
      `💡 <b>ምን ማድረግ ይቻላል?</b>\n` +
      `• ትክክለኛ የደረሰኝ ስክሪንሾት ይላኩ\n` +
      `• ትክክለኛውን መጠን (${priceTextAm}) ማስተላለፍዎን ያረጋግጡ\n` +
      `• ጥያቄ ካለዎት ያነጋግሩ: @${safeSupport}\n\n` +
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
  myOrders(orders, lang = 'am', page = 1, totalPages = 1, totalCount = null) {
    const total = totalCount !== null ? totalCount : (orders ? orders.length : 0);
    if (!orders || orders.length === 0) {
      return lang === 'en'
        ? `📦 <b>You have no orders yet.</b>\n\nTap /buy to get started!`
        : `📦 <b>እስካሁን ምንም ትዕዛዝ የለዎትም።</b>\n\nለመግዛት /buy ብለው ይጀምሩ!`;
    }

    const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
    const statusText = {
      en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
      am: { pending: 'በጥበቃ ላይ', approved: 'ተፈቅዷል', rejected: 'ውድቅ ተደርጓል' },
    };

    const pageInfo = totalPages > 1
      ? (lang === 'en' ? ` — Page ${page}/${totalPages}` : ` — ገጽ ${page}/${totalPages}`)
      : '';

    let text = lang === 'en'
      ? `📦 <b>Your Order History (${total} Orders Total)${pageInfo}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`
      : `📦 <b>የትዕዛዝ ታሪክዎ (ጠቅላላ ${total} ትዕዛዞች)${pageInfo}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    const PAGE_SIZE = 10;
    const startIndex = (page - 1) * PAGE_SIZE;

    orders.forEach((order, i) => {
      const itemNumber = startIndex + i + 1;
      const date = new Date(order.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'am-ET');
      const st = statusText[lang] ? statusText[lang][order.status] : order.status;
      const emoji = statusEmoji[order.status] || '📦';
      const quantityText = order.quantity && order.quantity > 1
        ? (lang === 'en' ? ` (${order.quantity} links)` : ` (${order.quantity} ሊንክ)`)
        : '';

      text += `<b>${itemNumber}.</b> ${emoji} <code>${esc(order.orderId)}</code>${quantityText}\n`;
      text += `   💰 <b>${order.amount}</b> ${lang === 'en' ? 'ETB' : 'ብር'} | 📅 ${date} | <b>${st}</b>\n\n`;
    });

    if (totalPages > 1) {
      text += lang === 'en'
        ? `<i>Use the buttons below to switch pages.</i>`
        : `<i>ገጾቹን ለመቀያየር ከታች ያሉትን አዝራሮች ይጠቀሙ።</i>`;
    }

    return text;
  },

  // ─── HELP ──────────────────────────────────────────────────
  help(lang = 'am') {
    const safeSupport = esc(config.supportUsername || 'Mnbvcnvhd');
    if (lang === 'en') {
      return (
        `❓ <b>Help & FAQ</b>\n\n` +
        `🛒 <b>/buy</b> — Purchase a Gemini Pro 18 Months link\n` +
        `📦 <b>/myorders</b> — View your past orders & statuses\n` +
        `🌐 <b>/language</b> — Change language (English / አማርኛ)\n` +
        `🏠 <b>/start</b> — Back to main menu\n\n` +
        `📞 <b>Direct Support:</b>\n` +
        `Reach out to @${safeSupport}\n` +
        `⏰ Available 24/7 for assistance!`
      );
    }

    return (
      `❓ <b>እርዳታ እና መረጃ</b>\n\n` +
      `🛒 <b>/buy</b> — የ Gemini Pro 18 ወራት ሊንክ ግዙ\n` +
      `📦 <b>/myorders</b> — ያለፉ ትዕዛዞችዎን ይመልከቱ\n` +
      `🌐 <b>/language</b> — ቋንቋ ይቀይሩ (አማርኛ / English)\n` +
      `🏠 <b>/start</b> — ወደ ዋና ማውጫ ይመለሱ\n\n` +
      `📞 <b>ቀጥታ ድጋፍ:</b>\n` +
      `ያነጋግሩን: @${safeSupport}\n` +
      `⏰ 24/7 ፈጣን ምላሽ እንሰጣለን!`
    );
  },

  // ─── CONTACT ───────────────────────────────────────────────
  contact(lang = 'am') {
    const safeSupport = esc(config.supportUsername || 'Mnbvcnvhd');
    if (lang === 'en') {
      return (
        `📞 <b>Contact Support</b>\n\n` +
        `For questions, support, or order verification:\n\n` +
        `👤 <b>Admin:</b> @${safeSupport}\n` +
        `⏰ <b>Support Hours:</b> 24/7 Quick Response\n\n` +
        `👇 Tap the button below to message directly:`
      );
    }

    return (
      `📞 <b>የደንበኞች ድጋፍ</b>\n\n` +
      `ለማንኛውም ጥያቄ፣ ድጋፍ ወይም የክፍያ ማረጋገጫ ጉዳይ በዚህ አድራሻ ያነጋግሩን፦\n\n` +
      `👤 <b>አድሚን / ድጋፍ:</b> @${safeSupport}\n` +
      `⏰ <b>የስራ ሰዓት:</b> 24/7 ፈጣን ምላሽ\n\n` +
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
        `💳 *Checkout Attempts:*\n` +
        `⏳ Awaiting Receipt: ${stats.awaitingCheckouts || 0}\n` +
        `✅ Completed / Ordered: ${stats.completedCheckouts || 0}\n` +
        `❌ Cancelled / Expired: ${stats.cancelledCheckouts || 0}\n` +
        `📋 Total Checkouts: ${stats.totalCheckouts || 0}\n\n` +
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
      `💳 *የክፍያ ሂደት ሙከራዎች (Checkouts):*\n` +
      `⏳ ደረሰኝ በመጠበቅ ላይ: ${stats.awaitingCheckouts || 0}\n` +
      `✅ ደረሰኝ የላኩ (ትዕዛዝ የፈጠሩ): ${stats.completedCheckouts || 0}\n` +
      `❌ የተሰረዙ / ያለፈባቸው: ${stats.cancelledCheckouts || 0}\n` +
      `📋 ጠቅላላ የክፍያ ሙከራዎች: ${stats.totalCheckouts || 0}\n\n` +
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
