const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send verification email
const sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SafePath <noreply@safepath.app>',
      to: email,
      subject: 'Verify Your SafePath Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #06d6a0 0%, #059669 100%);
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background: #06d6a0;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛡️ SafePath</h1>
          </div>
          <div class="content">
            <h2>Welcome to SafePath, ${username}! 👋</h2>
            <p>Thank you for signing up! We're excited to help you navigate safely through London.</p>
            
            <p>To complete your registration and start using SafePath, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #06d6a0;">${verificationUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If you didn't create a SafePath account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>SafePath - Your Safety, Our Priority</p>
            <p>TUD Grangegorman Campus, Dublin, Ireland</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to SafePath, ${username}!

Thank you for signing up! To complete your registration, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create a SafePath account, you can safely ignore this email.

SafePath - Your Safety, Our Priority
      `.trim()
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SafePath <noreply@safepath.app>',
      to: email,
      subject: 'Welcome to SafePath! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #06d6a0 0%, #059669 100%);
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .feature {
              margin: 15px 0;
              padding: 15px;
              background: white;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Welcome to SafePath!</h1>
          </div>
          <div class="content">
            <h2>Your account is now active, ${username}!</h2>
            <p>You can now enjoy all the features SafePath has to offer:</p>
            
            <div class="feature">
              <strong>🗺️ Safe Route Planning</strong>
              <p>Get personalized routes based on real-time safety data</p>
            </div>
            
            <div class="feature">
              <strong>⚠️ Hazard Reporting</strong>
              <p>Report and view hazards to help keep the community safe</p>
            </div>
            
            <div class="feature">
              <strong>👥 Find Travel Buddies</strong>
              <p>Connect with others traveling similar routes</p>
            </div>
            
            <p>Ready to start your safe journey? Log in now and explore!</p>
            
            <p style="margin-top: 30px;">Stay safe,<br><strong>The SafePath Team</strong></p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw - welcome email is not critical
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail
};