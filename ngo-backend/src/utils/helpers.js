/**
 * Format date to dd-MM-yyyy @HH:mm:ss
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
exports.formatDate = (date = new Date()) => {
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} @${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
exports.generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} - Custom error
 */
exports.createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Sanitize user object for response
 * @param {Object} user - User object
 * @returns {Object} - Sanitized user object
 */
exports.sanitizeUser = (user) => {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    isEnabled: user.isEnabled,
    isLocked: user.isLocked,
    createdAt: user.createdAt
  };
};