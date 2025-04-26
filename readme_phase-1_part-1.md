# THAR NGO Website Implementation - Phase 1 (Part 1)

This document outlines the step-by-step implementation plan for Phase 1 of the THAR NGO website project, focusing on connecting the frontend with the backend, implementing the authentication system, and adding blog functionality.

## Phase 1 Objectives

1. Connect frontend with backend (Node.js, MongoDB)
2. Implement user authentication system with different roles
3. Create blog functionality (creation, approval, display)
4. Add user profile management
5. Implement contact form submission
6. Add newsletter subscription in footer

## Implementation Steps

### Step 1: Set Up MongoDB Connection

1. Create a MongoDB Atlas account or set up a local MongoDB instance
2. Create a database for the project
3. Update the `.env` file with MongoDB connection string:

```
# .env file
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/thar-ngo
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d
```

### Step 2: Expand User Model for Different Roles

1. Update the user model to include additional roles and fields:

```javascript
// Update models/user.model.js
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['VISITOR', 'DONOR', 'TEAM', 'ADMIN', 'SUPERADMIN'],
    default: 'VISITOR'
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  logs: {
    type: [String],
    default: []
  },
  isLocked: {
    type: Boolean,
### Step 3: Create Blog Models and API

1. Create the blog model:

```javascript
// Create models/blog.model.js
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
```

2. Create blog controller:

```javascript
// Create controllers/blog.controller.js
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
```
    default: false
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
3. Create blog routes:

```javascript
// Create routes/blog.routes.js
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

// Get blog tags
router.get('/tags', blogController.getBlogTags);

// Get user's blogs
router.get(
  '/user/me',
  protect,
  blogController.getUserBlogs
);

