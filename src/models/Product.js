// src/models/Product.js - Dynamic Product / Service Schema
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emoji: {
      type: String,
      default: '💎',
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    nameAm: {
      type: String,
      default: '',
      trim: true,
    },
    priceEtb: {
      type: Number,
      required: true,
      min: 1,
    },
    customUsdtPrice: {
      type: Number,
      default: null,
    },
    descriptionEn: {
      type: String,
      default: '',
    },
    descriptionAm: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isInStock: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
