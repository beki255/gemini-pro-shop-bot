// src/services/productService.js - Dynamic Product Catalog Manager (Web Admin + Bot Sync)
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const config = require('../config');

const DEFAULT_SLUG = 'gemini-pro-18m';
const DEFAULT_IMAGE_PATH = path.join(__dirname, '../../assets/gemini_product.png');

const DEFAULT_DESC_EN =
  `✨ <b>Key Features:</b>\n` +
  `✅ 18-Month AI Pro Plan\n` +
  `✅ 5 TB Cloud Storage\n` +
  `✅ Up to 5 User Accounts\n` +
  `✅ Veo 3 Video · Imagen 4 Image\n` +
  `✅ Antigravity, Jules, Deep Research & NotebookLM\n\n` +
  `📜 <b>Terms & Policy:</b>\n` +
  `<blockquote>⚠️ <b>No Warranty Notice:</b>\n` +
  `• No warranty if any problem happens after it's activated.\n` +
  `• <i>(Rarely ever causes any issues)</i>\n` +
  `⏰ <b>5-Hour Activation Window:</b>\n` +
  `• You must activate the link within <b>5 hours</b> of delivery.\n` +
  `• If the link expires after 5 hours, we are not responsible or liable.\n` +
  `• By purchasing, you accept these terms.</blockquote>\n\n` +
  `🚀 <b>Automatic delivery right after payment confirmation.</b>`;

const DEFAULT_DESC_AM =
  `✨ <b>ዋና ዋና ጥቅሞች (Features):</b>\n` +
  `✅ የ 18 ወራት AI Pro Plan\n` +
  `✅ 5 TB Cloud Storage\n` +
  `✅ እስከ 5 ሰው መጋራት የሚያስችል\n` +
  `✅ Veo 3 Video · Imagen 4 Image\n` +
  `✅ Antigravity፣ Jules፣ Deep Research እና NotebookLM\n\n` +
  `📜 <b>የግዢ ፖሊሲ እና ማስጠንቀቂያ (Terms & Policy):</b>\n` +
  `<blockquote>⚠️ <b>ዋስትና የለውም (No Warranty)</b>\n` +
  `• ሊንኩ አንዴ አክቲቭ ከተደረገ በኋላ ለሚፈጠር ማንኛውም ችግር ዋስትና የለውም።\n` +
  `• <i>(ሆኖም በአብዛኛው ምንም አይነት ችግር አያጋጥምም)</i>\n` +
  `⏰ <b>የአክቲቬሽን ጊዜ ገደብ (5 ሰዓት):</b>\n` +
  `• ሊንኩ እንደደረሰዎት በ <b>5 ሰዓት (within 5 hours)</b> ውስጥ አክቲቭ ማድረግ አለብዎት።\n` +
  `• 5 ሰዓት አልፎ ሊንኩ ኤክስፓየር (expire) ቢያደርግ ኃላፊነት አንወስድም።\n` +
  `• በመግዛትዎ ይህንን ፖሊሲ ተቀብለዋል።</blockquote>\n\n` +
  `🚀 <b>ክፍያዎ እንደተረጋገጠ ሊንኩ ወዲያውኑ ይላካል!</b>`;

function slugify(text) {
  const base = String(text || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 22);
  return base || `prod-${Date.now().toString(36).slice(-5)}`;
}

class ProductService {
  constructor() {
    this.cache = [];
  }

  async init() {
    try {
      let defaultProd = await Product.findOne({ slug: DEFAULT_SLUG });
      if (!defaultProd) {
        defaultProd = await Product.create({
          slug: DEFAULT_SLUG,
          emoji: '💎',
          nameEn: config.productName || 'Gemini Pro 18 Months',
          nameAm: 'Gemini Pro 18 ወራት',
          priceEtb: config.productPrice || 250,
          customUsdtPrice: null,
          descriptionEn: DEFAULT_DESC_EN,
          descriptionAm: DEFAULT_DESC_AM,
          imageUrl: null,
          isActive: true,
          isInStock: true,
          isDefault: true,
          sortOrder: 0,
        });
        console.log(`📦 Seeded default product: ${defaultProd.nameEn} (${defaultProd.priceEtb} ETB)`);
      } else {
        // Sync config with default product price in DB
        if (defaultProd.priceEtb && defaultProd.priceEtb !== config.productPrice) {
          config.productPrice = defaultProd.priceEtb;
        }
        if (defaultProd.nameEn) {
          config.productName = defaultProd.nameEn;
        }
      }

      await this.refreshCache();
      console.log(`🛍️ Loaded ${this.cache.length} product(s) into catalog cache`);
    } catch (err) {
      console.error('⚠️ Failed to initialize ProductService:', err.message);
    }
  }

