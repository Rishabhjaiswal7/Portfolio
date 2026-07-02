const mongoose = require('mongoose');

const creativeItemSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreativeCategory',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  organization: {
    type: String,
    trim: true,
    default: '',
  },
  event: {
    type: String,
    trim: true,
    default: '',
  },
  location: {
    type: String,
    trim: true,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  thumbnail: {
    type: String,
    trim: true,
    default: '',
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'pdf', 'zip', 'document'],
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  externalLink: {
    type: String,
    trim: true,
    default: '',
  },
  author: {
    type: String,
    trim: true,
    default: '',
  },
  credits: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CreativeItem', creativeItemSchema);
