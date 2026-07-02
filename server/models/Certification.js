const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  issuingOrg: {
    type: String,
    required: true,
    trim: true,
  },
  dateIssued: {
    type: String,
    required: true,
    trim: true,
  },
  credentialUrl: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Certification', certificationSchema);
