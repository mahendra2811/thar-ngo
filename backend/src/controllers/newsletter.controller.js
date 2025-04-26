const { validationResult } = require('express-validator');
const Newsletter = require('../models/newsletter.model');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email } = req.body;
    
    // Check if email already exists
    let subscriber = await Newsletter.findOne({ email });
    
    if (subscriber) {
      // If already subscribed, return success
      if (subscriber.isSubscribed) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our newsletter'
        });
      }
      
      // If previously unsubscribed, resubscribe
      subscriber.isSubscribed = true;
      subscriber.subscribedAt = Date.now();
      subscriber.unsubscribedAt = null;
      await subscriber.save();
      
      return res.status(200).json({
        success: true,
        message: 'You have been resubscribed to our newsletter'
      });
    }
    
    // Create new subscriber
    subscriber = await Newsletter.create({
      email
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to our newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your subscription'
    });
  }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find subscriber
    const subscriber = await Newsletter.findOne({ email });
    
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list'
      });
    }
    
    // Update subscription status
    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = Date.now();
    await subscriber.save();
    
    res.status(200).json({
      success: true,
      message: 'You have been unsubscribed from our newsletter'
    });
  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your unsubscription'
    });
  }
};

// Get all subscribers (admin only)
exports.getSubscribers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter by subscription status if provided
    const query = {};
    if (req.query.isSubscribed !== undefined) {
      query.isSubscribed = req.query.isSubscribed === 'true';
    }
    
    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Newsletter.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: subscribers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: subscribers
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching subscribers'
    });
  }
};