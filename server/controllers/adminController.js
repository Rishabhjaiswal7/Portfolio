const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const CreativeWork = require('../models/CreativeWork');
const Certification = require('../models/Certification');
const Testimonial = require('../models/Testimonial');
const Analytics = require('../models/Analytics');

// POST /api/admin/login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return res.status(500).json({ message: 'Server error: Admin credentials are not configured.' });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, adminPasswordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || 'super_secret_dev_key_123456',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: { email },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// POST /api/admin/resume
exports.uploadResume = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a PDF file.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Resume uploaded successfully.',
    file: req.file.filename,
  });
};

// POST /api/admin/creative
exports.uploadCreativeWork = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image or video file.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Delete file if validations failed
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, category } = req.body;
  const mimeType = req.file.mimetype;
  const fileType = mimeType.startsWith('video/') ? 'video' : 'image';

  try {
    const relativeUrl = `/uploads/creative/${req.file.filename}`;
    const newWork = new CreativeWork({
      title,
      category,
      fileUrl: relativeUrl,
      fileType,
    });

    await newWork.save();

    return res.status(201).json({
      success: true,
      message: 'Creative work uploaded and saved successfully.',
      work: newWork,
    });
  } catch (error) {
    console.error('Save creative work error:', error.message);
    // Delete uploaded file if DB save fails
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Server error saving creative work.' });
  }
};

// DELETE /api/admin/creative/:id
exports.deleteCreativeWork = async (req, res) => {
  try {
    const work = await CreativeWork.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ message: 'Creative work not found.' });
    }

    // Delete file from filesystem
    // work.fileUrl is stored as /uploads/creative/filename.ext
    const filename = path.basename(work.fileUrl);
    const filePath = path.join(__dirname, '../uploads/creative', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await CreativeWork.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Creative work and associated file deleted successfully.',
    });
  } catch (error) {
    console.error('Delete creative work error:', error.message);
    return res.status(500).json({ message: 'Server error deleting creative work.' });
  }
};

// POST /api/admin/certifications
exports.addCertification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, issuingOrg, dateIssued, credentialUrl } = req.body;

  try {
    const newCert = new Certification({
      title,
      issuingOrg,
      dateIssued,
      credentialUrl,
    });
    await newCert.save();

    return res.status(201).json({
      success: true,
      message: 'Certification added successfully.',
      certification: newCert,
    });
  } catch (error) {
    console.error('Add certification error:', error.message);
    return res.status(500).json({ message: 'Server error adding certification.' });
  }
};

// PUT /api/admin/certifications/:id
exports.editCertification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, issuingOrg, dateIssued, credentialUrl } = req.body;

  try {
    const cert = await Certification.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ message: 'Certification not found.' });
    }

    cert.title = title || cert.title;
    cert.issuingOrg = issuingOrg || cert.issuingOrg;
    cert.dateIssued = dateIssued || cert.dateIssued;
    cert.credentialUrl = credentialUrl !== undefined ? credentialUrl : cert.credentialUrl;

    await cert.save();

    return res.status(200).json({
      success: true,
      message: 'Certification updated successfully.',
      certification: cert,
    });
  } catch (error) {
    console.error('Edit certification error:', error.message);
    return res.status(500).json({ message: 'Server error updating certification.' });
  }
};

// DELETE /api/admin/certifications/:id
exports.deleteCertification = async (req, res) => {
  try {
    const cert = await Certification.findByIdAndDelete(req.params.id);
    if (!cert) {
      return res.status(404).json({ message: 'Certification not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Certification deleted successfully.',
    });
  } catch (error) {
    console.error('Delete certification error:', error.message);
    return res.status(500).json({ message: 'Server error deleting certification.' });
  }
};

// GET /api/admin/testimonials (Approved + Pending)
exports.getTestimonials = async (req, res) => {
  try {
    const list = await Testimonial.find().sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Admin get testimonials error:', error.message);
    return res.status(500).json({ message: 'Server error fetching testimonials.' });
  }
};

// PUT /api/admin/testimonials/:id/approve
exports.approveTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found.' });
    }

    testimonial.approved = true;
    await testimonial.save();

    return res.status(200).json({
      success: true,
      message: 'Testimonial approved successfully.',
      testimonial,
    });
  } catch (error) {
    console.error('Approve testimonial error:', error.message);
    return res.status(500).json({ message: 'Server error approving testimonial.' });
  }
};

// DELETE /api/admin/testimonials/:id
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully.',
    });
  } catch (error) {
    console.error('Delete testimonial error:', error.message);
    return res.status(500).json({ message: 'Server error deleting testimonial.' });
  }
};


// GET /api/admin/analytics/summary
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const totalVisits = await Analytics.countDocuments();

    // Group visits by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const rawStats = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format the stats to ensure ALL of the last 30 days are present
    const dailyVisits = [];
    const statsMap = new Map(rawStats.map(item => [item._id, item.count]));

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = statsMap.get(dateStr) || 0;
      dailyVisits.push({ date: dateStr, count });
    }

    return res.status(200).json({
      totalVisits,
      dailyVisits,
    });
  } catch (error) {
    console.error('Get analytics summary error:', error.message);
    return res.status(500).json({ message: 'Server error fetching analytics.' });
  }
};
