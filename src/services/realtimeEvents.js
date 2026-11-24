// src/services/realtimeEvents.js - Bidirectional Real-Time Sync Hub (Bot <-> Web Admin)
const EventEmitter = require('events');
const config = require('../config');
const User = require('../models/User');

class RealtimeSyncService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Broadcast a live event to all connected Web Admin SSE clients
   */
  emitAdminEvent(type, payload = {}) {
    this.emit('admin_event', {
      type,
      ...payload,
      ts: Date.now(),
    });
  }

  /**
   * Safe HTML escape helper
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Update the admin's Telegram notification message for an order so
   * Approve / Reject buttons disappear immediately whether processed via Web or Bot!
   */
  async syncAdminOrderNotification(telegram, order, options = {}) {
    if (!telegram || !config.adminId || !order) return false;
    const msgId = order.adminNotificationMessageId;
    if (!msgId) return false;

    const { status = order.status, reason = order.adminNote, source = 'web' } = options;

    try {
      let firstName = order.userInfo?.firstName || '';
      let lastName = order.userInfo?.lastName || '';
      let username = order.userInfo?.username || '';
      if (!firstName || !username) {
        const dbUser = await User.findOne({ telegramId: order.userId }).lean().catch(() => null);
        if (dbUser) {
          if (!firstName) firstName = dbUser.firstName || '';
          if (!lastName) lastName = dbUser.lastName || '';
          if (!username) username = dbUser.username || '';
        }
      }

      const fullName = `${firstName} ${lastName}`.trim() || 'ስም የለም';
      const displayUsername = username ? `@${username}` : 'የለውም';
      const isCrypto = order.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(order.paymentMethod);
      const currLabel = isCrypto ? 'USDT' : 'ብር';
      const prodName = order.productName || config.productName || 'Gemini Pro 18 Months';
      const viaLabel = source === 'web' ? ' (በWeb Admin)' : '';

      let caption = '';
      if (status === 'approved') {
        const links =
          order.deliveredLinks && order.deliveredLinks.length > 0
            ? order.deliveredLinks
            : order.deliveredLink
            ? [order.deliveredLink]
            : [];
        caption =
          `✅ <b>ተፈቅዷል!${viaLabel} (${links.length || order.quantity || 1}) ወደ ደንበኛው ተልኳል</b>\n\n` +
          `🔢 ትዕዛዝ: <code>${this.escapeHtml(order.orderId)}</code>\n` +
          `🛍️ ምርት: <b>${this.escapeHtml(prodName)}</b>\n` +
          `👤 ስም: <b>${this.escapeHtml(fullName)}</b>\n` +
          `🔗 ዩዘርኔም: <b>${this.escapeHtml(displayUsername)}</b>\n` +
          `🆔 Telegram ID: <code>${order.userId}</code>\n` +
          `📦 ብዛት: <b>${order.quantity || 1}</b>\n` +
          `💰 መጠን: <b>${order.amount} ${currLabel}</b>`;
        if (links.length === 1) {
          caption += `\n🔗 <b>የተላከ:</b> <code>${this.escapeHtml(links[0])}</code>`;
        }
      } else if (status === 'rejected') {
        caption =
          `❌ <b>ትዕዛዝ ${this.escapeHtml(order.orderId)} ውድቅ ተደርጓል${viaLabel}</b>\n\n` +
          `🛍️ ምርት: <b>${this.escapeHtml(prodName)}</b>\n` +
          `👤 ስም: <b>${this.escapeHtml(fullName)}</b>\n` +
          `🔗 ዩዘርኔም: <b>${this.escapeHtml(displayUsername)}</b>\n` +
          `🆔 Telegram ID: <code>${order.userId}</code>\n` +
          `📦 ብዛት: <b>${order.quantity || 1}</b>\n` +
          `💰 መጠን: <b>${order.amount} ${currLabel}</b>\n` +
          `📝 ምክንያት: <i>${this.escapeHtml(reason || 'Invalid receipt')}</i>`;
      } else {
        return false;
      }

      // Edit caption AND clear all pending Approve/Reject buttons!
      try {
        await telegram.editMessageCaption(config.adminId, msgId, undefined, caption, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        });
        return true;
      } catch (capErr) {
        if (capErr.description && capErr.description.includes('message is not modified')) {
          return true;
        }
        // Fallback: try editMessageText (if text notification) or clear reply markup
        try {
          await telegram.editMessageText(config.adminId, msgId, undefined, caption, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
          return true;
        } catch {
          await telegram.editMessageReplyMarkup(config.adminId, msgId, undefined, { inline_keyboard: [] }).catch(() => {});
          return false;
        }
      }
    } catch (err) {
      console.error(`Failed to sync admin Telegram message for ${order.orderId}:`, err.message);
      return false;
    }
  }

  /**
   * Update the admin's Telegram checkout-started alert when the checkout
   * is completed, cancelled, or expired so stale Remind buttons are cleared!
   */
  async syncAdminCheckoutAlert(telegram, attempt, newStatus = null) {
    if (!telegram || !config.adminId || !attempt || !attempt.adminAlertMessageId) return false;
    const st = newStatus || attempt.status;
    if (st === 'awaiting_receipt') return false;

    const statusLine =
      st === 'completed'
        ? `✅ <b>ደረሰኝ ልኳል (Completed${attempt.orderId ? ` · ${this.escapeHtml(attempt.orderId)}` : ''})</b>`
        : st === 'cancelled'
        ? `❌ <b>በደንበኛው ተሰርዟል (Cancelled)</b>`
        : `⏱️ <b>ጊዜው አልፏል (Expired)</b>`;

    const fullName = `${attempt.userInfo?.firstName || ''} ${attempt.userInfo?.lastName || ''}`.trim() || `User ${attempt.userId}`;
    const prodName = attempt.productName || config.productName || 'Gemini Pro 18 Months';
    const isCrypto = attempt.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(attempt.paymentMethod);
    const currLabel = isCrypto ? 'USDT' : 'ብር';

    const updatedText =
      `${statusLine}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🛍️ <b>ምርት:</b> <b>${this.escapeHtml(prodName)}</b>\n` +
      `👤 <b>ደንበኛ:</b> <b>${this.escapeHtml(fullName)}</b> (<code>${attempt.userId}</code>)\n` +
      `💳 <b>ክፍያ:</b> ${this.escapeHtml(attempt.paymentMethod)} · <b>${attempt.amount} ${currLabel}</b> (${attempt.quantity || 1}x)`;

    try {
      await telegram.editMessageText(config.adminId, attempt.adminAlertMessageId, undefined, updatedText, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [] },
      });
      return true;
    } catch {
      await telegram.editMessageReplyMarkup(config.adminId, attempt.adminAlertMessageId, undefined, { inline_keyboard: [] }).catch(() => {});
      return false;
    }
  }
}

module.exports = new RealtimeSyncService();
