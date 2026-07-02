const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const publicController = require('../controllers/publicController');
const contactController = require('../controllers/contactController');
const { contactLimiter, otpLimiter, testimonialLimiter } = require('../middleware/rateLimiter');

// CONFIG ENDPOINT
router.get('/config', contactController.getConfig);

// CONTACT FORM & EMAIL VERIFICATION
router.post('/contact/verify-email-send', otpLimiter, contactController.sendOtp);
router.post('/contact/verify-email-otp', otpLimiter, contactController.verifyOtp);
router.post('/contact', contactLimiter, contactController.submitMessage);

// RESUME DOWNLOAD
router.get('/resume', publicController.getResume);

// CREATIVE GALLERY & CATEGORIES
const categoryController = require('../controllers/categoryController');
const itemController = require('../controllers/itemController');

router.get('/creative-categories', categoryController.getCategories);
router.get('/creative', itemController.getItems);

// CERTIFICATIONS
router.get('/certifications', publicController.getCertifications);

// TESTIMONIALS
router.post(
  '/testimonials',
  testimonialLimiter,
  [
    body('quote').trim().notEmpty().withMessage('Quote is required.'),
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('role').trim().notEmpty().withMessage('Role/Organization is required.'),
  ],
  publicController.submitTestimonial
);
router.get('/testimonials', publicController.getApprovedTestimonials);

// VISITOR ANALYTICS
router.post('/analytics/visit', publicController.logVisit);

module.exports = router;
