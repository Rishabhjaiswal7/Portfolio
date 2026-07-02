const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const CreativeWork = require('../models/CreativeWork');
const Certification = require('../models/Certification');
const Testimonial = require('../models/Testimonial');
const Analytics = require('../models/Analytics');

// GET /api/resume
exports.getResume = async (req, res) => {
  const resumeDir = path.join(__dirname, '../uploads/resume');
  
  if (!fs.existsSync(resumeDir)) {
    return res.status(404).json({ message: 'Resume directory does not exist.' });
  }

  try {
    const files = fs.readdirSync(resumeDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      return res.status(404).json({ message: 'No resume PDF found.' });
    }

    // Sort files by mtime to locate the newest
    const fileDetails = pdfFiles.map(file => {
      const filePath = path.join(resumeDir, file);
      const stats = fs.statSync(filePath);
      return { file, mtime: stats.mtime };
    });

    fileDetails.sort((a, b) => b.mtime - a.mtime);

    const latestFile = fileDetails[0].file;
    const latestFilePath = path.join(resumeDir, latestFile);

    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
    res.contentType('application/pdf');
    return res.sendFile(latestFilePath);
  } catch (error) {
    console.error('Resume serving error:', error.message);
    return res.status(500).json({ message: 'Server error serving resume file.' });
  }
};

// GET /api/creative
exports.getCreativeWorks = async (req, res) => {
  const { category } = req.query;
  const filter = {};
  
  if (category && category !== 'all') {
    filter.category = category;
  }

  try {
    const works = await CreativeWork.find(filter).sort({ createdAt: -1 });
    
    // Convert relative file urls to absolute path URLs dynamically based on current host protocol
    const host = req.get('host');
    const protocol = req.protocol;
    const formattedWorks = works.map(work => {
      const dbWork = work.toObject();
      dbWork.fileUrl = `${protocol}://${host}${dbWork.fileUrl}`;
      return dbWork;
    });

    return res.status(200).json(formattedWorks);
  } catch (error) {
    console.error('Fetch creative works error:', error.message);
    return res.status(500).json({ message: 'Server error fetching creative works.' });
  }
};

// GET /api/certifications
exports.getCertifications = async (req, res) => {
  try {
    const certs = await Certification.find().sort({ createdAt: -1 });
    return res.status(200).json(certs);
  } catch (error) {
    console.error('Fetch certifications error:', error.message);
    return res.status(500).json({ message: 'Server error fetching certifications.' });
  }
};

// POST /api/testimonials
exports.submitTestimonial = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { quote, name, role } = req.body;

  try {
    const testimonial = new Testimonial({
      quote,
      name,
      role,
      approved: false, // Default is false for public submissions
    });
    await testimonial.save();

    return res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully. It will appear once approved by the admin.',
    });
  } catch (error) {
    console.error('Testimonial submission error:', error.message);
    return res.status(500).json({ message: 'Server error submitting testimonial.' });
  }
};

// GET /api/testimonials
exports.getApprovedTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ approved: true }).sort({ createdAt: -1 });
    return res.status(200).json(testimonials);
  } catch (error) {
    console.error('Fetch testimonials error:', error.message);
    return res.status(500).json({ message: 'Server error fetching testimonials.' });
  }
};

// POST /api/analytics/visit
exports.logVisit = async (req, res) => {
  const { referrer } = req.body;
  const userAgent = req.headers['user-agent'] || '';

  try {
    const visit = new Analytics({
      referrer: referrer || '',
      userAgent,
    });
    await visit.save();

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Analytics log error:', error.message);
    return res.status(500).json({ message: 'Server error logging visit.' });
  }
};