  async refreshCache() {
    this.cache = await Product.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return this.cache;
  }

  getCachedProducts() {
    return this.cache;
  }

  getActiveProductsSync() {
    return this.cache.filter((p) => p.isActive !== false);
  }

  async getAllProducts() {
    return await this.refreshCache();
  }

  async getActiveProducts() {
    const all = await this.refreshCache();
    return all.filter((p) => p.isActive !== false);
  }

  getDefaultProductSync() {
    return (
      this.cache.find((p) => p.slug === DEFAULT_SLUG || p.isDefault) ||
      this.cache[0] || {
        slug: DEFAULT_SLUG,
        emoji: '💎',
        nameEn: config.productName || 'Gemini Pro 18 Months',
        nameAm: 'Gemini Pro 18 ወራት',
        priceEtb: config.productPrice || 250,
        customUsdtPrice: null,
        descriptionEn: DEFAULT_DESC_EN,
        descriptionAm: DEFAULT_DESC_AM,
        isActive: true,
        isInStock: true,
        isDefault: true,
        sortOrder: 0,
      }
    );
  }

  async getProductBySlug(slug) {
    if (!slug) return this.getDefaultProductSync();
    let found = this.cache.find((p) => p.slug === slug);
    if (!found) {
      found = await Product.findOne({ slug }).lean();
      if (found) await this.refreshCache();
    }
    return found || this.getDefaultProductSync();
  }

  getUsdtPrice(product) {
    if (!product) return config.calculateUsdtPrice(config.productPrice);
    if (product.customUsdtPrice !== null && product.customUsdtPrice !== undefined && Number(product.customUsdtPrice) > 0) {
      return Number(Number(product.customUsdtPrice).toFixed(2));
    }
    return config.calculateUsdtPrice(product.priceEtb || config.productPrice);
  }

  getDisplayName(product, lang = 'am') {
    if (!product) return config.productName || 'Gemini Pro 18 Months';
    if (lang === 'en') return product.nameEn || product.nameAm || config.productName;
    return product.nameAm || product.nameEn || config.productName;
  }

  getProductImagePreviewUrl(product) {
    if (!product) return null;
    const ver = product.updatedAt ? new Date(product.updatedAt).getTime() : Date.now();
    if (product.imageData) {
      return `/product-image/${encodeURIComponent(product.slug)}?v=${ver}`;
    }
    if (product.imageUrl) {
      return product.imageUrl;
    }
    if ((product.isDefault || product.slug === DEFAULT_SLUG) && !product.imageRemoved && fs.existsSync(DEFAULT_IMAGE_PATH)) {
      return `/product-image/${encodeURIComponent(product.slug)}?v=default-${ver}`;
    }
    return null;
  }

