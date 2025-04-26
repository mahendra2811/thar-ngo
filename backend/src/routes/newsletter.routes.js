const express = require('express');
const { check } = require('express-validator');
const newsletterController = require('../controllers/newsletter.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Subscribe to newsletter (public)
router.post(
  '/subscribe',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  newsletterController.subscribe
);

// Unsubscribe from newsletter (public)
router.get(
  '/unsubscribe',
  newsletterController.unsubscribe
);

// Get all subscribers (admin only)
router.get(
  '/',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  newsletterController.getSubscribers
);

module.exports = router;