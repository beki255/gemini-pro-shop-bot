// src/services/saleProofService.js - Manual Social Proof Channel Poster (Bot + Web Admin)
const config = require('../config');
const productService = require('./productService');

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatSaleProof(product, quantity = 1, format = 'both') {
  const prod = product || productService.getDefaultProductSync();
  const qty = Math.max(1, Math.min(500, parseInt(quantity, 10) || 1));
  const emoji = escHtml(prod.emoji || '💎');
  const nameEn = escHtml(prod.nameEn || config.productName || 'Gemini Pro 18 Months');
  const nameAm = escHtml(prod.nameAm || prod.nameEn || config.productName || 'Gemini Pro 18 ወራት');
  const fmt = ['en', 'am', 'both'].includes(format) ? format : 'both';

  let text = '';
  let buttonText = '';

  if (fmt === 'en') {
    text = `🛒 Someone just bought <b>${qty}× ${emoji} ${nameEn}</b>!`;
    buttonText = '🛍️ Buy Now';
  } else if (fmt === 'am') {
    text = `🛒 አንድ ደንበኛ <b>${qty}× ${emoji} ${nameAm}</b> አሁን ገዝቷል!`;
    buttonText = '🛍️ አሁን ግዛ';
  } else {
    text =
      `🛒 Someone just bought <b>${qty}× ${emoji} ${nameEn}</b>!\n` +
      `🛒 አንድ ደንበኛ <b>${qty}× ${emoji} ${nameAm}</b> አሁን ገዝቷል!`;
    buttonText = '🛍️ Buy Now / አሁን ግዛ';
  }

  return { text, buttonText, qty, format: fmt, product: prod };
}

async function publishSaleProof(telegram, productSlug, quantity = 1, format = 'both') {
  const channel = config.proofChannel?.username;
  if (!channel) {
    throw new Error('Proof channel username is not configured.');
  }

  const product = await productService.getProductBySlug(productSlug);
  const { text, buttonText, qty, format: fmt } = formatSaleProof(product, quantity, format);

  const botMe = await telegram.getMe();
  const buyUrl = product?.slug
    ? `https://t.me/${botMe.username}?start=prod_${product.slug}`
    : `https://t.me/${botMe.username}?start=buy`;

  const sent = await telegram.sendMessage(channel, text, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, url: buyUrl }]],
    },
  });

  return {
    success: true,
    channel,
    messageId: sent?.message_id || null,
    text,
    buttonText,
    buyUrl,
    quantity: qty,
    format: fmt,
    productName: product?.nameEn || config.productName,
  };
}

async function autoPublishForApprovedOrder(telegram, order) {
  if (!telegram || !order) return null;
  try {
    const settingsService = require('./settingsService');
    if (!settingsService.getAutoSaleProof()) return null;
    const format = settingsService.getAutoSaleProofFormat();
    const res = await publishSaleProof(
      telegram,
      order.productSlug || 'gemini-pro-18m',
      order.quantity || 1,
      format
    );
    console.log(`📢 Auto sale proof posted to ${res.channel} for order ${order.orderId}`);
    return res;
  } catch (err) {
    console.error(`⚠️ Auto sale proof failed for order ${order?.orderId}:`, err.message);
    return null;
  }
}

module.exports = {
  formatSaleProof,
  publishSaleProof,
  autoPublishForApprovedOrder,
};