  getProductPhotoSource(product) {
    if (!product) return null;
    if (product.imageData && typeof product.imageData === 'string') {
      const match = product.imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        return {
          source: Buffer.from(match[2], 'base64'),
          filename: `${product.slug || 'product'}.${ext}`,
        };
      }
    }
    if (product.imageUrl) {
      return product.imageUrl;
    }
    if ((product.isDefault || product.slug === DEFAULT_SLUG) && !product.imageRemoved && fs.existsSync(DEFAULT_IMAGE_PATH)) {
      return { source: DEFAULT_IMAGE_PATH };
    }
    return null;
  }

  getDefaultImagePath() {
    return DEFAULT_IMAGE_PATH;
  }

  async createProduct(payload) {
    const nameEn = String(payload.nameEn || '').trim();
    const nameAm = String(payload.nameAm || nameEn).trim();
    const priceEtb = Number(payload.priceEtb);
    if (!nameEn) throw new Error('Product name is required.');
    if (isNaN(priceEtb) || priceEtb <= 0) throw new Error('Valid ETB price is required.');

    // Generate unique short slug (safe for Telegram 64-byte callback_data)
    let baseSlug = slugify(payload.slug || nameEn);
    let slug = baseSlug;
    let suffix = 2;
    while (await Product.exists({ slug })) {
      slug = `${baseSlug.slice(0, 18)}-${suffix}`;
      suffix++;
    }

    // Place new products directly below existing ones unless explicit sortOrder given
    let sortOrder = Number(payload.sortOrder);
    if (isNaN(sortOrder) || payload.sortOrder === '' || payload.sortOrder === undefined || payload.sortOrder === null) {
      const last = await Product.findOne().sort({ sortOrder: -1 }).lean();
      sortOrder = last ? (last.sortOrder || 0) + 10 : 10;
    }

    const customUsdt =
      payload.customUsdtPrice !== '' && payload.customUsdtPrice !== null && payload.customUsdtPrice !== undefined
        ? Number(payload.customUsdtPrice)
        : null;

    const created = await Product.create({
      slug,
      emoji: String(payload.emoji || '🛍️').trim() || '🛍️',
      nameEn,
      nameAm,
      priceEtb,
      customUsdtPrice: customUsdt && !isNaN(customUsdt) && customUsdt > 0 ? Number(customUsdt.toFixed(2)) : null,
      descriptionEn: String(payload.descriptionEn || '').trim(),
      descriptionAm: String(payload.descriptionAm || '').trim(),
      imageUrl: payload.imageUrl ? String(payload.imageUrl).trim() : null,
      imageData: payload.imageData && String(payload.imageData).startsWith('data:image/') ? String(payload.imageData) : null,
      imageRemoved: false,
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      isInStock: payload.isInStock !== undefined ? Boolean(payload.isInStock) : true,
      isDefault: false,
      sortOrder,
    });

    await this.refreshCache();
    return created.toObject();
  }

  async updateProduct(id, payload) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found.');

    if (payload.nameEn !== undefined) {
      const v = String(payload.nameEn).trim();
      if (!v) throw new Error('Product name cannot be empty.');
      product.nameEn = v;
    }
    if (payload.nameAm !== undefined) {
      product.nameAm = String(payload.nameAm).trim() || product.nameEn;
    }
    if (payload.emoji !== undefined) {
      product.emoji = String(payload.emoji).trim() || '🛍️';
    }
    if (payload.priceEtb !== undefined) {
      const price = Number(payload.priceEtb);
      if (isNaN(price) || price <= 0) throw new Error('Valid ETB price is required.');
      product.priceEtb = price;
    }
    if (payload.customUsdtPrice !== undefined) {
      if (payload.customUsdtPrice === '' || payload.customUsdtPrice === null) {
        product.customUsdtPrice = null;
      } else {
        const u = Number(payload.customUsdtPrice);
        product.customUsdtPrice = !isNaN(u) && u > 0 ? Number(u.toFixed(2)) : null;
      }
    }
    if (payload.descriptionEn !== undefined) {
      product.descriptionEn = String(payload.descriptionEn);
    }
    if (payload.descriptionAm !== undefined) {
      product.descriptionAm = String(payload.descriptionAm);
    }
    if (payload.removeImage === true) {
      product.imageData = null;
      product.imageUrl = null;
      product.imageRemoved = true;
    } else {
      if (payload.imageData && String(payload.imageData).startsWith('data:image/')) {
        product.imageData = String(payload.imageData);
        product.imageUrl = null;
        product.imageRemoved = false;
      } else if (payload.imageUrl !== undefined) {
        const cleanedUrl = payload.imageUrl ? String(payload.imageUrl).trim() : null;
        if (cleanedUrl) {
          product.imageUrl = cleanedUrl;
          product.imageData = null;
          product.imageRemoved = false;
        } else if (!product.imageData) {
          product.imageUrl = null;
        }
      }
    }
    if (payload.isActive !== undefined) {
      product.isActive = Boolean(payload.isActive);
    }
    if (payload.isInStock !== undefined) {
      product.isInStock = Boolean(payload.isInStock);
    }
    if (payload.sortOrder !== undefined && payload.sortOrder !== '' && !isNaN(Number(payload.sortOrder))) {
      product.sortOrder = Number(payload.sortOrder);
    }

    await product.save();

    // Keep global config/setting synced if editing the default product
    if (product.isDefault || product.slug === DEFAULT_SLUG) {
      config.productPrice = product.priceEtb;
      config.productName = product.nameEn;
      await Setting.findOneAndUpdate(
        { key: 'productPrice' },
        { value: product.priceEtb, updatedAt: new Date() },
        { upsert: true }
      ).catch(() => {});
    }

    await this.refreshCache();
    return product.toObject();
  }

  async syncDefaultProductPrice(newPrice) {
    try {
      await Product.findOneAndUpdate(
        { $or: [{ slug: DEFAULT_SLUG }, { isDefault: true }] },
        { $set: { priceEtb: Number(newPrice) } }
      );
      await this.refreshCache();
    } catch {}
  }

  async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found.');
    if (product.isDefault || product.slug === DEFAULT_SLUG) {
      throw new Error('Cannot delete the main default product. You can edit or hide it instead.');
    }
    await Product.findByIdAndDelete(id);
    await this.refreshCache();
    return true;
  }
}

module.exports = new ProductService();
module.exports.DEFAULT_SLUG = DEFAULT_SLUG;
