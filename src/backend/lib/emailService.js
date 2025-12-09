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
      from: process.env.EMAIL_FROM || "SafePath <noreply@safepath.app>",
      to: email,
      subject: "Verify Your SafePath Account",
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
              background: #0f172a;
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
              color: #0f172a !important;
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
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
              <img src="${process.env.FRONTEND_URL}/logo.png" alt="SafePath" style="width: 40px; height: 40px;">
              <span style="color: white;">SafePath</span>
            </h1>
          </div>
          <div class="content">
            <h2>Welcome to <span style="color: #06d6a0;">SafePath</span>, ${username}! 👋</h2>
            <p style="font-size: 16px;">Thanks for joining our community! Together you'll discover safer routes, report hazards, and help make every journey a little more secure.</p>
            
            <p style="font-size: 16px;">To complete your registration and start using SafePath, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
            </div>
            
            <p style="font-size: 16px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1e3a8a; font-size: 16px;">${verificationUrl}</p>
            
            <div class="warning">
              <strong style="font-size: 16px;">⚠️ Important:</strong> <span style="font-size: 16px;">This verification link will expire in 24 hours.</span>
            </div>
            
            <p style="font-size: 16px;">If you didn't create a SafePath account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>Your Safety, Our Priority</p>
            <p>SafePath Development Team, Dublin, Ireland</p>
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
      `.trim(),
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
              background: #0f172a;
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
            .login-button {
              display: inline-block;
              padding: 15px 30px;
              background: #06d6a0;
              color: #0f172a !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
              <img src="${process.env.FRONTEND_URL}/logo.png" alt="SafePath" style="width: 40px; height: 40px;">
              <span style="color: white;">SafePath</span>
            </h1>
          </div>
          <div class="content">
            <h2>Welcome to <span style="color: #06d6a0;">SafePath</span>, ${username}! 🎉</h2>
            <p style="font-size: 16px;">Your account is now verified and ready to go.</p>
            
            <ul style="line-height: 2; font-size: 16px;">
              <li>Plan safer routes</li>
              <li>Report and view hazards</li>
              <li>Find travel buddies</li>
            </ul>
            
            <p style="font-size: 16px;">Ready to start? <a href="${process.env.FRONTEND_URL}/auth/login" style="color: #06d6a0; text-decoration: none; font-weight: bold;">Log in</a> and plan your first safe journey with <a href="https://safepath-deploy.vercel.app" style="color: #06d6a0; text-decoration: none; font-weight: bold;" target="_blank" rel="noopener noreferrer">SafePath</a>.</p>
            
            <p style="margin-top: 30px; font-size: 16px;">Stay safe,<br><strong>SafePath Development Team</strong></p>
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

// Send password reset email
const sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "SafePath <noreply@safepath.app>",
      to: email,
      subject: "Reset Your SafePath Password",
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
              background: #0f172a;
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
              color: #0f172a !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info {
              background: #e7f3ff;
              border-left: 4px solid #2196f3;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
              <img src="${process.env.FRONTEND_URL}/logo.png" alt="SafePath" style="width: 40px; height: 40px;">
              <span style="color: white;">SafePath</span>
            </h1>
          </div>
          <div class="content">
            <h2>Password Reset Request 🔐</h2>
            <p style="font-size: 16px;">Hi ${username},</p>
            <p style="font-size: 16px;">We received a request to reset your password for your SafePath account. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">Reset Password</a>
            </div>
            
            <p style="font-size: 16px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 14px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul style="margin: 10px 0;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, you can safely ignore this email</li>
                <li>Your password will remain unchanged unless you click the link above</li>
              </ul>
            </div>
            
            <div class="info">
              <strong>🛡️ Security Tip:</strong> Never share your password with anyone. SafePath will never ask for your password via email.
            </div>
            
            <p style="margin-top: 30px; font-size: 16px;">Stay safe,<br><strong>SafePath Security Team</strong></p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};