# THAR NGO Website Implementation Plan

Based on the analysis of the existing codebase and the requirements, this document outlines a step-by-step implementation plan for connecting the frontend and backend, implementing the required features, and enhancing the authentication system.

## Current State Analysis

### Frontend
- React-based frontend with components for initiatives, donations, contact form, etc.
- Contact form collects data but doesn't send it to the backend
- Newsletter form in the footer doesn't connect to the backend
- No authentication UI (login/signup) implemented yet

### Backend
- Node.js/Express server with MongoDB connection
- Basic authentication system with only two roles: 'USER' and 'ADMIN'
- No contact form or newsletter subscription endpoints
- No blog or expense tracking functionality

## Implementation Steps

### Phase 1: Backend Enhancements

#### 1. Expand User Model
```javascript
// Update user.model.js to include additional roles and fields
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['VISITOR', 'DONOR', 'TEAM', 'ADMIN', 'SUPERADMIN'],
    default: 'VISITOR'
  },
  logs: {
    type: [String],
    default: []
  },
  isLocked: {
    type: Boolean,
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
```

#### 2. Create Contact Form Model and API
```javascript
// Create models/contact.model.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

const Contact = mongoose.model('Contact', contactSchema);
module.exports = Contact;
```

```javascript
// Create controllers/contact.controller.js
const { validationResult } = require('express-validator');
const Contact = require('../models/contact.model');

exports.submitContact = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, subject, message } = req.body;

    // Create new contact submission
    const contact = await Contact.create({
      name,
      email,
      subject,
      message
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during form submission'
    });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching contacts'
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Mark contact as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred'
    });
  }
};
```

```javascript
// Create routes/contact.routes.js
const express = require('express');
const { check } = require('express-validator');
const contactController = require('../controllers/contact.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Submit contact form
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('subject', 'Subject is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty()
  ],
  contactController.submitContact
);

// Get all contacts (admin only)
router.get(
  '/',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.getContacts
);

// Mark contact as read
router.put(
  '/:id/read',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.markAsRead
);

module.exports = router;
```

#### 3. Create Newsletter Model and API
```javascript
// Create models/newsletter.model.js
const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  isSubscribed: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  }
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
module.exports = Newsletter;
```

```javascript
// Create controllers/newsletter.controller.js
const { validationResult } = require('express-validator');
const Newsletter = require('../models/newsletter.model');

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
    const existingSubscription = await Newsletter.findOne({ email });
    if (existingSubscription) {
      // If already subscribed, return success
      if (existingSubscription.isSubscribed) {
        return res.status(200).json({
          success: true,
          message: 'Email already subscribed to newsletter'
        });
      }
      
      // If previously unsubscribed, resubscribe
      existingSubscription.isSubscribed = true;
      await existingSubscription.save();
      
      return res.status(200).json({
        success: true,
        message: 'Successfully resubscribed to newsletter'
      });
    }

    // Create new subscription
    await Newsletter.create({ email });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during subscription'
    });
  }
};

exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({ isSubscribed: true }).sort({ subscribedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: subscribers.length,
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

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.params;
    
    const subscription = await Newsletter.findOne({ email });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    subscription.isSubscribed = false;
    await subscription.save();
    
    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during unsubscription'
    });
  }
};
```

```javascript
// Create routes/newsletter.routes.js
const express = require('express');
const { check } = require('express-validator');
const newsletterController = require('../controllers/newsletter.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Subscribe to newsletter
router.post(
  '/subscribe',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  newsletterController.subscribe
);

// Get all subscribers (admin only)
router.get(
  '/',
  protect,
  authorize('ADMIN', 'SUPERADMIN'),
  newsletterController.getSubscribers
);

// Unsubscribe from newsletter
router.put(
  '/unsubscribe/:email',
  newsletterController.unsubscribe
);

module.exports = router;
```

#### 4. Update Server.js to Include New Routes
```javascript
// Update server.js to include new routes
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
### Phase 2: Frontend Implementation

#### 1. Connect Contact Form to Backend
```javascript
// Update ContactForm.jsx
import React, { useState } from 'react';
import contact from "../assets/contactus.png";
import '../css/contactForm.css';
import { useLanguage } from '../contexts/LanguageContext';
import { getText } from '../constants/languages';
import axios from 'axios'; // Import axios

