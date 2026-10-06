// src/config.js - Configuration Loader
require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  adminId: parseInt(process.env.ADMIN_ID),
  mongodbUri: process.env.MONGODB_URI,
  productName: process.env.PRODUCT_NAME || 'Gemini Pro 18 Months',
  productPrice: parseInt(process.env.PRODUCT_PRICE) || 250,
  port: parseInt(process.env.PORT) || 3000,
  botUsername: process.env.BOT_USERNAME || 'Mnbvcnvhd',
  supportUsername: process.env.SUPPORT_USERNAME || process.env.BOT_USERNAME || 'Mnbvcnvhd',
  payment: {
    cbe: {
      account: process.env.CBE_ACCOUNT || '1000311621576',
      name: process.env.CBE_NAME || 'bereket s/maryiam',
    },
    telebirr: {
      account: process.env.TELEBIRR_ACCOUNT || '0925537199',
      name: process.env.TELEBIRR_NAME || 'bereket',
    },
    binance: {
      id: process.env.BINANCE_ID || '1225194839',
      payId: process.env.BINANCE_ID || '1225194839',
      name: 'Binance Pay',
    },
    bybit: {
      id: process.env.BYBIT_ID || '464108781',
      uid: process.env.BYBIT_ID || '464108781',
      name: 'Bybit',
    },
    bep20: {
      address: process.env.BEP20_ADDRESS || '0x7cde540b6b914483cb2e31e76eafb42f9c717e4b',
      network: 'BNB Smart Chain (BEP20)',
    },
    usdtRate: parseInt(process.env.USDT_RATE, 10) || 195,
  },
  // Dynamic calculation: ETB price / rate rounded up to nearest 0.05
  // Example: 250 / 195 = 1.282... -> 1.30 USDT
  // Example: 300 / 195 = 1.538... -> 1.55 USDT
  calculateUsdtPrice(etbPrice = null, customRate = null) {
    const price = etbPrice !== null ? etbPrice : config.productPrice;
    const rate = customRate !== null ? customRate : config.payment.usdtRate;
    const raw = price / (rate || 195);
    const rounded = Math.ceil(raw * 20) / 20;
    return Number(rounded.toFixed(2));
  },
  proofChannel: {
    username: process.env.PROOF_CHANNEL_USERNAME || '@gemini_pro_shop_proof',
    link: process.env.PROOF_CHANNEL_LINK || 'https://t.me/gemini_pro_shop_proof',
  },
};

// Validate required fields
function validateConfig() {
  const required = ['BOT_TOKEN', 'ADMIN_ID', 'MONGODB_URI'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

validateConfig();
module.exports = config;
