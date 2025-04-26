const { validationResult } = require('express-validator');
const Contact = require('../models/contact.model');

// Submit a contact form
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

    const { name, email, phone, subject, message } = req.body;
    
    // Create contact entry
    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      subject,
      message
    });

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Your message has been submitted successfully. We will get back to you soon.'
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your message'
    });
  }
};

// Get all contact submissions (admin only)
exports.getContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter by status if provided
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Contact.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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

// Get contact by ID (admin only)
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
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
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching contact'
    });
  }
};

// Update contact status (admin only)
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['NEW', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    contact.status = status;
    await contact.save();
    
    res.status(200).json({
      success: true,
      data: contact,
      message: `Contact status updated to ${status}`
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating contact status'
    });
  }
};