function ContactForm() {
    const { language } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({
        success: false,
        message: ''
    });

    const validateForm = () => {
        let errors = {};
        let isValid = true;

        if (!formData.name.trim()) {
            errors.name = language === 'english' ? 'Please enter your name' : 'कृपया अपना नाम दर्ज करें';
            isValid = false;
        }

        if (!formData.email.trim()) {
            errors.email = language === 'english' ? 'Please enter your email' : 'कृपया अपना ईमेल दर्ज करें';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = language === 'english' ? 'Please enter a valid email address' : 'कृपया एक वैध ईमेल पता दर्ज करें';
            isValid = false;
        }

        if (!formData.subject.trim()) {
            errors.subject = language === 'english' ? 'Please enter a subject' : 'कृपया एक विषय दर्ज करें';
            isValid = false;
        }

        if (!formData.message.trim()) {
            errors.message = language === 'english' ? 'Please enter your message' : 'कृपया अपना संदेश दर्ज करें';
            isValid = false;
        }

        setErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            setIsSubmitting(true);
            
            try {
                // Send form data to backend
                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL}/api/v1/contact`,
                    formData
                );
                
                // Handle success
                setSubmitStatus({
                    success: true,
                    message: language === 'english'
                        ? "✔ Message Sent Successfully!"
                        : "✔ संदेश सफलतापूर्वक भेजा गया!"
                });
                
                // Reset form fields
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: ''
                });
            } catch (error) {
                // Handle error
                console.error('Contact form submission error:', error);
                setSubmitStatus({
                    success: false,
                    message: language === 'english'
                        ? "❌ Failed to send message. Please try again."
                        : "❌ संदेश भेजने में विफल। कृपया पुनः प्रयास करें।"
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };
    
    return (
        <>
            {/* <!-- Contact Start --> */}
            <div className="contact">
                <div className="container">
                    <div className="section-header text-center">
                        <h3>{getText('contact', 'contactTitle', language)}</h3>
                        <h2>{getText('contact', 'contactSubtitle', language)}</h2>
                    </div>
                    <div className="contact-img">
                        <img src={contact} alt="Image" />
                    </div>
                    <div className="contact-form">
                        {submitStatus.message && (
                            <div className={`sent text-${submitStatus.success ? 'success' : 'danger'}`}>
                                {submitStatus.message}
                            </div>
                        )}
                        <form name="sentMessage" id="contactForm" onSubmit={handleSubmit} noValidate>
                            <div className="control-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="name"
                                    placeholder={getText('contact', 'namePlaceholder', language)}
                                    value={formData.name}
                                    onChange={handleChange}
                                    autoComplete='name'
                                    required
                                    disabled={isSubmitting}
                                />
                                <p className="text-danger">{errors.name}</p>
                            </div>
                            <div className="control-group">
                                <input
                                    type="email"
                                    className="form-control"
                                    id="email"
                                    placeholder={getText('contact', 'emailPlaceholder', language)}
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete='email'
                                    required
                                    disabled={isSubmitting}
                                />
                                <p className="text-danger">{errors.email}</p>
                            </div>
                            <div className="control-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="subject"
                                    placeholder={getText('contact', 'subjectPlaceholder', language)}
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    disabled={isSubmitting}
                                />
                                <p className="text-danger">{errors.subject}</p>
                            </div>
                            <div className="control-group">
                                <textarea
                                    className="form-control"
                                    id="message"
                                    placeholder={getText('contact', 'messagePlaceholder', language)}
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    disabled={isSubmitting}
                                ></textarea>
                                <p className="text-danger">{errors.message}</p>
                            </div>
                            <div>
                                <button
                                    className="btn btn-custom"
                                    type="submit"
                                    id="sendMessageButton"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting 
                                        ? (language === 'english' ? 'Sending...' : 'भेज रहा है...') 
                                        : getText('contact', 'sendButton', language)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* <!-- Contact End --> */}
        </>
    );
}

export default ContactForm;
```

#### 2. Connect Newsletter Form to Backend
```javascript
// Update Footer.jsx
import React, { useState } from 'react';
import '../css/footer.css';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios'; // Import axios

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const { language } = useLanguage();
    
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({
        success: false,
        message: ''
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate email
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setSubmitStatus({
                success: false,
                message: language === 'english' 
                    ? 'Please enter a valid email address' 
                    : 'कृपया एक वैध ईमेल पता दर्ज करें'
            });
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Send subscription request to backend
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/v1/newsletter/subscribe`,
                { email }
            );
            
            // Handle success
            setSubmitStatus({
                success: true,
                message: language === 'english'
                    ? 'Successfully subscribed to newsletter!'
                    : 'न्यूज़लेटर की सदस्यता सफलतापूर्वक ली गई!'
            });
            
            // Reset form
            setEmail('');
        } catch (error) {
            // Handle error
            console.error('Newsletter subscription error:', error);
            setSubmitStatus({
                success: false,
                message: language === 'english'
                    ? 'Failed to subscribe. Please try again.'
                    : 'सदस्यता लेने में विफल। कृपया पुनः प्रयास करें।'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="footer">
            <div className="container">
                <div className="row">
                    <div className="col-lg-3 col-md-6">
                        <div className="footer-contact">
                            <h2>{language === 'english' ? 'Contact Us' : 'संपर्क करें'}</h2>
                            <a href="#"><p><i className="fa fa-map-marker-alt"></i>123 Main Street, City, Country</p></a>
                            <a href="#"><p><i className="fa fa-phone"></i>+91-1234567890</p></a>
                            <a href="#"><p><i className="fa fa-envelope"></i>contact@tharngo.org</p></a>
                            <div className="footer-social">
                                <a className="btn btn-custom" href="#"><i className="fab fa-x-twitter"></i></a>
                                <a className="btn btn-custom" href="#"><i className="fab fa-facebook-f"></i></a>
                                <a className="btn btn-custom" href="#"><i className="fab fa-instagram"></i></a>
                                <a className="btn btn-custom" href="#"><i className="fab fa-youtube"></i></a>
                                <a className="btn btn-custom" href="#"><i className="fab fa-linkedin-in"></i></a>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <div className="footer-link">
                            <h2>{language === 'english' ? 'Popular Links' : 'लोकप्रिय लिंक'}</h2>
                            <a href="/about">{language === 'english' ? 'About Us' : 'हमारे बारे में'}</a>
                            <a href="/contact">{language === 'english' ? 'Contact Us' : 'संपर्क करें'}</a>
                            <a href="/event">{language === 'english' ? 'Popular Causes' : 'लोकप्रिय कारण'}</a>
                            <a href="/event">{language === 'english' ? 'Upcoming Events' : 'आगामी कार्यक्रम'}</a>
                            <a href="#">{language === 'english' ? 'Latest Blog' : 'नवीनतम ब्लॉग'}</a>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <div className="footer-link">
                            <h2>{language === 'english' ? 'Useful Links' : 'उपयोगी लिंक'}</h2>
                            <a href="#">{language === 'english' ? 'Terms of use' : 'उपयोग की शर्तें'}</a>
                            <a href="#">{language === 'english' ? 'Privacy policy' : 'गोपनीयता नीति'}</a>
                            <a href="#">{language === 'english' ? 'Cookies' : 'कुकीज़'}</a>
                            <a href="#">{language === 'english' ? 'Help' : 'सहायता'}</a>
                            <a href="#">{language === 'english' ? 'FAQs' : 'अक्सर पूछे जाने वाले प्रश्न'}</a>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <div className="footer-newsletter">
                            <h2>{language === 'english' ? 'Newsletter' : 'न्यूज़लेटर'}</h2>
                            {submitStatus.message && (
                                <div className={`newsletter-message text-${submitStatus.success ? 'success' : 'danger'}`}>
                                    {submitStatus.message}
                                </div>
                            )}
                            <form name='NewsLetter' onSubmit={handleSubmit}>
                                <input
                                    name='subscribe'
                                    className="form-control"
                                    placeholder={language === 'english' ? "Email goes here" : "ईमेल यहां दर्ज करें"}
                                    autoComplete='email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                                <button 
                                    className="btn btn-custom"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting 
                                        ? (language === 'english' ? 'Submitting...' : 'सबमिट कर रहा है...') 
                                        : (language === 'english' ? 'Submit' : 'सबमिट करें')}
                                </button>
                                <h6>{language === 'english' ? "Don't worry, we don't spam!" : "चिंता न करें, हम स्पैम नहीं करते!"}</h6>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container copyright">
                <div className="row">
                    <div className="col-md-6">
                        <p>&copy; <a href="#">THE THAR NGO</a> | {currentYear}, {language === 'english' ? 'All Rights Reserved.' : 'सर्वाधिकार सुरक्षित।'}</p>
                    </div>
                    <div className="col-md-6">
                        <p>{language === 'english' ? 'Designed By' : 'डिज़ाइन'} <a href="#">{language === 'english' ? 'Web Development Team' : 'वेब डेवलपमेंट टीम'}</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

#### 3. Create Authentication UI Components

```javascript
// Create src/components/Auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../css/auth.css';

const Login = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = language === 'english' ? 'Email is required' : 'ईमेल आवश्यक है';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = language === 'english' ? 'Invalid email format' : 'अमान्य ईमेल प्रारूप';
    }
    
    if (!formData.password) {
      errors.password = language === 'english' ? 'Password is required' : 'पासवर्ड आवश्यक है';
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      setSubmitError('');
      
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/v1/registration/auth`,
          formData
        );
        
        // Store token and user info in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect based on user role
        const { role } = response.data.user;
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Login error:', error);
        setSubmitError(
          language === 'english'
            ? error.response?.data?.message || 'Login failed. Please try again.'
            : 'लॉगिन विफल। कृपया पुनः प्रयास करें।'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>{language === 'english' ? 'Login to Your Account' : 'अपने खाते में लॉग इन करें'}</h2>
        
        {submitError && <div className="auth-error">{submitError}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              {language === 'english' ? 'Email Address' : 'ईमेल पता'}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              {language === 'english' ? 'Password' : 'पासवर्ड'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>
          
          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting 
              ? (language === 'english' ? 'Logging in...' : 'लॉग इन हो रहा है...') 
              : (language === 'english' ? 'Login' : 'लॉग इन करें')}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/forgot-password">
            {language === 'english' ? 'Forgot Password?' : 'पासवर्ड भूल गए?'}
          </Link>
          <Link to="/register">
            {language === 'english' ? 'Don\'t have an account? Register' : 'खाता नहीं है? रजिस्टर करें'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
```

```javascript
// Create src/components/Auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../css/auth.css';

const Register = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name) {
      errors.name = language === 'english' ? 'Name is required' : 'नाम आवश्यक है';
    }
    
    if (!formData.email) {
      errors.email = language === 'english' ? 'Email is required' : 'ईमेल आवश्यक है';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = language === 'english' ? 'Invalid email format' : 'अमान्य ईमेल प्रारूप';
    }
    
    if (!formData.phone) {
      errors.phone = language === 'english' ? 'Phone number is required' : 'फोन नंबर आवश्यक है';
    }
    
    if (!formData.password) {
      errors.password = language === 'english' ? 'Password is required' : 'पासवर्ड आवश्यक है';
    } else if (formData.password.length < 6) {
      errors.password = language === 'english' 
        ? 'Password must be at least 6 characters' 
        : 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = language === 'english' 
        ? 'Passwords do not match' 
        : 'पासवर्ड मेल नहीं खाते';
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      setSubmitError('');
      setSuccess('');
      
      try {
        // Remove confirmPassword before sending to API
        const { confirmPassword, ...registerData } = formData;
        
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/v1/registration`,
          registerData
        );
        
        setSuccess(
          language === 'english'
            ? 'Registration successful! Please check your email to verify your account.'
            : 'पंजीकरण सफल! कृपया अपना खाता सत्यापित करने के लिए अपना ईमेल जांचें।'
        );
        
        // Clear form
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        console.error('Registration error:', error);
        setSubmitError(
          language === 'english'
            ? error.response?.data?.message || 'Registration failed. Please try again.'
            : 'पंजीकरण विफल। कृपया पुनः प्रयास करें।'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>{language === 'english' ? 'Create an Account' : 'खाता बनाएं'}</h2>
        
        {submitError && <div className="auth-error">{submitError}</div>}
        {success && <div className="auth-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              {language === 'english' ? 'Full Name' : 'पूरा नाम'}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              disabled={isSubmitting || success}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">
              {language === 'english' ? 'Email Address' : 'ईमेल पता'}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              disabled={isSubmitting || success}
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">
              {language === 'english' ? 'Phone Number' : 'फोन नंबर'}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error' : ''}
              disabled={isSubmitting || success}
            />
            {errors.phone && <div className="error-message">{errors.phone}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              {language === 'english' ? 'Password' : 'पासवर्ड'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              disabled={isSubmitting || success}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">
              {language === 'english' ? 'Confirm Password' : 'पासवर्ड की पुष्टि करें'}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              disabled={isSubmitting || success}
            />
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>
          
          <button type="submit" className="auth-button" disabled={isSubmitting || success}>
            {isSubmitting 
              ? (language === 'english' ? 'Registering...' : 'पंजीकरण हो रहा है...') 
              : (language === 'english' ? 'Register' : 'पंजीकरण करें')}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/login">
            {language === 'english' ? 'Already have an account? Login' : 'पहले से ही खाता है? लॉग इन करें'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
```

### Phase 3: Next Steps

1. Create Admin Dashboard components
2. Implement Blog creation and management
3. Develop Expense tracking system
4. Set up Donation processing with Razorpay
5. Implement user role management
6. Create protected routes based on user roles
7. Add animal help case reporting functionality
8. Implement certificate generation for donations