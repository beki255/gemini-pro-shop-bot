// src/web/adminApi.js - Complete Admin Web REST API
const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Stock = require('../models/Stock');
const SoldStock = require('../models/SoldStock');
const Order = require('../models/Order');
const CheckoutAttempt = require('../models/CheckoutAttempt');
const settingsService = require('../services/settingsService');
const otpService = require('../services/otpService');
const productService = require('../services/productService');
const realtimeEvents = require('../services/realtimeEvents');
const msg = require('../utils/messages');
const keyboards = require('../utils/keyboard');

function createAdminRouter(bot) {
  const router = express.Router();

  // ─── Authentication Middleware ───────────────────────────
  const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    const token = authHeader.split(' ')[1];
    const session = otpService.verifySession(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }
    req.adminSession = session;
    next();
  };

  // ─── 0. Telegram WebApp HMAC Validator ────────────────────
  const crypto = require('crypto');
  function validateTelegramWebAppData(initData, botToken) {
    if (!initData) return null;
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) return null;

      params.delete('hash');
      const items = [];
      for (const [key, val] of params.entries()) {
        items.push(`${key}=${val}`);
      }
      items.sort();
      const dataCheckString = items.join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (computedHash !== hash) return null;

      const userJson = params.get('user');
      if (!userJson) return null;
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  // ─── 1. Authentication Endpoints ─────────────────────────
  // Telegram Mini App 1-Click Auto Login
  router.post('/login-telegram', async (req, res) => {
    try {
      const { initData } = req.body;
      if (!initData) {
        return res.status(400).json({ error: 'No Telegram initData provided.' });
      }

      const tgUser = validateTelegramWebAppData(initData, config.botToken);
      if (!tgUser) {
        return res.status(401).json({ error: 'Invalid Telegram WebApp authentication signature.' });
      }

      if (Number(tgUser.id) !== Number(config.adminId)) {
        return res.status(403).json({ error: 'Access denied. You are not authorized as store admin.' });
      }

      const username = tgUser.username || tgUser.first_name || 'admin';
      const token = otpService.createSession(username);
      return res.json({ success: true, token, username });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { method, code, username, password } = req.body;

      if (method === 'otp') {
        const isValid = otpService.verifyOtp(code);
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid or expired OTP code. Please get a fresh code from the bot.' });
        }
        const token = otpService.createSession('admin');
        return res.json({ success: true, token, username: 'admin' });
      }

      if (method === 'credentials') {
        const isValid = await otpService.verifyCredentials(username, password);
        if (!isValid) {
          return res.status(400).json({ error: 'Incorrect username or password.' });
        }
        const token = otpService.createSession(username);
        return res.json({ success: true, token, username });
      }

      return res.status(400).json({ error: 'Invalid login method. Use "otp" or "credentials".' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    return res.json({ authenticated: true, username: req.adminSession.username });
  });

  router.post('/logout', requireAuth, (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    otpService.destroySession(token);
    return res.json({ success: true });
  });

  // ─── 1B. Real-Time Server-Sent Events Stream (Bot -> Web Sync) ──
  router.get('/events', (req, res) => {
    const token =
      (req.query && req.query.token) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token || !otpService.verifySession(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);

    const onEvent = (evt) => {
      try {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      } catch {}
    };

    realtimeEvents.on('admin_event', onEvent);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {}
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeEvents.off('admin_event', onEvent);
    });
  });

  // ─── 2. Dashboard / Overview ─────────────────────────────
  router.get('/overview', requireAuth, async (req, res) => {
    try {
      const [
        totalOrders,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        availableStock,
        reservedStock,
        soldStock,
        totalUsers,
        awaitingCheckouts,
        recentOrders,
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'approved' }),
        Order.countDocuments({ status: 'rejected' }),
        Stock.countDocuments({ isSold: false, isReserved: false }),
        Stock.countDocuments({ isSold: false, isReserved: true }),
        SoldStock.countDocuments(),
        User.countDocuments(),
        CheckoutAttempt.countDocuments({ status: 'awaiting_receipt' }),
        Order.find().sort({ createdAt: -1 }).limit(6).lean(),
      ]);

      // Calculate total revenue from approved orders (accurate ETB vs USDT split)
      const revenueAgg = await Order.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$currency', 'USDT'] },
                    { $in: ['$paymentMethod', ['Binance', 'Bybit', 'BEP20']] },
                  ],
                },
                'USDT',
                'ETB',
              ],
            },
            total: { $sum: '$amount' },
          },
        },
      ]);

      let totalRevenueEtb = 0;
      let totalRevenueUsdt = 0;
      revenueAgg.forEach((r) => {
        if (r._id === 'USDT') totalRevenueUsdt = Number((r.total || 0).toFixed(2));
        else totalRevenueEtb += r.total || 0;
      });

      // Today's orders
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayApproved = await Order.countDocuments({
        status: 'approved',
        createdAt: { $gte: startOfToday },
      });

      return res.json({
        store: {
          isOpen: settingsService.getIsAcceptingOrders(),
          productName: config.productName,
          productPrice: config.productPrice,
          usdtRate: config.payment.usdtRate,
          usdtPrice: config.calculateUsdtPrice(),
          proofChannel: config.proofChannel.username,
        },
        counts: {
          totalOrders,
          pendingOrders,
          approvedOrders,
          rejectedOrders,
          availableStock,
          reservedStock,
          soldStock,
          totalStock: availableStock + reservedStock + soldStock,
          totalUsers,
          awaitingCheckouts,
          todayApproved,
        },
        revenue: {
          etb: totalRevenueEtb,
          usdt: totalRevenueUsdt,
        },
        recentOrders,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 2B. Detailed Statistics (Matching & Expanding Bot /stats) ──
  router.get('/stats', requireAuth, async (req, res) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const [
        totalUsers,
        newUsersToday,
        newUsers7d,
        totalOrders,
        approvedOrders,
        pendingOrders,
        rejectedOrders,
        todayApprovedOrders,
        availableStock,
        reservedStock,
        soldStockArchive,
        totalCheckouts,
        awaitingCheckouts,
        completedCheckouts,
        cancelledCheckoutsOnly,
        expiredCheckouts,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: startOfToday } }),
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Order.countDocuments(),
        Order.countDocuments({ status: 'approved' }),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'rejected' }),
        Order.countDocuments({ status: 'approved', createdAt: { $gte: startOfToday } }),
        Stock.countDocuments({ isSold: false, isReserved: false }),
        Stock.countDocuments({ isSold: false, isReserved: true }),
        SoldStock.countDocuments(),
        CheckoutAttempt.countDocuments(),
        CheckoutAttempt.countDocuments({ status: 'awaiting_receipt' }),
        CheckoutAttempt.countDocuments({ status: 'completed' }),
        CheckoutAttempt.countDocuments({ status: 'cancelled' }),
        CheckoutAttempt.countDocuments({ status: 'expired' }),
      ]);

      // Revenue & links sold grouped by payment method
      const revByMethodAgg = await Order.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: '$paymentMethod',
            orders: { $sum: 1 },
            links: { $sum: { $ifNull: ['$quantity', 1] } },
            amount: { $sum: '$amount' },
            currency: {
              $first: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$currency', 'USDT'] },
                      { $in: ['$paymentMethod', ['Binance', 'Bybit', 'BEP20']] },
                    ],
                  },
                  'USDT',
                  'ETB',
                ],
              },
            },
          },
        },
        { $sort: { orders: -1 } },
      ]);

      let totalRevenueEtb = 0;
      let totalRevenueUsdt = 0;
      let totalLinksSold = 0;
      const byMethod = revByMethodAgg.map((m) => {
        const isUsdt = m.currency === 'USDT';
        const amt = isUsdt ? Number((m.amount || 0).toFixed(2)) : (m.amount || 0);
        if (isUsdt) totalRevenueUsdt += amt;
        else totalRevenueEtb += amt;
        totalLinksSold += m.links || 0;
        return {
          method: m._id || 'Other',
          orders: m.orders || 0,
          links: m.links || 0,
          amount: amt,
          currency: isUsdt ? 'USDT' : 'ETB',
        };
      });
      totalRevenueUsdt = Number(totalRevenueUsdt.toFixed(2));

      // Today's revenue
      const todayRevAgg = await Order.aggregate([
        { $match: { status: 'approved', createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$currency', 'USDT'] },
                    { $in: ['$paymentMethod', ['Binance', 'Bybit', 'BEP20']] },
                  ],
                },
                'USDT',
                'ETB',
              ],
            },
            total: { $sum: '$amount' },
          },
        },
      ]);
      let todayRevenueEtb = 0;
      let todayRevenueUsdt = 0;
      todayRevAgg.forEach((r) => {
        if (r._id === 'USDT') todayRevenueUsdt = Number((r.total || 0).toFixed(2));
        else todayRevenueEtb += r.total || 0;
      });

      // Sales trend with configurable time range: today, 7d, 30d, 90d, all
      const rawRange = String(req.query.range || '7d').toLowerCase();
      const range = ['today', '7d', '30d', '90d', 'all'].includes(rawRange) ? rawRange : '7d';

      const trendFilter = { status: 'approved' };
      let rangeStart = new Date(startOfToday);
      if (range === 'today') {
        trendFilter.createdAt = { $gte: startOfToday };
      } else if (range === '7d') {
        rangeStart.setDate(rangeStart.getDate() - 6);
        trendFilter.createdAt = { $gte: rangeStart };
      } else if (range === '30d') {
        rangeStart.setDate(rangeStart.getDate() - 29);
        trendFilter.createdAt = { $gte: rangeStart };
      } else if (range === '90d') {
        rangeStart.setDate(rangeStart.getDate() - 89);
        trendFilter.createdAt = { $gte: rangeStart };
      }

      const rangeApproved = await Order.find(trendFilter)
        .select('amount currency paymentMethod quantity createdAt')
        .sort({ createdAt: 1 })
        .lean();

      const bucketsMap = new Map();
      const pad2 = (n) => String(n).padStart(2, '0');
      const localDateKey = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

      if (range === 'today') {
        for (let h = 0; h < 24; h += 4) {
          const key = `${pad2(h)}`;
          const fullLabel = `${pad2(h)}:00 - ${pad2(h + 4)}:00`;
          bucketsMap.set(key, { label: `${pad2(h)}h`, fullLabel, orders: 0, links: 0, etb: 0, usdt: 0 });
        }
        rangeApproved.forEach((o) => {
          const dt = new Date(o.createdAt);
          const block = Math.floor(dt.getHours() / 4) * 4;
          const bucket = bucketsMap.get(pad2(block));
          if (bucket) {
            bucket.orders += 1;
            bucket.links += o.quantity || 1;
            const isUsdt = o.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(o.paymentMethod);
            if (isUsdt) bucket.usdt = Number((bucket.usdt + (o.amount || 0)).toFixed(2));
            else bucket.etb += o.amount || 0;
          }
        });
      } else if (range === '7d' || range === '30d') {
        const totalDays = range === '7d' ? 7 : 30;
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(rangeStart);
          d.setDate(rangeStart.getDate() + i);
          const key = localDateKey(d);
          bucketsMap.set(key, { label: key.slice(5), fullLabel: key, orders: 0, links: 0, etb: 0, usdt: 0 });
        }
        rangeApproved.forEach((o) => {
          const key = localDateKey(new Date(o.createdAt));
          const bucket = bucketsMap.get(key);
          if (bucket) {
            bucket.orders += 1;
            bucket.links += o.quantity || 1;
            const isUsdt = o.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(o.paymentMethod);
            if (isUsdt) bucket.usdt = Number((bucket.usdt + (o.amount || 0)).toFixed(2));
            else bucket.etb += o.amount || 0;
          }
        });
      } else if (range === '90d') {
        // Group into 13 weekly buckets (~90 days)
        const numWeeks = 13;
        const weekStarts = [];
        for (let w = 0; w < numWeeks; w++) {
          const ws = new Date(rangeStart);
          ws.setDate(rangeStart.getDate() + w * 7);
          const we = new Date(ws);
          we.setDate(ws.getDate() + 6);
          const key = localDateKey(ws);
          weekStarts.push({ ws, key });
          bucketsMap.set(key, {
            label: key.slice(5),
            fullLabel: `${key} → ${localDateKey(we)}`,
            orders: 0,
            links: 0,
            etb: 0,
            usdt: 0,
          });
        }
        rangeApproved.forEach((o) => {
          const dt = new Date(o.createdAt);
          const diffDays = Math.floor((dt - rangeStart) / (24 * 60 * 60 * 1000));
          const wIdx = Math.max(0, Math.min(numWeeks - 1, Math.floor(diffDays / 7)));
          const bucket = bucketsMap.get(weekStarts[wIdx].key);
          if (bucket) {
            bucket.orders += 1;
            bucket.links += o.quantity || 1;
            const isUsdt = o.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(o.paymentMethod);
            if (isUsdt) bucket.usdt = Number((bucket.usdt + (o.amount || 0)).toFixed(2));
            else bucket.etb += o.amount || 0;
          }
        });
      } else {
        // 'all' — group by month from first approved order to current month
        const now = new Date();
        const firstDate = rangeApproved.length > 0 ? new Date(rangeApproved[0].createdAt) : now;
        const cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
        const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        while (cur <= endMonth) {
          const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}`;
          bucketsMap.set(key, { label: key, fullLabel: key, orders: 0, links: 0, etb: 0, usdt: 0 });
          cur.setMonth(cur.getMonth() + 1);
        }
        rangeApproved.forEach((o) => {
          const dt = new Date(o.createdAt);
          const key = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
          const bucket = bucketsMap.get(key);
          if (bucket) {
            bucket.orders += 1;
            bucket.links += o.quantity || 1;
            const isUsdt = o.currency === 'USDT' || ['Binance', 'Bybit', 'BEP20'].includes(o.paymentMethod);
            if (isUsdt) bucket.usdt = Number((bucket.usdt + (o.amount || 0)).toFixed(2));
            else bucket.etb += o.amount || 0;
          }
        });
      }

      const trendBuckets = Array.from(bucketsMap.values());
      const trendTotals = trendBuckets.reduce(
        (acc, b) => {
          acc.totalOrders += b.orders;
          acc.totalLinks += b.links;
          acc.totalEtb += b.etb;
          acc.totalUsdt = Number((acc.totalUsdt + b.usdt).toFixed(2));
          return acc;
        },
        { totalOrders: 0, totalLinks: 0, totalEtb: 0, totalUsdt: 0 }
      );

      const cancelledCheckouts = cancelledCheckoutsOnly + expiredCheckouts;
      const approvalRate = totalOrders > 0 ? Math.round((approvedOrders / totalOrders) * 100) : 0;
      const checkoutConversionRate = totalCheckouts > 0 ? Math.round((completedCheckouts / totalCheckouts) * 100) : 0;

      return res.json({
        users: {
          total: totalUsers,
          today: newUsersToday,
          last7d: newUsers7d,
        },
        orders: {
          total: totalOrders,
          approved: approvedOrders,
          pending: pendingOrders,
          rejected: rejectedOrders,
          todayApproved: todayApprovedOrders,
          totalLinksSold,
          approvalRate,
        },
        checkouts: {
          total: totalCheckouts,
          awaiting: awaitingCheckouts,
          completed: completedCheckouts,
          cancelled: cancelledCheckoutsOnly,
          expired: expiredCheckouts,
          cancelledOrExpired: cancelledCheckouts,
          conversionRate: checkoutConversionRate,
        },
        stock: {
          available: availableStock,
          reserved: reservedStock,
          sold: soldStockArchive,
          activeTotal: availableStock + reservedStock,
        },
        revenue: {
          etb: totalRevenueEtb,
          usdt: totalRevenueUsdt,
          todayEtb: todayRevenueEtb,
          todayUsdt: todayRevenueUsdt,
          byMethod,
        },
        trend: {
          range,
          ...trendTotals,
          buckets: trendBuckets,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 3. Store Status & Settings ──────────────────────────
  router.post('/store-status', requireAuth, async (req, res) => {
    try {
      const { isOpen } = req.body;
      const status = typeof isOpen === 'boolean'
        ? await settingsService.setAcceptingOrders(isOpen)
        : await settingsService.toggleAcceptingOrders();
      realtimeEvents.emitAdminEvent('settings_updated', { isOpen: status, source: 'web' });
      return res.json({ success: true, isOpen: status });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/settings/price', requireAuth, async (req, res) => {
    try {
      const { price } = req.body;
      const newPrice = await settingsService.setProductPrice(price);
      realtimeEvents.emitAdminEvent('settings_updated', { price: newPrice, source: 'web' });
      return res.json({ success: true, price: newPrice });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.post('/settings/usdt-rate', requireAuth, async (req, res) => {
    try {
      const { rate } = req.body;
      const newRate = await settingsService.setUsdtRate(rate);
      realtimeEvents.emitAdminEvent('settings_updated', { rate: newRate, source: 'web' });
      return res.json({ success: true, rate: newRate });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.post('/settings/credentials', requireAuth, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username) await otpService.setAdminUsername(username);
      if (password) await otpService.setAdminPassword(password);
      return res.json({ success: true, message: 'Admin credentials updated successfully.' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // ─── 4. Orders Management ────────────────────────────────
  router.get('/orders', requireAuth, async (req, res) => {
    try {
      const { status = 'all', search = '', page = 1, limit = 15 } = req.query;
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search) {
        const cleanSearch = String(search).trim();
        query.$or = [
          { orderId: { $regex: cleanSearch, $options: 'i' } },
          { 'userInfo.username': { $regex: cleanSearch, $options: 'i' } },
          { 'userInfo.firstName': { $regex: cleanSearch, $options: 'i' } },
        ];
        if (!isNaN(cleanSearch)) {
          query.$or.push({ userId: Number(cleanSearch) });
        }
      }

      const p = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
      const skip = (p - 1) * lim;

      const [orders, total] = await Promise.all([
        Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        Order.countDocuments(query),
      ]);

      return res.json({
        orders,
        total,
        page: p,
        totalPages: Math.ceil(total / lim) || 1,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/orders/:orderId', requireAuth, async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId }).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Fetch customer details
      const customer = await User.findOne({ telegramId: order.userId }).lean();

      // Resolve receipt image URL if receiptFileId is present
      let receiptUrl = null;
      if (order.receiptFileId) {
        try {
          const fileLink = await bot.telegram.getFileLink(order.receiptFileId);
          receiptUrl = fileLink.href;
        } catch {}
      }

      return res.json({
        order,
        customer,
        receiptUrl,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/orders/:orderId/receipt-url', requireAuth, async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId }).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (!order.receiptFileId) return res.status(404).json({ error: 'No receipt file recorded' });

      const fileLink = await bot.telegram.getFileLink(order.receiptFileId);
      return res.json({ url: fileLink.href });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Approve Order
  router.post('/orders/:orderId/approve', requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { manualLinks } = req.body; // Array or string of activation links

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'approved') {
        return res.status(400).json({ error: 'Order is already approved.' });
      }

      const neededQty = order.quantity || 1;
      let linksToDeliver = [];

      if (manualLinks && Array.isArray(manualLinks) && manualLinks.length > 0) {
        linksToDeliver = manualLinks.map((l) => String(l).trim()).filter(Boolean);
      } else if (typeof manualLinks === 'string' && manualLinks.trim()) {
        linksToDeliver = manualLinks.split('\n').map((l) => l.trim()).filter(Boolean);
      }

      const orderSlug = order.productSlug || 'gemini-pro-18m';
      const orderProductName = order.productName || config.productName;

      // If manual links were provided and meet the quantity
      if (linksToDeliver.length >= neededQty) {
        // Record as SoldStock
        for (const link of linksToDeliver) {
          await SoldStock.create({
            link,
            productSlug: orderSlug,
            description: orderProductName,
            orderId: order.orderId,
            userId: order.userId,
            buyerUsername: order.userInfo?.username || null,
            buyerName: `${order.userInfo?.firstName || ''} ${order.userInfo?.lastName || ''}`.trim(),
            amount: order.amount,
            paymentMethod: order.paymentMethod,
            processedBy: config.adminId,
          });
        }
      } else {
        // Find reserved or available stock from database for this product
        let stocks = [];
        const stockIds = order.stockIds && order.stockIds.length > 0
          ? order.stockIds
          : order.stockId ? [order.stockId] : [];

        if (stockIds.length > 0) {
          stocks = await Stock.find({ _id: { $in: stockIds } });
        }

        if (stocks.length < neededQty) {
          const linkedStocks = await Stock.find({ orderId: order._id });
          if (linkedStocks.length > 0) stocks = linkedStocks;
        }

        if (stocks.length < neededQty) {
          const remaining = neededQty - stocks.length;
          const existingIds = stocks.map((s) => s._id);
          const productStockFilter = orderSlug === 'gemini-pro-18m'
            ? { $or: [{ productSlug: 'gemini-pro-18m' }, { productSlug: { $exists: false } }, { productSlug: null }] }
            : { productSlug: orderSlug };
          const available = await Stock.find({
            _id: { $nin: existingIds },
            isSold: false,
            isReserved: false,
            ...productStockFilter,
          }).limit(remaining);
          stocks = stocks.concat(available);
        }

        if (stocks.length < neededQty) {
          return res.status(400).json({
            error: `Not enough stock in database (${stocks.length}/${neededQty} available for ${orderProductName}). Please provide manual activation links or add stock first.`,
            requiresManualLinks: true,
            availableInDb: stocks.length,
            needed: neededQty,
          });
        }

        // Archive sold stocks and remove from active Stock collection (consistent with bot)
        linksToDeliver = stocks.map((s) => s.link);
        for (const stock of stocks) {
          await SoldStock.create({
            link: stock.link,
            productSlug: orderSlug,
            description: orderProductName,
            orderId: order.orderId,
            userId: order.userId,
            buyerUsername: order.userInfo?.username || null,
            buyerName: `${order.userInfo?.firstName || ''} ${order.userInfo?.lastName || ''}`.trim(),
            amount: order.amount,
            paymentMethod: order.paymentMethod,
            processedBy: config.adminId,
          });
        }
        await Stock.deleteMany({
          $or: [
            { _id: { $in: stocks.map((s) => s._id) } },
            { orderId: order._id },
          ],
        });
      }

      // Update Order
      order.status = 'approved';
      order.deliveredLinks = linksToDeliver;
      order.deliveredLink = linksToDeliver[0];
      order.processedAt = new Date();
      order.processedBy = config.adminId;
      await order.save();

      // Send activation notification to customer via bot
      try {
        const customer = await User.findOne({ telegramId: order.userId });
        const custLang = customer && customer.language ? customer.language : 'am';
        await bot.telegram.sendMessage(
          order.userId,
          msg.orderApproved(linksToDeliver, order.orderId, custLang, order.productName),
          {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...keyboards.deliveredLinksKeyboard(linksToDeliver, custLang),
          }
        );
      } catch (sendErr) {
        console.error('Failed to send Telegram message to customer:', sendErr.message);
      }

      // Sync back to Admin's Telegram Bot message (clear pending Approve/Reject buttons!)
      await realtimeEvents.syncAdminOrderNotification(bot.telegram, order, {
        status: 'approved',
        source: 'web',
      });
      realtimeEvents.emitAdminEvent('order_updated', {
        orderId: order.orderId,
        status: 'approved',
        source: 'web',
      });

      return res.json({
        success: true,
        message: `Order ${order.orderId} approved and links delivered!`,
        deliveredLinks: linksToDeliver,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Reject Order
  router.post('/orders/:orderId/reject', requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason = 'Invalid payment receipt' } = req.body;

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'approved') {
        return res.status(400).json({ error: 'Cannot reject an already approved order.' });
      }

      // Free any reserved stocks
      const stockIds = order.stockIds && order.stockIds.length > 0
        ? order.stockIds
        : order.stockId ? [order.stockId] : [];

      if (stockIds.length > 0) {
        await Stock.updateMany(
          { _id: { $in: stockIds } },
          {
            isReserved: false,
            reservedBy: null,
            reservedAt: null,
            reservedMethod: null,
            orderId: null,
          }
        );
      }

      order.status = 'rejected';
      order.adminNote = reason;
      order.processedAt = new Date();
      order.processedBy = config.adminId;
      await order.save();

      // Notify customer
      try {
        const customer = await User.findOne({ telegramId: order.userId });
        const custLang = customer && customer.language ? customer.language : 'am';
        await bot.telegram.sendMessage(
          order.userId,
          msg.orderRejected(reason, order.orderId, custLang, order.amount, order.quantity),
          { parse_mode: 'HTML' }
        );
      } catch (sendErr) {
        console.error('Failed to notify customer on rejection:', sendErr.message);
      }

      // Sync back to Admin's Telegram Bot message (clear pending Approve/Reject buttons!)
      await realtimeEvents.syncAdminOrderNotification(bot.telegram, order, {
        status: 'rejected',
        reason,
        source: 'web',
      });
      realtimeEvents.emitAdminEvent('order_updated', {
        orderId: order.orderId,
        status: 'rejected',
        source: 'web',
      });

      return res.json({ success: true, message: `Order ${order.orderId} rejected.` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Resend Order Links
  router.post('/orders/:orderId/resend', requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const links = order.deliveredLinks && order.deliveredLinks.length > 0
        ? order.deliveredLinks
        : order.deliveredLink ? [order.deliveredLink] : [];

      if (links.length === 0) {
        return res.status(400).json({ error: 'No delivered links found on this order.' });
      }

      const customer = await User.findOne({ telegramId: order.userId });
      const custLang = customer && customer.language ? customer.language : 'am';

      await bot.telegram.sendMessage(
        order.userId,
        msg.orderApproved(links, order.orderId, custLang, order.productName),
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...keyboards.deliveredLinksKeyboard(links, custLang),
        }
      );

      return res.json({ success: true, message: `Links resent to customer ${order.userId}!` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 5. Stock Management ─────────────────────────────────
  router.get('/stocks', requireAuth, async (req, res) => {
    try {
      const { filter = 'all', search = '', page = 1, limit = 20 } = req.query;
      const query = {};

      if (filter === 'available') {
        query.isSold = false;
        query.isReserved = false;
      } else if (filter === 'reserved') {
        query.isSold = false;
        query.isReserved = true;
      } else if (filter === 'sold') {
        query.isSold = true;
      }

      if (search) {
        query.link = { $regex: String(search).trim(), $options: 'i' };
      }

      const p = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      const skip = (p - 1) * lim;

      const [stocks, total, available, reserved, sold] = await Promise.all([
        Stock.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        Stock.countDocuments(query),
        Stock.countDocuments({ isSold: false, isReserved: false }),
        Stock.countDocuments({ isSold: false, isReserved: true }),
        Stock.countDocuments({ isSold: true }),
      ]);

      return res.json({
        stocks,
        total,
        page: p,
        totalPages: Math.ceil(total / lim) || 1,
        stats: {
          available,
          reserved,
          sold,
          totalAll: available + reserved + sold,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/stocks', requireAuth, async (req, res) => {
    try {
      const { links, productSlug } = req.body;
      if (!links) return res.status(400).json({ error: 'No links provided.' });

      const productService = require('../services/productService');
      const prod = await productService.getProductBySlug(productSlug || 'gemini-pro-18m');
      const targetSlug = prod ? prod.slug : 'gemini-pro-18m';
      const targetName = prod ? prod.nameEn : config.productName;

      let list = [];
      if (Array.isArray(links)) {
        list = links.map((l) => String(l).trim()).filter(Boolean);
      } else {
        list = String(links).split('\n').map((l) => l.trim()).filter(Boolean);
      }

      let added = 0;
      const duplicates = [];

      for (const link of list) {
        try {
          await Stock.create({
            link,
            productSlug: targetSlug,
            description: targetName,
            addedBy: config.adminId,
          });
          added++;
        } catch (e) {
          if (e.code === 11000) {
            duplicates.push(link);
          }
        }
      }

      realtimeEvents.emitAdminEvent('stock_updated', { added, source: 'web' });

      return res.json({
        success: true,
        added,
        duplicateCount: duplicates.length,
        duplicates,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/stocks/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await Stock.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Stock item not found' });
      realtimeEvents.emitAdminEvent('stock_updated', { deleted: true, source: 'web' });
      return res.json({ success: true, message: 'Stock item deleted.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 6. Checkouts (Abandoned carts & Payment Attempts) ────
  router.get('/checkouts', requireAuth, async (req, res) => {
    try {
      const { status = 'all', search = '', page = 1, limit = 25 } = req.query;
      const query = {};

      if (status && status !== 'all') {
        if (status === 'awaiting' || status === 'awaiting_receipt') {
          query.status = 'awaiting_receipt';
        } else if (status === 'cancelled') {
          query.status = { $in: ['cancelled', 'expired'] };
        } else {
          query.status = status;
        }
      }

      if (search && String(search).trim()) {
        const cleanSearch = String(search).trim();
        const searchOr = [
          { orderId: { $regex: cleanSearch, $options: 'i' } },
          { paymentMethod: { $regex: cleanSearch, $options: 'i' } },
          { 'userInfo.username': { $regex: cleanSearch, $options: 'i' } },
          { 'userInfo.firstName': { $regex: cleanSearch, $options: 'i' } },
          { 'userInfo.lastName': { $regex: cleanSearch, $options: 'i' } },
        ];
        if (!isNaN(cleanSearch)) {
          searchOr.push({ userId: Number(cleanSearch) });
        }

        // Also match against fresh User profiles
        const matchedUsers = await User.find({
          $or: [
            { username: { $regex: cleanSearch, $options: 'i' } },
            { firstName: { $regex: cleanSearch, $options: 'i' } },
            { lastName: { $regex: cleanSearch, $options: 'i' } },
          ],
        })
          .select('telegramId')
          .lean();
        if (matchedUsers.length > 0) {
          searchOr.push({ userId: { $in: matchedUsers.map((u) => u.telegramId) } });
        }

        query.$or = searchOr;
      }

      const showAll = String(limit).toLowerCase() === 'all';
      const p = showAll ? 1 : Math.max(1, parseInt(page, 10) || 1);
      const lim = showAll ? 0 : Math.max(1, Math.min(500, parseInt(limit, 10) || 25));
      const skip = showAll ? 0 : (p - 1) * lim;

      let findQuery = CheckoutAttempt.find(query).sort({ createdAt: -1 });
      if (!showAll) {
        findQuery = findQuery.skip(skip).limit(lim);
      }

      const [rawCheckouts, total, countAll, countAwaiting, countCompleted, countCancelled] = await Promise.all([
        findQuery.lean(),
        CheckoutAttempt.countDocuments(query),
        CheckoutAttempt.countDocuments(),
        CheckoutAttempt.countDocuments({ status: 'awaiting_receipt' }),
        CheckoutAttempt.countDocuments({ status: 'completed' }),
        CheckoutAttempt.countDocuments({ status: { $in: ['cancelled', 'expired'] } }),
      ]);

      // Enrich checkouts with fresh User DB details fallback
      const userIds = [...new Set(rawCheckouts.map((c) => c.userId).filter(Boolean))];
      const users = userIds.length > 0 ? await User.find({ telegramId: { $in: userIds } }).lean() : [];
      const userMap = new Map(users.map((u) => [u.telegramId, u]));

      const checkouts = rawCheckouts.map((c) => {
        const u = userMap.get(c.userId);
        return {
          ...c,
          userInfo: {
            firstName: c.userInfo?.firstName || u?.firstName || '',
            lastName: c.userInfo?.lastName || u?.lastName || '',
            username: c.userInfo?.username || u?.username || null,
          },
        };
      });

      return res.json({
        checkouts,
        total,
        page: p,
        totalPages: showAll ? 1 : (Math.ceil(total / lim) || 1),
        counts: {
          all: countAll,
          awaiting: countAwaiting,
          completed: countCompleted,
          cancelled: countCancelled,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/checkouts/:id/remind', requireAuth, async (req, res) => {
    try {
      const checkout = await CheckoutAttempt.findById(req.params.id);
      if (!checkout) return res.status(404).json({ error: 'Checkout not found' });

      if (checkout.status !== 'awaiting_receipt') {
        return res.status(400).json({ error: 'This checkout is no longer active (completed or cancelled).' });
      }

      const reminderText =
        `⚠️ <b>ውድ ደንበኛችን፤</b>\n\n` +
        `እባክዎን ደንበኛችን፣ ሲስተማችን እንደሚያሳየው በአክቲቭ ትዕዛዝ (active order) ላይ ለብዙ ደቂቃዎች ቆይተዋል፤ አሁንም አክቲቭ እንደሆኑ ያሳያል። ስለዚህ እባክዎ ወይ 'Cancel Order' በማለት ትዕዛዝዎን ይሰርዙ፣ ወይም ክፍያውን ከፍለው ትዕዛዝዎን ያጠናቁና አገልግሎቱ ወዲያውኑ ይላክልዎታል።\n\n` +
        `—————————————————————\n` +
        `Dear customer, our system shows that you've been on an active order for quite a few minutes. Please either cancel the order, or complete the payment so we can deliver it to you right away.`;

      const customerKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📸 ደረሰኝ (Screenshot) ላክ',
                callback_data: 'prompt_send_receipt',
              },
              {
                text: '❌ ትዕዛዝ ሰርዝ (Cancel Order)',
                callback_data: 'cancel',
              },
            ],
            [
              {
                text: `💬 አድሚኑን አግኝ (@${config.supportUsername || 'Mnbvcnvhd'})`,
                url: `https://t.me/${String(config.supportUsername || 'Mnbvcnvhd').replace(/^@+/, '')}`,
              },
            ],
          ],
        },
      };

      await bot.telegram.sendMessage(checkout.userId, reminderText, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...customerKeyboard,
      });

      checkout.remindersCount = (checkout.remindersCount || 0) + 1;
      checkout.lastReminderAt = new Date();
      await checkout.save();

      return res.json({ success: true, message: 'Reminder sent to customer!' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 7. Customer / Users Management ──────────────────────
  router.get('/users', requireAuth, async (req, res) => {
    try {
      const { search = '', page = 1, limit = 15 } = req.query;
      const query = {};

      if (search) {
        const cleanSearch = String(search).trim();
        query.$or = [
          { username: { $regex: cleanSearch, $options: 'i' } },
          { firstName: { $regex: cleanSearch, $options: 'i' } },
          { lastName: { $regex: cleanSearch, $options: 'i' } },
        ];
        if (!isNaN(cleanSearch)) {
          query.$or.push({ telegramId: Number(cleanSearch) });
        }
      }

      const p = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
      const skip = (p - 1) * lim;

      const [users, total] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        User.countDocuments(query),
      ]);

      return res.json({
        users,
        total,
        page: p,
        totalPages: Math.ceil(total / lim) || 1,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/users/:telegramId', requireAuth, async (req, res) => {
    try {
      const telegramId = Number(req.params.telegramId);
      const user = await User.findOne({ telegramId }).lean();
      if (!user) return res.status(404).json({ error: 'User not found' });

      const orders = await Order.find({ userId: telegramId }).sort({ createdAt: -1 }).lean();

      return res.json({ user, orders });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Direct Message (DM) to User
  router.post('/users/:telegramId/dm', requireAuth, async (req, res) => {
    try {
      const telegramId = Number(req.params.telegramId);
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }

      const formatted = `💬 <b>ከአስተዳዳሪው የተላከ መልዕክት:</b>\n\n${message.trim()}`;
      await bot.telegram.sendMessage(telegramId, formatted, { parse_mode: 'HTML' });

      return res.json({ success: true, message: `DM sent to ${telegramId}!` });
    } catch (err) {
      return res.status(500).json({ error: `Failed to send DM: ${err.message}` });
    }
  });

  // ─── 8. Broadcast & Proof Channel Post ───────────────────
  router.post('/broadcast', requireAuth, async (req, res) => {
    try {
      const { message, buttonText, buttonUrl } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Broadcast message cannot be empty.' });
      }

      const users = await User.find({ isBlocked: false }).select('telegramId').lean();
      let sent = 0;
      let failed = 0;

      const extra = { parse_mode: 'HTML' };
      if (buttonText && buttonUrl) {
        extra.reply_markup = {
          inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
        };
      }

      // Fire in background batches
      for (const u of users) {
        try {
          await bot.telegram.sendMessage(u.telegramId, message.trim(), extra);
          sent++;
          await new Promise((r) => setTimeout(r, 50)); // rate limit protection
        } catch {
          failed++;
        }
      }

      return res.json({
        success: true,
        total: users.length,
        sent,
        failed,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/channel-post', requireAuth, async (req, res) => {
    try {
      const { text } = req.body;
      const channel = config.proofChannel.username;
      if (!channel) {
        return res.status(400).json({ error: 'Proof channel not configured in .env' });
      }

      const botMe = await bot.telegram.getMe();
      const buyUrl = `https://t.me/${botMe.username}?start=buy`;

      const extra = {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 አሁኑኑ ይዘዙ (Buy Now)', url: buyUrl }],
          ],
        },
      };

      const defaultText = text && text.trim() ? text.trim() : (
        `🔥 <b>Gemini Pro 18 Months አክቲቬሽን በታላቅ ቅናሽ!</b>\n\n` +
        `✅ 18 ወራት ሙሉ አገልግሎት\n` +
        `✅ 2TB Cloud Storage\n` +
        `✅ የላቀ AI አቅም (Gemini Advanced)\n` +
        `💰 ዋጋ: <b>${config.productPrice} ብር</b> ብቻ!\n\n` +
        `👉 ከታች ባለው አዝራር በቦቱ በደቂቃዎች ውስጥ ይዘዙ!`
      );

      await bot.telegram.sendMessage(channel, defaultText, extra);

      return res.json({ success: true, message: `Post published to channel ${channel}!` });
    } catch (err) {
      return res.status(500).json({ error: `Failed to post to channel: ${err.message}` });
    }
  });

  // ─── 9. Products / Services Management (Web-Only Admin) ───
  router.get('/products', requireAuth, async (req, res) => {
    try {
      const products = await productService.getAllProducts();
      const stockCountsAgg = await Stock.aggregate([
        { $match: { isSold: false, isReserved: false } },
        {
          $group: {
            _id: { $ifNull: ['$productSlug', 'gemini-pro-18m'] },
            count: { $sum: 1 },
          },
        },
      ]);
      const stockMap = new Map(stockCountsAgg.map((s) => [s._id, s.count]));

      const enriched = products.map((p) => {
        const { imageData, ...rest } = p;
        return {
          ...rest,
          hasUploadedImage: Boolean(imageData),
          previewImageUrl: productService.getProductImagePreviewUrl(p),
          usdtPrice: productService.getUsdtPrice(p),
          availableStock: stockMap.get(p.slug) || 0,
        };
      });

      return res.json({
        products: enriched,
        usdtRate: config.payment.usdtRate || 195,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/products', requireAuth, async (req, res) => {
    try {
      const created = await productService.createProduct(req.body || {});
      const { imageData, ...rest } = created;
      return res.json({
        success: true,
        product: {
          ...rest,
          hasUploadedImage: Boolean(imageData),
          previewImageUrl: productService.getProductImagePreviewUrl(created),
          usdtPrice: productService.getUsdtPrice(created),
          availableStock: 0,
        },
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.put('/products/:id', requireAuth, async (req, res) => {
    try {
      const updated = await productService.updateProduct(req.params.id, req.body || {});
      const { imageData, ...rest } = updated;
      return res.json({
        success: true,
        product: {
          ...rest,
          hasUploadedImage: Boolean(imageData),
          previewImageUrl: productService.getProductImagePreviewUrl(updated),
          usdtPrice: productService.getUsdtPrice(updated),
        },
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.patch('/products/:id/toggle', requireAuth, async (req, res) => {
    try {
      const { field } = req.body || {};
      const products = await productService.getAllProducts();
      const target = products.find((p) => String(p._id) === String(req.params.id));
      if (!target) return res.status(404).json({ error: 'Product not found.' });

      const key = field === 'isInStock' ? 'isInStock' : 'isActive';
      const updated = await productService.updateProduct(req.params.id, {
        [key]: !target[key],
      });
      return res.json({ success: true, product: updated });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.delete('/products/:id', requireAuth, async (req, res) => {
    try {
      await productService.deleteProduct(req.params.id);
      return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createAdminRouter };
