const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
});

// Configure TTL index to automatically expire and remove OTP documents after they reach their expiresAt date
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
