// src/services/otpService.js - Admin Web Authentication, OTP & Portal URL Manager
const crypto = require('crypto');
const Setting = require('../models/Setting');
const config = require('../config');

class OtpService {
  constructor() {
    this.activeOtps = new Map(); // code -> { expiresAt, telegramId }
    this.activeSessions = new Map(); // token -> { expiresAt, username }
    this.customWebUrl = null;
    this.cachedUsername = null;
    this.cachedPassword = null;
  }

  async init() {
    try {
      const urlSetting = await Setting.findOne({ key: 'admin_web_url' });
      if (urlSetting && urlSetting.value) {
        this.customWebUrl = String(urlSetting.value).trim();
      }

      const userSetting = await Setting.findOne({ key: 'admin_username' });
      if (userSetting && userSetting.value) {
        this.cachedUsername = String(userSetting.value).trim();
      }

      const passSetting = await Setting.findOne({ key: 'admin_password' });
      if (passSetting && passSetting.value) {
        this.cachedPassword = String(passSetting.value).trim();
      }
    } catch (e) {
      console.error('⚠️ Failed to load admin credentials from DB:', e.message);
    }
  }

  // ─── OTP Generation & Verification ────────────────────────
  generateOtp(telegramId) {
    // Generate secure 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes valid

    // Clean up expired OTPs
    const now = Date.now();
    for (const [key, val] of this.activeOtps.entries()) {
      if (val.expiresAt < now) this.activeOtps.delete(key);
    }

    this.activeOtps.set(code, { expiresAt, telegramId });
    return code;
  }

  verifyOtp(code) {
    if (!code) return false;
    const cleanCode = String(code).trim();
    const entry = this.activeOtps.get(cleanCode);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.activeOtps.delete(cleanCode);
      return false;
    }

    // Single-use: remove after successful verification
    this.activeOtps.delete(cleanCode);
    return true;
  }

  // ─── Username & Password Authentication ────────────────────
  async getAdminUsername() {
    if (this.cachedUsername) return this.cachedUsername;
    try {
      const s = await Setting.findOne({ key: 'admin_username' });
      if (s && s.value) {
        this.cachedUsername = String(s.value).trim();
        return this.cachedUsername;
      }
    } catch {}
    return process.env.ADMIN_USERNAME || 'admin';
  }

  async getAdminPassword() {
    if (this.cachedPassword) return this.cachedPassword;
    try {
      const s = await Setting.findOne({ key: 'admin_password' });
      if (s && s.value) {
        this.cachedPassword = String(s.value).trim();
        return this.cachedPassword;
      }
    } catch {}
    return process.env.ADMIN_PASSWORD || 'admin1234';
  }

  async verifyCredentials(username, password) {
    if (!username || !password) return false;
    const expectedUser = await this.getAdminUsername();
    const expectedPass = await this.getAdminPassword();
    return (
      String(username).trim() === expectedUser &&
      String(password).trim() === expectedPass
    );
  }

  async setAdminUsername(newUsername) {
    const user = String(newUsername).trim();
    this.cachedUsername = user;
    await Setting.findOneAndUpdate(
      { key: 'admin_username' },
      { value: user, updatedAt: new Date() },
      { upsert: true }
    );
    return user;
  }

  async setAdminPassword(newPassword) {
    const pass = String(newPassword).trim();
    this.cachedPassword = pass;
    await Setting.findOneAndUpdate(
      { key: 'admin_password' },
      { value: pass, updatedAt: new Date() },
      { upsert: true }
    );
    return pass;
  }

  // ─── Session Token Management ──────────────────────────────
  createSession(username = 'admin') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.activeSessions.set(token, { expiresAt, username });
    return token;
  }

  verifySession(token) {
    if (!token) return false;
    const session = this.activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return false;
    }
    return session;
  }

  destroySession(token) {
    if (token) this.activeSessions.delete(token);
  }

  // ─── Dynamic Web Portal URL ────────────────────────────────
  getWebUrl(req = null) {
    if (this.customWebUrl) {
      return this.customWebUrl.replace(/\/+$/, '') + '/admin';
    }
    const envUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVICE_URL;
    if (envUrl) {
      return envUrl.replace(/\/+$/, '') + '/admin';
    }
    if (req && req.get) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('host');
      if (host) return `${proto}://${host}/admin`;
    }
    return `http://localhost:${config.port || 3000}/admin`;
  }

  async setWebUrl(url) {
    const cleanUrl = String(url).trim().replace(/\/+$/, '');
    this.customWebUrl = cleanUrl;
    await Setting.findOneAndUpdate(
      { key: 'admin_web_url' },
      { value: cleanUrl, updatedAt: new Date() },
      { upsert: true }
    );
    return cleanUrl;
  }
}

module.exports = new OtpService();
