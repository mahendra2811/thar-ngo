const User = require('../models/user.model');

/**
 * Get user profile
 * @route GET /api/v1/user/profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    // Get user from request (set by auth middleware)
    const user = req.user;

    // Return user profile
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user profile'
    });
  }
};

/**
 * Get user by email (admin only)
 * @route GET /api/v1/user/search
 */
exports.getUserByEmail = async (req, res) => {
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

    // Return user data
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        isEnabled: user.isEnabled,
        isLocked: user.isLocked,
        logs: user.logs,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user'
    });
  }
};

/**
 * Search users by email pattern (admin only)
 * @route GET /api/v1/user/search/pattern
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    // Create regex for case-insensitive search
    const regex = new RegExp(query, 'i');

    // Find users matching the pattern
    const users = await User.find({ email: regex })
      .select('email role isEnabled isLocked createdAt')
      .limit(10);

    // Return users
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching users'
    });
  }
};

/**
 * Toggle user lock status (admin only)
 * @route PATCH /api/v1/user/toggle-lock
 */
exports.toggleUserLock = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle lock status
    user.isLocked = !user.isLocked;
    await user.save();

    // Return updated user
    res.status(200).json({
      success: true,
      message: `User ${user.isLocked ? 'locked' : 'unlocked'} successfully`,
      isLocked: user.isLocked
    });
  } catch (error) {
    console.error('Toggle user lock error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while toggling user lock'
    });
  }
};

/**
 * Get all users (admin only)
 * @route GET /api/v1/user/all
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Count total users
    const total = await User.countDocuments();

    // Find users with pagination
    const users = await User.find()
      .select('email role isEnabled isLocked createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Return users
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
};