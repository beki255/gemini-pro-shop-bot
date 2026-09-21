// scripts/seed.js - Seed sample stock into MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../src/models/Stock');

const sampleLinks = [
  'https://one.google.com/explore-plan/gemini-advanced-promo-18m-001',
  'https://one.google.com/explore-plan/gemini-advanced-promo-18m-002',
  'https://one.google.com/explore-plan/gemini-advanced-promo-18m-003',
  'https://one.google.com/explore-plan/gemini-advanced-promo-18m-004',
  'https://one.google.com/explore-plan/gemini-advanced-promo-18m-005',
];

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI is not set in .env');
      process.exit(1);
    }

    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    let addedCount = 0;
    for (const link of sampleLinks) {
      const existing = await Stock.findOne({ link });
      if (!existing) {
        await Stock.create({
          link,
          description: 'Gemini Pro 18 Months (Sample)',
          isSold: false,
          isReserved: false,
          addedBy: parseInt(process.env.ADMIN_ID) || 8504296767,
        });
        addedCount++;
        console.log(`➕ Added: ${link}`);
      } else {
        console.log(`ℹ️ Already exists: ${link}`);
      }
    }

    const totalStock = await Stock.countDocuments({ isSold: false });
    console.log(`\n🎉 Done! Added ${addedCount} new sample links.`);
    console.log(`📦 Total available stock in database: ${totalStock}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error during seed:', error.message);
    process.exit(1);
  }
}

seed();