module.exports = router;
```

4. Update server.js to include blog routes:

```javascript
// Update server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const donationRoutes = require('./routes/donation.routes');
const userRoutes = require('./routes/user.routes');
const contactRoutes = require('./routes/contact.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const blogRoutes = require('./routes/blog.routes');

// Import middleware
const errorHandler = require('./middleware/error.middleware');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://sanjivaningo.web.app',
  'https://sanjivaningo.firebaseapp.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// API Routes
app.use('/api/v1/registration', authRoutes);
app.use('/api/v1/donate', donationRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/blogs', blogRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
```

### Step 4: Create Frontend Authentication Components

1. Create Login and Register components (as outlined in the implementation plan)
2. Create authentication context for managing user state:

```javascript
// Create src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is logged in on page load
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError('');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/v1/registration/auth`,
        { email, password }
      );
      
      const { token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set current user
      setCurrentUser(user);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return user;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/v1/registration`,
        userData
      );
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (userData) => {
    try {
      setError('');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/v1/user/profile`,
        userData
      );
      
      const updatedUser = response.data.data;
      
      // Update stored user info
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update current user
      setCurrentUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      setError(error.response?.data?.message || 'Profile update failed');
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```
3. Add protected route component:

```javascript
// Create src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;
```

### Step 5: Create Blog Frontend Components

1. Create Blog List component:

```javascript
// Create src/components/Blog/BlogList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../css/blog.css';

const BlogList = () => {
  const { language } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  
  useEffect(() => {
    fetchBlogs();
    fetchTags();
  }, [currentPage, selectedTag]);
  
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `${process.env.REACT_APP_API_URL}/api/v1/blogs?page=${currentPage}`;
      
      if (selectedTag) {
        url += `&tag=${selectedTag}`;
      }
      
      const response = await axios.get(url);
      
      setBlogs(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Fetch blogs error:', error);
      setError(
        language === 'english'
          ? 'Failed to load blogs. Please try again.'
          : 'ब्लॉग लोड करने में विफल। कृपया पुनः प्रयास करें।'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTags = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/v1/blogs/tags`);
      setTags(response.data.data);
    } catch (error) {
      console.error('Fetch tags error:', error);
    }
  };
  
  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
    setCurrentPage(1);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'english' ? 'en-US' : 'hi-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  if (loading && blogs.length === 0) {
    return (
      <div className="blog-container">
        <div className="loading">
          {language === 'english' ? 'Loading blogs...' : 'ब्लॉग लोड हो रहे हैं...'}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="blog-container">
        <div className="error">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="blog-container">
      <div className="blog-header">
        <h1>{language === 'english' ? 'Our Blog' : 'हमारा ब्लॉग'}</h1>
        <p>
          {language === 'english'
            ? 'Read about Thar region issues, animal welfare, and our initiatives'
            : 'थार क्षेत्र के मुद्दों, पशु कल्याण और हमारी पहल के बारे में पढ़ें'}
        </p>
      </div>
      
      {tags.length > 0 && (
        <div className="blog-tags">
          <span className="tag-label">
            {language === 'english' ? 'Filter by:' : 'फ़िल्टर करें:'}
          </span>
          {tags.map((tag) => (
            <button
              key={tag}
              className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      
      <div className="blog-grid">
        {blogs.length > 0 ? (
          blogs.map((blog) => (
            <div className="blog-card" key={blog._id}>
              <div className="blog-image">
                <img
                  src={blog.coverImage || 'https://via.placeholder.com/300x200?text=THAR+NGO'}
                  alt={blog.title}
                />
              </div>
              <div className="blog-content">
                <h2 className="blog-title">
                  <Link to={`/blog/${blog._id}`}>{blog.title}</Link>
                </h2>
                <div className="blog-meta">
                  <span className="blog-author">
                    {language === 'english' ? 'By' : 'द्वारा'} {blog.author.name}
                  </span>
                  <span className="blog-date">{formatDate(blog.createdAt)}</span>
                </div>
                <p className="blog-summary">{blog.summary}</p>
                <div className="blog-tags">
                  {blog.tags.map((tag) => (
                    <span className="blog-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <Link to={`/blog/${blog._id}`} className="read-more">
                  {language === 'english' ? 'Read More' : 'और पढ़ें'} →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="no-blogs">
            {language === 'english'
              ? 'No blogs found. Please check back later.'
              : 'कोई ब्लॉग नहीं मिला। कृपया बाद में फिर से जांचें।'}
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            {language === 'english' ? 'Previous' : 'पिछला'}
          </button>
          
          <span className="pagination-info">
            {language === 'english' ? 'Page' : 'पेज'} {currentPage} {language === 'english' ? 'of' : 'का'} {totalPages}
          </span>
          
          <button
            className="pagination-button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {language === 'english' ? 'Next' : 'अगला'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogList;
```

2. Create Blog Editor component:

```javascript
// Create src/components/Blog/BlogEditor.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import '../../css/blog-editor.css';

const BlogEditor = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    tags: [],
    coverImage: ''
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  useEffect(() => {
    if (id) {
      setIsEdit(true);
      fetchBlog();
    }
  }, [id]);
  
  const fetchBlog = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/v1/blogs/${id}`);
      const blog = response.data.data;
      
      setFormData({
        title: blog.title,
        summary: blog.summary,
        content: blog.content,
        tags: blog.tags,
        coverImage: blog.coverImage
      });
    } catch (error) {
      console.error('Fetch blog error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = language === 'english' ? 'Title is required' : 'शीर्षक आवश्यक है';
    }
    
    if (!formData.summary.trim()) {
      errors.summary = language === 'english' ? 'Summary is required' : 'सारांश आवश्यक है';
    } else if (formData.summary.length > 200) {
      errors.summary = language === 'english' 
        ? 'Summary should be less than 200 characters' 
        : 'सारांश 200 अक्षरों से कम होना चाहिए';
    }
    
    if (!formData.content.trim()) {
      errors.content = language === 'english' ? 'Content is required' : 'सामग्री आवश्यक है';
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };
  
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
      }
      
      setTagInput('');
    }
  };
  
  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        let response;
        
        if (isEdit) {
          response = await axios.put(
            `${process.env.REACT_APP_API_URL}/api/v1/blogs/${id}`,
            formData
          );
        } else {
          response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/v1/blogs`,
            formData
          );
        }
        
        // Redirect to blog detail or user blogs
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') {
          navigate(`/blog/${response.data.data._id}`);
        } else {
          navigate('/my-blogs');
        }
      } catch (error) {
        console.error('Blog submission error:', error);
        setErrors({
          submit: language === 'english'
            ? error.response?.data?.message || 'Failed to submit blog. Please try again.'
            : 'ब्लॉग सबमिट करने में विफल। कृपया पुनः प्रयास करें।'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="blog-editor-container">
        <div className="loading">
          {language === 'english' ? 'Loading blog...' : 'ब्लॉग लोड हो रहा है...'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="blog-editor-container">
      <h1>
        {isEdit
          ? (language === 'english' ? 'Edit Blog Post' : 'ब्लॉग पोस्ट संपादित करें')
          : (language === 'english' ? 'Create New Blog Post' : 'नया ब्लॉग पोस्ट बनाएं')}
      </h1>
      
      {errors.submit && <div className="error-message">{errors.submit}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">
            {language === 'english' ? 'Title' : 'शीर्षक'} *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
            className={errors.title ? 'error' : ''}
          />
          {errors.title && <div className="error-message">{errors.title}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="summary">
            {language === 'english' ? 'Summary' : 'सारांश'} *
            <span className="char-count">
              {formData.summary.length}/200
            </span>
          </label>
          <textarea
            id="summary"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            disabled={isSubmitting}
            className={errors.summary ? 'error' : ''}
            rows="3"
          ></textarea>
          {errors.summary && <div className="error-message">{errors.summary}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="content">
            {language === 'english' ? 'Content' : 'सामग्री'} *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            disabled={isSubmitting}
            className={errors.content ? 'error' : ''}
            rows="15"
          ></textarea>
          {errors.content && <div className="error-message">{errors.content}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="coverImage">
            {language === 'english' ? 'Cover Image URL' : 'कवर इमेज URL'}
          </label>
          <input
            type="text"
            id="coverImage"
            name="coverImage"
            value={formData.coverImage}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tagInput">
            {language === 'english' ? 'Tags' : 'टैग'}
            <span className="tag-hint">
              {language === 'english' ? '(Press Enter to add)' : '(जोड़ने के लिए Enter दबाएं)'}
            </span>
          </label>
          <input
            type="text"
            id="tagInput"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagInputKeyDown}
            disabled={isSubmitting}
          />
          
          <div className="tags-container">
            {formData.tags.map((tag) => (
              <div className="tag" key={tag}>
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            {language === 'english' ? 'Cancel' : 'रद्द करें'}
          </button>
          
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? (language === 'english' ? 'Submitting...' : 'सबमिट हो रहा है...')
              : (isEdit
                ? (language === 'english' ? 'Update Blog' : 'ब्लॉग अपडेट करें')
                : (language === 'english' ? 'Publish Blog' : 'ब्लॉग प्रकाशित करें'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogEditor;
```

### Step 6: Update App.jsx with Routes

```javascript
// Update src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Donate from './pages/Donate';
import Events from './pages/Events';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import BlogList from './components/Blog/BlogList';
import BlogDetail from './components/Blog/BlogDetail';
import BlogEditor from './components/Blog/BlogEditor';
import UserProfile from './components/User/UserProfile';
import AdminDashboard from './components/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BackToTop from './components/BackToTop';
import './index.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/events" element={<Events />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/blogs" element={<BlogList />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            
            {/* Protected Routes - Any authenticated user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/create-blog" element={<BlogEditor />} />
              <Route path="/edit-blog/:id" element={<BlogEditor />} />
            </Route>
            
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
          <Footer />
          <BackToTop />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

## Next Steps

After implementing the above components, you'll have a functional Phase 1 implementation with:

1. User authentication system with different roles
2. Blog creation, approval, and display functionality
3. Contact form submission to backend
4. Newsletter subscription in footer

To complete Phase 1:

1. Create CSS files for the new components
2. Test all functionality thoroughly
3. Deploy the backend to a hosting service (e.g., Heroku, Render, or AWS)
4. Deploy the frontend to a hosting service (e.g., Netlify, Vercel, or Firebase)

In Phase 2, you can implement:
1. Donation processing with Razorpay
2. Expense tracking system
3. Animal help case reporting
4. Certificate generation for donations