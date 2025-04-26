const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donerEmail: {
    type: String,
    required: [true, 'Donor email is required'],
    lowercase: true,
    trim: true
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    unique: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 1
  },
  receipt: {
    type: String,
    required: [true, 'Receipt is required']
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'],
    default: 'created'
  },
  paymentId: {
    type: String,
    default: 'N/A'
  },
  donationDate: {
    type: String,
    default: function() {
      const now = new Date();
      return `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} @${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
donationSchema.index({ orderId: 1 });
donationSchema.index({ donerEmail: 1 });

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;