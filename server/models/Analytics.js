const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  referrer: {
    type: String,
    default: '',
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
});

module.exports = mongoose.model('Analytics', analyticsSchema);
