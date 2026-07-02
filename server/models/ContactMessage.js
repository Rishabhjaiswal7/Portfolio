const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  company: {
    type: String,
    trim: true,
    default: '',
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    default: '',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  ipAddress: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied'],
    default: 'unread',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
