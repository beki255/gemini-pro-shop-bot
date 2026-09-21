// src/database.js - MongoDB Connection
const mongoose = require('mongoose');
const config = require('./config');

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  while (true) {
    try {
      console.log('⏳ Connecting to MongoDB Atlas...');
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
      });
      console.log('✅ MongoDB connected successfully');
      break;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('💡 TIP: If you see IP whitelist / SSL errors, please ensure 0.0.0.0/0 is added to MongoDB Atlas Network Access.');
      console.log('🔄 Retrying in 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Mongoose driver is attempting auto-reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

module.exports = { connectDB };
