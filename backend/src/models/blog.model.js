const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  summary: {
    type: String,
    required: [true, 'Summary is required'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  images: [String],
  tags: [String],
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'],
    default: 'PENDING'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;