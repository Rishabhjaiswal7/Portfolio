const mongoose = require('mongoose');

const creativeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  icon: {
    type: String,
    trim: true,
    default: '',
  },
  color: {
    type: String,
    trim: true,
    default: '',
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CreativeCategory', creativeCategorySchema);
