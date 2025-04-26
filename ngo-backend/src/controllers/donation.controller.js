const Razorpay = require('razorpay');
const crypto = require('crypto');
const Donation = require('../models/donation.model');
const emailService = require('../services/email.service');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Get Razorpay key
 * @route GET /api/v1/donate
 */
exports.getRazorpayKey = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Get Razorpay key error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching Razorpay key'
    });
  }
};

/**
 * Create payment order
 * @route POST /api/v1/donate/pay
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `TXN_${Date.now()}`,
      payment_capture: 1 // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    // Save donation to database
    const donation = await Donation.create({
      donerEmail: req.user.email,
      orderId: order.id,
      amount: amount,
      receipt: order.receipt,
      status: 'created',
      paymentId: 'N/A'
    });

    // Return order details
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating order'
    });
  }
};

/**
 * Verify payment
 * @route POST /api/v1/donate/pay/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Find donation in database
    const donation = await Donation.findOne({ orderId });
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: `Invalid OrderId: ${orderId}`
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay signature'
      });
    }

    // Update donation status
    donation.status = 'paid';
    donation.paymentId = paymentId;
    
    // Update donation date
    const now = new Date();
    donation.donationDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} @${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    await donation.save();

    // Send donation receipt email
    await emailService.sendDonationReceipt(donation.donerEmail, donation);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying payment'
    });
  }
};

/**
 * Get user donations
 * @route GET /api/v1/donate/user
 */
exports.getUserDonations = async (req, res) => {
  try {
    // Find donations by user email
    const donations = await Donation.find({ donerEmail: req.user.email })
      .sort({ createdAt: -1 });

    // Return donations
    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('Get user donations error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching donations'
    });
  }
};

/**
 * Get all donations (admin only)
 * @route GET /api/v1/donate/all
 */
exports.getAllDonations = async (req, res) => {
  try {
    // Find all donations
    const donations = await Donation.find()
      .sort({ createdAt: -1 });

    // Return donations
    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('Get all donations error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching donations'
    });
  }
};