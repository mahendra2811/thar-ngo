const express = require('express');
const { check } = require('express-validator');
const contactController = require('../controllers/contact.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Submit contact form (public)
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('subject', 'Subject is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty()
  ],
  contactController.submitContact
);

// Get all contacts (admin only)
router.get(
  '/',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.getContacts
);

// Get contact by ID (admin only)
router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.getContactById
);

// Update contact status (admin only)
router.put(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.updateContactStatus
);

module.exports = router;