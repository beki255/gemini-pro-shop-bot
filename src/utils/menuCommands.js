// src/utils/menuCommands.js - Dynamic Language-Specific Menu Commands
const config = require('../config');

const commands = {
  customer: {
    am: [
      { command: 'start', description: '🏠 ዋና ማውጫ' },
      { command: 'buy', description: '🛒 ምርት ግዛ' },
      { command: 'myorders', description: '📦 የኔ ትዕዛዞች' },
      { command: 'language', description: '🌐 ቋንቋ ቀይር' },
      { command: 'help', description: '❓ እርዳታ' },
      { command: 'contact', description: '📞 አግኙን' },
    ],
    en: [
      { command: 'start', description: '🏠 Main Menu' },
      { command: 'buy', description: '🛒 Buy Gemini Pro' },
      { command: 'myorders', description: '📦 My Orders' },
      { command: 'language', description: '🌐 Change Language' },
      { command: 'help', description: '❓ Help & FAQ' },
      { command: 'contact', description: '📞 Contact Support' },
    ],
  },
  admin: {
    am: [
      { command: 'start', description: '🏠 ዋና ማውጫ' },
      { command: 'stock', description: '📦 የስቶክ ሁኔታ' },
      { command: 'orders', description: '📋 የትዕዛዞች ዝርዝር' },
      { command: 'stats', description: '📊 ስታቲስቲክስ እና ገቢ' },
      { command: 'addstock', description: '➕ ስቶክ ጨምር' },
      { command: 'setprice', description: '💰 ዋጋ ቀይር' },
      { command: 'broadcast', description: '📢 ማስታወቂያ ላክ' },
      { command: 'language', description: '🌐 ቋንቋ ቀይር' },
    ],
    en: [
      { command: 'start', description: '🏠 Main Menu' },
      { command: 'stock', description: '📦 Stock Status' },
      { command: 'orders', description: '📋 Orders List' },
      { command: 'stats', description: '📊 Statistics & Revenue' },
      { command: 'addstock', description: '➕ Add Stock' },
      { command: 'setprice', description: '💰 Change Price' },
      { command: 'broadcast', description: '📢 Broadcast Announcement' },
      { command: 'language', description: '🌐 Change Language' },
    ],
  },
};

/**
 * Dynamically updates the blue Telegram Menu button for a specific user in their chosen language
 */
async function updateUserMenuCommands(telegram, userId, lang = 'am') {
  const isAdmin = userId === config.adminId;
  const list = isAdmin
    ? (lang === 'en' ? commands.admin.en : commands.admin.am)
    : (lang === 'en' ? commands.customer.en : commands.customer.am);

  try {
    await telegram.setMyCommands(list, {
      scope: { type: 'chat', chat_id: userId },
    });
    console.log(`✅ Updated Menu commands for user ${userId} to ${lang.toUpperCase()}`);
  } catch (err) {
    console.error(`Failed to update menu for user ${userId}:`, err.message);
  }
}

/**
 * Sets default fallbacks on bot startup
 */
async function initGlobalMenuCommands(telegram) {
  try {
    // 1. Default Amharic
    await telegram.setMyCommands(commands.customer.am);

    // 2. English Telegram Client fallback
    await telegram.setMyCommands(commands.customer.en, { language_code: 'en' });

    // 3. Admin Default
    if (config.adminId) {
      await telegram.setMyCommands(commands.admin.am, {
        scope: { type: 'chat', chat_id: config.adminId },
      });
    }
    console.log('✅ Global Menu commands initialized cleanly!');
  } catch (err) {
    console.error('Failed to init global menu commands:', err.message);
  }
}

module.exports = {
  commands,
  updateUserMenuCommands,
  initGlobalMenuCommands,
};
