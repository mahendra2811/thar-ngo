const express = require('express');
const donationController = require('../controllers/donation.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get Razorpay key
router.get('/', donationController.getRazorpayKey);

// Create payment order
router.post('/pay', donationController.createOrder);

// Verify payment
router.post('/pay/verify', donationController.verifyPayment);

// Get user donations
router.get('/user', donationController.getUserDonations);

// Get all donations (admin only)
router.get(
  '/all',
  authorize('ADMIN'),
  donationController.getAllDonations
);

module.exports = router;