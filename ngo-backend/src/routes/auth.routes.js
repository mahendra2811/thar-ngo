const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Register a new user
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.register
);

// Verify email
router.get('/confirm', authController.verifyEmail);

// Login user
router.post(
  '/auth',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// Check if email exists
router.get('/', authController.checkEmail);

// Get user logs
router.get(
  '/getLogs',
  protect,
  authController.getUserLogs
);

module.exports = router;