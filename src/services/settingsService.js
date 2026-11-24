// src/services/settingsService.js - Dynamic settings manager
const Setting = require('../models/Setting');
const config = require('../config');

class SettingsService {
  constructor() {
    this.isAcceptingOrders = true;
    this.autoSaleProof = true;
    this.autoSaleProofFormat = 'both';
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
      const rateSetting = await Setting.findOne({ key: 'usdtRate' });
      if (rateSetting && rateSetting.value) {
        config.payment.usdtRate = Number(rateSetting.value);
        console.log(` Loaded USDT rate from DB: ${config.payment.usdtRate} ETB/USDT`);
      } else {
        await Setting.create({ key: 'usdtRate', value: config.payment.usdtRate || 195 });
        console.log(` Initialized USDT rate in DB: ${config.payment.usdtRate || 195} ETB/USDT`);
      }

      const autoProofSetting = await Setting.findOne({ key: 'autoSaleProof' });
      if (autoProofSetting !== null && autoProofSetting.value !== undefined) {
        this.autoSaleProof = Boolean(autoProofSetting.value);
      } else {
        await Setting.create({ key: 'autoSaleProof', value: true });
        this.autoSaleProof = true;
      }

      const autoProofFmtSetting = await Setting.findOne({ key: 'autoSaleProofFormat' });
      if (autoProofFmtSetting && ['both', 'en', 'am'].includes(autoProofFmtSetting.value)) {
        this.autoSaleProofFormat = autoProofFmtSetting.value;
      } else {
        await Setting.create({ key: 'autoSaleProofFormat', value: 'both' });
        this.autoSaleProofFormat = 'both';
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
    // Keep default product price in sync
    try {
      const productService = require('./productService');
      await productService.syncDefaultProductPrice(price);
    } catch {}
    return price;
  }

  getProductPrice() {
    return config.productPrice;
  }

  async setUsdtRate(newRate) {
    const rate = parseInt(newRate);
    if (isNaN(rate) || rate <= 0) {
      throw new Error('Invalid USDT rate');
    }
    config.payment.usdtRate = rate;
    await Setting.findOneAndUpdate(
      { key: 'usdtRate' },
      { value: rate, updatedAt: new Date() },
      { upsert: true }
    );
    return rate;
  }

  getUsdtRate() {
    return config.payment.usdtRate || 195;
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

  getAutoSaleProof() {
    return this.autoSaleProof;
  }

  async setAutoSaleProof(enabled) {
    this.autoSaleProof = Boolean(enabled);
    await Setting.findOneAndUpdate(
      { key: 'autoSaleProof' },
      { value: this.autoSaleProof, updatedAt: new Date() },
      { upsert: true }
    );
    return this.autoSaleProof;
  }

  async toggleAutoSaleProof() {
    return this.setAutoSaleProof(!this.autoSaleProof);
  }

  getAutoSaleProofFormat() {
    return this.autoSaleProofFormat || 'both';
  }

  async setAutoSaleProofFormat(fmt) {
    const valid = ['both', 'en', 'am'].includes(fmt) ? fmt : 'both';
    this.autoSaleProofFormat = valid;
    await Setting.findOneAndUpdate(
      { key: 'autoSaleProofFormat' },
      { value: valid, updatedAt: new Date() },
      { upsert: true }
    );
    return valid;
  }
}

module.exports = new SettingsService();
