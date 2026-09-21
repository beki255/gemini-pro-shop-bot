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
