const nodemailer = require('nodemailer');

/**
 * Email Service for sending various types of emails
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Send verification email
   * @param {string} to - Recipient email
   * @param {string} token - Verification token
   * @returns {Promise} - Nodemailer send mail promise
   */
  async sendVerificationEmail(to, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"Sanjivani NGO" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Email Verification - Sanjivani NGO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Verify Your Email Address</h2>
          <p>Thank you for registering with Sanjivani NGO. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Best regards,<br>The Sanjivani NGO Team</p>
        </div>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send donation receipt email
   * @param {string} to - Recipient email
   * @param {Object} donation - Donation details
   * @returns {Promise} - Nodemailer send mail promise
   */
  async sendDonationReceipt(to, donation) {
    const mailOptions = {
      from: `"Sanjivani NGO" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Donation Receipt - Sanjivani NGO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Thank You for Your Donation!</h2>
          <p>Dear Donor,</p>
          <p>Thank you for your generous donation to Sanjivani NGO. Your contribution will help us continue our mission.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4a5568;">Donation Details</h3>
            <p><strong>Donation ID:</strong> ${donation.orderId}</p>
            <p><strong>Amount:</strong> ₹${donation.amount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${donation.donationDate}</p>
            <p><strong>Payment ID:</strong> ${donation.paymentId}</p>
            <p><strong>Status:</strong> ${donation.status}</p>
          </div>
          <p>Your generosity makes a real difference in the lives of those we serve.</p>
          <p>Best regards,<br>The Sanjivani NGO Team</p>
        </div>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();