// src/services/reservationService.js - 30-minute stock reservation & auto-expiry manager
const Stock = require('../models/Stock');
const User = require('../models/User');
const keyboards = require('../utils/keyboard');

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

class ReservationService {
  /**
   * Get current available (unreserved) stock count
   */
  async getAvailableStockCount() {
    await this.expireStaleReservations();
    return await Stock.countDocuments({ isSold: false, isReserved: false });
  }

  /**
   * Atomically reserve multiple available stock items for a user for 5 minutes
   */
  async reserveStock(userId, method, quantity = 1) {
    // 1. Release any prior abandoned reservation by this user
    await this.releaseReservation(userId);

    // 2. Also expire any stale reservations across the board
    await this.expireStaleReservations();

    const qty = Math.max(1, parseInt(quantity) || 1);

    // 3. Find available items
    const availableItems = await Stock.find({ isSold: false, isReserved: false }).limit(qty);
    if (availableItems.length < qty) {
      return null;
    }

    const ids = availableItems.map((item) => item._id);
    const updateResult = await Stock.updateMany(
      { _id: { $in: ids }, isSold: false, isReserved: false },
      {
        $set: {
          isReserved: true,
          reservedAt: new Date(),
          reservedBy: userId,
          reservedMethod: method,
        },
      }
    );

    // If concurrent requests raced and acquired some items, rollback and return null
    if (updateResult.modifiedCount < qty) {
      await Stock.updateMany(
        { _id: { $in: ids }, reservedBy: userId, isSold: false, orderId: null },
        {
          $set: {
            isReserved: false,
            reservedAt: null,
            reservedBy: null,
            reservedMethod: null,
          },
        }
      );
      return null;
    }

    return availableItems;
  }

  /**
   * Release reservation for a specific user
   */
  async releaseReservation(userId) {
    if (!userId) return;
    await Stock.updateMany(
      { reservedBy: userId, isSold: false, isReserved: true, orderId: null },
      {
        $set: {
          isReserved: false,
          reservedAt: null,
          reservedBy: null,
          reservedMethod: null,
        },
      }
    );
  }

  /**
   * Expire reservations older than 5 minutes and notify the user
   */
  async expireStaleReservations(bot = null) {
    try {
      const cutoff = new Date(Date.now() - EXPIRY_MS);
      const expiredStocks = await Stock.find({
        isSold: false,
        isReserved: true,
        orderId: null, // only expire if no order has been formally placed with receipt
        reservedAt: { $lt: cutoff },
      });

      // 1. Check for orphaned reservations where order was deleted from DB
      const Order = require('../models/Order');
      const reservedWithOrder = await Stock.find({
        isSold: false,
        isReserved: true,
        orderId: { $ne: null },
      });
      for (const stock of reservedWithOrder) {
        const orderExists = await Order.findById(stock.orderId);
        if (!orderExists || orderExists.status === 'rejected' || orderExists.status === 'cancelled') {
          stock.isReserved = false;
          stock.reservedAt = null;
          stock.reservedBy = null;
          stock.reservedMethod = null;
          stock.orderId = null;
          await stock.save();
        }
      }

      // Expire stale checkout attempts older than 30 minutes
      try {
        const CheckoutAttempt = require('../models/CheckoutAttempt');
        await CheckoutAttempt.updateMany(
          {
            status: 'awaiting_receipt',
            createdAt: { $lt: cutoff },
          },
          {
            $set: {
              status: 'expired',
              expiredAt: new Date(),
            },
          }
        );
      } catch (errAtt) {
        console.error('Error expiring stale checkout attempts:', errAtt.message);
      }

      if (expiredStocks.length === 0) return;

      // Group by user so we send 1 notification per user
      const usersToNotify = new Set();
      for (const stock of expiredStocks) {
        if (stock.reservedBy) {
          usersToNotify.add(stock.reservedBy);
        }
        stock.isReserved = false;
        stock.reservedAt = null;
        stock.reservedBy = null;
        stock.reservedMethod = null;
        await stock.save();
      }

      console.log(`⏱️ Released ${expiredStocks.length} expired stock item(s)`);

      // Notify each user once
      if (bot) {
        for (const userId of usersToNotify) {
          try {
            const user = await User.findOne({ telegramId: userId });
            const lang = user && user.language ? user.language : 'am';
            const isEn = lang === 'en';

            const expiredText = isEn
              ? `⏰ <b>Your order has expired!</b>\n\n` +
                `Because payment was not completed within <b>30 minutes</b>, your reservation has been cancelled and the item(s) were released for other customers.\n\n` +
                `You can tap below to start a new order anytime:`
              : `⏰ <b>የትዕዛዝዎ ጊዜ አልቋል!</b>\n\n` +
                `ክፍያው በ <b>30 ደቂቃ</b> ውስጥ ስላልተጠናቀቀ የተያዘው ስቶክ ተለቋል እና ትዕዛዝዎ ተሰርዟል።\n\n` +
                `በድጋሚ ለማዘዝ ከታች ያሉትን አዝራሮች መጠቀም ይችላሉ፦`;

            const expiredKeyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: isEn ? '🛒 Buy Again' : '🛒 እንደገና እዘዝ',
                      callback_data: 'buy',
                      style: 'success',
                    },
                    {
                      text: isEn ? '🏠 Main Menu' : '🏠 ዋና ማውጫ',
                      callback_data: 'main_menu',
                      style: 'primary',
                    },
                  ],
                ],
              },
            };

            await bot.telegram.sendMessage(userId, expiredText, {
              parse_mode: 'HTML',
              ...expiredKeyboard,
            });
          } catch (err) {
            console.error(`Could not notify user ${userId} of order expiry:`, err.message);
          }
        }
      }
    } catch (e) {
      console.error('Error in expireStaleReservations:', e.message);
    }
  }

  /**
   * Starts periodic expiry job (runs every 30 seconds)
   */
  startExpiryJob(bot) {
    console.log('⏰ 30-minute stock reservation expiry monitor started');
    // Run immediately on start
    this.expireStaleReservations(bot);

    // Run every 30 seconds
    setInterval(() => {
      this.expireStaleReservations(bot);
    }, 30 * 1000);
  }
}

module.exports = new ReservationService();
