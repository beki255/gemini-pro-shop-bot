// src/services/settingsService.js - Dynamic settings manager
const Setting = require('../models/Setting');
const config = require('../config');

class SettingsService {
  constructor() {
    this.isAcceptingOrders = true;
  }

  async init() {
    try {
      const priceSetting = await Setting.findOne({ key: 'productPrice' });
      if (priceSetting && priceSetting.value) {
        config.productPrice = Number(priceSetting.value);
        console.log(` Loaded product price from DB: ${config.productPrice} ETB`);
      } else {
        await Setting.create({ key: 'productPrice', value: config.productPrice });
        console.log(` Initialized product price in DB: ${config.productPrice} ETB`);
      }

      const ordersSetting = await Setting.findOne({ key: 'isAcceptingOrders' });
      if (ordersSetting !== null && ordersSetting.value !== undefined) {
        this.isAcceptingOrders = Boolean(ordersSetting.value);
        console.log(` Loaded isAcceptingOrders from DB: ${this.isAcceptingOrders}`);
      } else {
        await Setting.create({ key: 'isAcceptingOrders', value: true });
        this.isAcceptingOrders = true;
        console.log(` Initialized isAcceptingOrders in DB: true`);
      }
    } catch (e) {
      console.error('⚠️ Failed to sync settings from DB:', e.message);
    }
  }

  async setProductPrice(newPrice) {
    const price = parseInt(newPrice);
    if (isNaN(price) || price <= 0) {
      throw new Error('Invalid price value');
    }
    config.productPrice = price;
    await Setting.findOneAndUpdate(
      { key: 'productPrice' },
      { value: price, updatedAt: new Date() },
      { upsert: true }
    );
    return price;
  }

  getProductPrice() {
    return config.productPrice;
  }

  getIsAcceptingOrders() {
    return this.isAcceptingOrders;
  }

  async setAcceptingOrders(status) {
    this.isAcceptingOrders = Boolean(status);
    await Setting.findOneAndUpdate(
      { key: 'isAcceptingOrders' },
      { value: this.isAcceptingOrders, updatedAt: new Date() },
      { upsert: true }
    );
    return this.isAcceptingOrders;
  }

  async toggleAcceptingOrders() {
    return this.setAcceptingOrders(!this.isAcceptingOrders);
  }
}

module.exports = new SettingsService();
