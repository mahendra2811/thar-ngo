const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['verification', 'password-reset'],
    default: 'verification'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Token expires in 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Token documents will be automatically deleted after 24 hours
    expires: 86400
  }
});

// Index for faster queries
tokenSchema.index({ token: 1 });
tokenSchema.index({ userId: 1 });

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;