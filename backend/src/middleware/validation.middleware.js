const { validationResult } = require('express-validator');

/**
 * Middleware to validate request data
 * @param {Array} validations - Array of express-validator validations
 * @returns {Function} - Express middleware function
 */
exports.validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return validation errors
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

/**
 * Middleware to validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};