// scripts/resetLang.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await User.updateMany({}, { language: null });
  console.log('RESET RESULT:', result);
  const users = await User.find();
  console.log('CURRENT USERS IN DB:', users.map(u => ({ id: u.telegramId, lang: u.language })));
  await mongoose.disconnect();
}

reset();
