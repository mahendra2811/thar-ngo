const { validationResult } = require('express-validator');
const Blog = require('../models/blog.model');
const User = require('../models/user.model');

// Create a new blog post
exports.createBlog = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, content, summary, tags, coverImage, images } = req.body;
    
    // Create blog post
    const blog = await Blog.create({
      title,
      content,
      summary,
      tags: tags || [],
      coverImage: coverImage || '',
      images: images || [],
      author: req.user.id,
      status: req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN' ? 'PUBLISHED' : 'PENDING'
    });

    res.status(201).json({
      success: true,
      data: blog,
      message: req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN' 
        ? 'Blog post published successfully' 
        : 'Blog post submitted for approval'
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating blog post'
    });
  }
};

// Get all blogs (public for published, admin for all)
exports.getBlogs = async (req, res) => {
  try {
    const query = { status: 'PUBLISHED' };
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // If admin or superadmin, allow viewing all blogs
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN')) {
      if (req.query.status) {
        query.status = req.query.status;
      } else {
        delete query.status; // Show all statuses
      }
    }
    
    // Add tag filter if provided
    if (req.query.tag) {
      query.tags = req.query.tag;
    }
    
    const blogs = await Blog.find(query)
      .populate('author', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Blog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: blogs
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching blogs'
    });
  }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name email profileImage bio');
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Check if blog is published or user is admin/superadmin or author
    if (blog.status !== 'PUBLISHED' && 
        (!req.user || 
         (req.user.role !== 'ADMIN' && 
          req.user.role !== 'SUPERADMIN' && 
          blog.author._id.toString() !== req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this blog'
      });
    }
    
    // Increment view count if not author or admin
    if (!req.user || 
        (req.user.id !== blog.author._id.toString() && 
         req.user.role !== 'ADMIN' && 
         req.user.role !== 'SUPERADMIN')) {
      blog.views += 1;
      await blog.save();
    }
    
    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching blog'
    });
  }
};

// Update blog status (admin only)
exports.updateBlogStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    if (!['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    blog.status = status;
    blog.updatedAt = Date.now();
    
    // Add rejection reason if status is REJECTED
    if (status === 'REJECTED') {
      blog.rejectionReason = rejectionReason || 'Content does not meet our guidelines';
    }
    
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog,
      message: `Blog status updated to ${status}`
    });
  } catch (error) {
    console.error('Update blog status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating blog status'
    });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, content, summary, tags, coverImage, images } = req.body;
    
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Check if user is author or admin
    if (blog.author.toString() !== req.user.id && 
        req.user.role !== 'ADMIN' && 
        req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this blog'
      });
    }
    
    // Update blog
    blog.title = title;
    blog.content = content;
    blog.summary = summary;
    blog.tags = tags || [];
    blog.coverImage = coverImage || '';
    blog.images = images || [];
    blog.updatedAt = Date.now();
    
    // Reset status to PENDING if not admin and blog was previously rejected
    if (req.user.role !== 'ADMIN' && 
        req.user.role !== 'SUPERADMIN' && 
        blog.status === 'REJECTED') {
      blog.status = 'PENDING';
      blog.rejectionReason = '';
    }
    
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog,
      message: 'Blog updated successfully'
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating blog'
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Check if user is author or admin
    if (blog.author.toString() !== req.user.id && 
        req.user.role !== 'ADMIN' && 
        req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blog'
      });
    }
    
    await Blog.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting blog'
    });
  }
};

// Get blog tags
exports.getBlogTags = async (req, res) => {
  try {
    const tags = await Blog.distinct('tags', { status: 'PUBLISHED' });
    
    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Get blog tags error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching blog tags'
    });
  }
};

// Get user's blogs
exports.getUserBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const blogs = await Blog.find({ author: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Blog.countDocuments({ author: req.user.id });
    
    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: blogs
    });
  } catch (error) {
    console.error('Get user blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user blogs'
    });
  }
};