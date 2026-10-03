// src/services/subscriptionService.js - Mandatory Proof Channel Subscription Verifier
const config = require('../config');
const User = require('../models/User');
const keyboards = require('../utils/keyboard');
const msg = require('../utils/messages');

// In-memory cache for subscribed users: userId -> expiration timestamp (ms)
const verifiedCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Checks whether a given user is currently a member/admin/creator of the proof channel.
 * Uses an in-memory cache to prevent excessive Telegram API calls during rapid browsing.
 *
 * @param {object} telegram - Telegraf telegram instance (ctx.telegram)
 * @param {number} userId - Telegram user ID
 * @param {boolean} bypassCache - Set to true to force a fresh Telegram API call (e.g. on manual verification)
 * @returns {Promise<boolean>}
 */
async function isUserSubscribed(telegram, userId, bypassCache = false) {
  // 1. Admin is ALWAYS exempt from force-subscription checks
  if (userId === config.adminId) {
    return true;
  }

  // 2. Check cache if bypassCache is false
  if (!bypassCache) {
    const expiresAt = verifiedCache.get(userId);
    if (expiresAt && expiresAt > Date.now()) {
      return true;
    }
  }

  const rawUsername = config.proofChannel?.username || '@gemini_pro_shop_proof';
  const channelChatId = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

  try {
    const member = await telegram.getChatMember(channelChatId, userId);
    const validStatuses = ['creator', 'administrator', 'member'];
    let isMember = validStatuses.includes(member.status);

    if (member.status === 'restricted' && member.is_member) {
      isMember = true;
    }

    if (isMember) {
      verifiedCache.set(userId, Date.now() + CACHE_TTL_MS);
      // Prune old cache entries if map exceeds 2,000 items
      if (verifiedCache.size > 2000) {
        const now = Date.now();
        for (const [id, exp] of verifiedCache.entries()) {
          if (exp < now) verifiedCache.delete(id);
        }
      }
      return true;
    }

    // Explicitly not a member
    verifiedCache.delete(userId);
    return false;
  } catch (err) {
    const errorDesc = (err.description || err.message || '').toLowerCase();

    // Normal non-member responses from Telegram:
    // e.g. "Bad Request: user not found", "USER_NOT_PARTICIPANT", "participant_id_invalid"
    if (
      errorDesc.includes('user not found') ||
      errorDesc.includes('user_not_participant') ||
      errorDesc.includes('participant') ||
      errorDesc.includes('not a member')
    ) {
      verifiedCache.delete(userId);
      return false;
    }

    // Permission / Configuration errors:
    // If the bot hasn't been added as an admin yet to the channel, Telegram returns
    // "chat not found", "need administrator rights", "bot is not a member", etc.
    if (
      errorDesc.includes('chat not found') ||
      errorDesc.includes('administrator') ||
      errorDesc.includes('rights') ||
      errorDesc.includes('forbidden') ||
      errorDesc.includes('bot is not a member')
    ) {
      console.warn(
        `🚨 [Proof Channel Alert] Bot cannot access channel ${channelChatId}: ${err.message}. ` +
          `Make sure the bot has been added as an ADMINISTRATOR in channel ${channelChatId}!`
      );
      // Fail-open for configuration errors to avoid locking out the entire store before admin setup
      return true;
    }

    // Any other transient network glitch
    console.error(`⚠️ [Subscription Check] getChatMember warning for ${userId}:`, err.message);
    return false;
  }
}

/**
 * Sends or edits the message requiring the user to join the proof channel.
 *
 * @param {object} ctx - Telegraf context
 * @param {string|null} lang - User's chosen language ('am' / 'en' / null)
 */
async function sendForceJoinMessage(ctx, lang = null) {
  let userLang = lang;
  if (!userLang && ctx.from) {
    const user = await User.findOne({ telegramId: ctx.from.id }).select('language');
    userLang = user?.language || null;
  }

  const channelLink = config.proofChannel?.link || 'https://t.me/gemini_pro_shop_proof';
  const channelUsername = config.proofChannel?.username || '@gemini_pro_shop_proof';
  const text = msg.forceJoinChannel(channelUsername, userLang);
  const kb = keyboards.forceJoinChannel(channelLink, userLang || 'am');

  // If callback query from a non-photo message, try editMessageText
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    if (!ctx.callbackQuery.message.photo) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...kb,
        });
      } catch (err) {
        if (err.description?.includes('message is not modified')) {
          return;
        }
      }
    }
  }

  // Otherwise reply cleanly
  return ctx.reply(text, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...kb,
  });
}

/**
 * Handles the 'verify_channel_joined' callback query when a user clicks
 * [ ✅ ተቀላቅያለሁ (አረጋግጥ) ].
 *
 * @param {object} ctx - Telegraf context
 */
async function handleVerifyChannelJoined(ctx) {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId });
  const lang = user && user.language ? user.language : 'am';
  const isEn = lang === 'en';

  // Force live check against Telegram Bot API (bypassCache: true)
  const isSubscribed = await isUserSubscribed(ctx.telegram, userId, true);

  if (!isSubscribed) {
    const alertMsg = isEn
      ? '⚠️ You have not joined our channel yet! Please click "📢 Join Channel" first, then click "✅ I Have Joined".'
      : '⚠️ እስካሁን ቻናሉን አልተቀላቀሉም! እባክዎ መጀመሪያ «📢 ቻናሉን ተቀላቀል» የሚለውን ተጭነው ይቀላቀሉ፤ ከዚያ «✅ ተቀላቅያለሁ» የሚለውን ይጫኑ።';
    return ctx.answerCbQuery(alertMsg, { show_alert: true });
  }

  // Success: membership confirmed
  const successMsg = isEn
    ? '✅ Thank you! Channel membership verified. Welcome to Gemini Pro Shop!'
    : '✅ እናመሰግናለን! አባልነትዎ ተረጋግጧል። ወደ Gemini Pro Shop እንኳን ደህና መጡ!';

  await ctx.answerCbQuery(successMsg, { show_alert: false }).catch(() => {});

  // Cleanly remove the force-join message if possible
  try {
    await ctx.deleteMessage().catch(() => {});
  } catch {}

  // Route to start flow (shows language selection if new, or Main Menu if existing)
  const userHandlers = require('../handlers/userHandlers');
  return userHandlers.handleStart(ctx);
}

module.exports = {
  isUserSubscribed,
  sendForceJoinMessage,
  handleVerifyChannelJoined,
};
