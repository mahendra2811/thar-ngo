const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get user profile
router.get('/profile', userController.getUserProfile);

// Admin-only routes
router.use(authorize('ADMIN'));

// Get user by email
router.get('/search', userController.getUserByEmail);

// Search users by email pattern
router.get('/search/pattern', userController.searchUsers);

// Toggle user lock status
router.patch('/toggle-lock', userController.toggleUserLock);

// Get all users
router.get('/all', userController.getAllUsers);

module.exports = router;