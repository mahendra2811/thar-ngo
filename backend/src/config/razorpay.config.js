const Razorpay = require('razorpay');

/**
 * Initialize Razorpay instance
 * Only initialize if environment variables are set
 */
let razorpayInstance = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn('Razorpay credentials not found in environment variables. Donation functionality will be limited.');
}

module.exports = razorpayInstance;