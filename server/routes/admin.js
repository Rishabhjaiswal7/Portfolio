const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminContactController = require('../controllers/adminContactController');
const auth = require('../middleware/auth');
const { uploadResume, uploadCreative } = require('../middleware/upload');

// Admin Login (Public)
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid admin email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  adminController.login
);

// Apply JWT verification middleware to all endpoints below
router.use(auth);

// Resume Upload
router.post('/resume', uploadResume.single('resume'), adminController.uploadResume);

// Creative Corner CMS Endpoints
const categoryController = require('../controllers/categoryController');
const itemController = require('../controllers/itemController');

// Category settings CRUD
router.get('/creative-categories', categoryController.getAllCategories);
router.post(
  '/creative-categories',
  [body('name').trim().notEmpty().withMessage('Category name is required.')],
  categoryController.createCategory
);
router.put('/creative-categories/reorder', categoryController.reorderCategories);
router.put(
  '/creative-categories/:id',
  [body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty.')],
  categoryController.updateCategory
);
router.delete('/creative-categories/:id', categoryController.deleteCategory);

// Gallery items CRUD
router.get('/creative', itemController.getAllItems);
router.post('/creative', uploadCreative.array('files'), itemController.uploadItems);
router.put('/creative/bulk', itemController.bulkOperations);
router.put(
  '/creative/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Item title cannot be empty.'),
    body('categoryId').optional().isMongoId().withMessage('Category must be a valid ID.'),
  ],
  itemController.updateItem
);
router.post('/creative/:id/duplicate', itemController.duplicateItem);
router.delete('/creative/:id', itemController.deleteItem);

// Certifications CRUD
router.post(
  '/certifications',
  [
    body('title').trim().notEmpty().withMessage('Certification title is required.'),
    body('issuingOrg').trim().notEmpty().withMessage('Issuing organization is required.'),
    body('dateIssued').trim().notEmpty().withMessage('Date issued is required.'),
    body('credentialUrl').optional({ checkFalsy: true }).trim().isURL().withMessage('If provided, credential URL must be a valid URL.'),
  ],
  adminController.addCertification
);
router.put(
  '/certifications/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Certification title cannot be empty.'),
    body('issuingOrg').optional().trim().notEmpty().withMessage('Issuing organization cannot be empty.'),
    body('dateIssued').optional().trim().notEmpty().withMessage('Date issued cannot be empty.'),
    body('credentialUrl').optional({ checkFalsy: true }).trim().isURL().withMessage('If provided, credential URL must be a valid URL.'),
  ],
  adminController.editCertification
);
router.delete('/certifications/:id', adminController.deleteCertification);

// Testimonials management
router.get('/testimonials', adminController.getTestimonials);
router.put('/testimonials/:id/approve', adminController.approveTestimonial);
router.delete('/testimonials/:id', adminController.deleteTestimonial);

// Contact messages tracking
router.get('/messages', adminContactController.getMessages);
router.put('/messages/:id/read', adminContactController.toggleRead);
router.post('/messages/:id/reply', adminContactController.replyMessage);
router.delete('/messages/:id', adminContactController.deleteMessage);

// Analytics Summary
router.get('/analytics/summary', adminController.getAnalyticsSummary);

module.exports = router;
