const express = require('express');
const { check } = require('express-validator');
const blogController = require('../controllers/blog.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Create blog post (authenticated users only)
router.post(
  '/',
  protect,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('summary', 'Summary is required').not().isEmpty()
  ],
  blogController.createBlog
);

// Get all blogs (public for published, admin for all)
router.get('/', blogController.getBlogs);

// Get blog tags
router.get('/tags', blogController.getBlogTags);

// Get user's blogs
router.get(
  '/user/me',
  protect,
  blogController.getUserBlogs
);

// Get blog by ID
router.get('/:id', blogController.getBlogById);

// Update blog status (admin only)
router.put(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  blogController.updateBlogStatus
);

// Update blog
router.put(
  '/:id',
  protect,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('summary', 'Summary is required').not().isEmpty()
  ],
  blogController.updateBlog
);

// Delete blog
router.delete(
  '/:id',
  protect,
  blogController.deleteBlog
);

module.exports = router;