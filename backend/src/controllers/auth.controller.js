const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Token = require('../models/token.model');
const emailService = require('../services/email.service');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

/**
 * Register a new user
 * @route POST /api/v1/registration
 */
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} @${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const user = await User.create({
      email,
      password,
      logs: [`CreatedOn: ${formattedDate}`]
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Save token to database
    await Token.create({
      userId: user._id,
      token: verificationToken,
      type: 'verification'
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
};

/**
 * Verify email with token
 * @route GET /api/v1/registration/confirm
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Find token in database
    const verificationToken = await Token.findOne({
      token,
      type: 'verification',
      expiresAt: { $gt: Date.now() }
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Find and update user
    const user = await User.findById(verificationToken.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Enable user account
    user.isEnabled = true;
    await user.save();

    // Delete token
    await Token.deleteOne({ _id: verificationToken._id });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during email verification'
    });
  }
};

/**
 * Login user
 * @route POST /api/v1/registration/auth
 */
exports.login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is enabled
    if (!user.isEnabled) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email to log in'
      });
    }

    // Check if user is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been locked. Please contact support'
      });
    }

    // Add login log
    await user.addLoginLog();

    // Generate token
    const token = generateToken(user._id);

    // Return success response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

/**
 * Check if email exists
 * @route GET /api/v1/registration
 */
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // Check if user exists
    const user = await User.findOne({ email });
    
    if (user) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: 'User exists'
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: 'User does not exist'
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking email'
    });
  }
};

/**
 * Get user logs
 * @route GET /api/v1/registration/getLogs
 */
exports.getUserLogs = async (req, res) => {
  try {
    const { email } = req.query;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return logs
    res.status(200).json({
      success: true,
      logs: user.logs
    });
  } catch (error) {
    console.error('Get user logs error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user logs'
    });
  }
};