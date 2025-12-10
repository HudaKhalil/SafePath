const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Ensure environment variables are loaded
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { uploadProfile, deleteImage, uploadToCloudinary } = require('../middleware/upload');
const { sendVerificationEmail, sendWelcomeEmail } = require('../lib/emailService');

const router = express.Router();

// Helper function to generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to get token expiration (24 hours from now)
const getTokenExpiration = () => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
};

// Debug environment variables on startup
console.log('Auth router loaded - JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

// Signup endpoint
router.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, latitude, longitude } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT email FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiration = getTokenExpiration();

    // Create user with email verification
    let query, values;

    if (latitude && longitude) {
      query = `
        INSERT INTO users (username, email, password_hash, preferences, is_verified, verification_token, token_expiration)
        VALUES ($1, $2, $3, $4, false, $5, $6)
        RETURNING user_id, username, email, created_at
      `;
      const preferences = JSON.stringify({ latitude, longitude });
      values = [name, email, hashedPassword, preferences, verificationToken, tokenExpiration];
    } else {
      query = `
        INSERT INTO users (username, email, password_hash, is_verified, verification_token, token_expiration)
        VALUES ($1, $2, $3, false, $4, $5)
        RETURNING user_id, username, email, created_at
      `;
      values = [name, email, hashedPassword, verificationToken, tokenExpiration];
    }

    const result = await db.query(query, values);
    const newUser = result.rows[0];

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue - user is created, they can request resend later
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      email: email
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Handle specific database errors
    if (error.code === '23505') {
      // Unique constraint violation (duplicate email)
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === '28P01') {
      // Database connection error
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again later.'
      });
    }

    if (error.code === '42P01') {
      // Table does not exist
      return res.status(503).json({
        success: false,
        message: 'Database not initialized. Please contact administrator.'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email - use correct column names
    const result = await db.query(
      'SELECT user_id, username, email, password_hash, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.warn('Login attempt - no user found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password - use password_hash column
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.warn('Login attempt - invalid password for user_id:', user.user_id, 'email:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      console.warn('Login attempt - unverified email for user_id:', user.user_id, 'email:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate JWT token - use user_id
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
    
    // Debug: Check if JWT_SECRET is loaded
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not found in environment, using fallback');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('JWT') || key.includes('SECRET')));
    }
    
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email address with token
 * @access  Public
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with this token
    const result = await db.query(
      `SELECT user_id, username, email, is_verified, token_expiration 
       FROM users 
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.is_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified. You can log in now.',
        alreadyVerified: true
      });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(user.token_expiration);

    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new one.',
        expired: true
      });
    }

    // Verify the user
    await db.query(
      'UPDATE users SET is_verified = true, verification_token = NULL, token_expiration = NULL WHERE user_id = $1',
      [user.user_id]
    );

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Don't fail the verification if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        email: user.email,
        name: user.username
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const result = await db.query(
      'SELECT user_id, username, email, is_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new token
    const verificationToken = generateVerificationToken();
    const tokenExpiration = getTokenExpiration();

    await db.query(
      'UPDATE users SET verification_token = $1, token_expiration = $2 WHERE user_id = $3',
      [verificationToken, tokenExpiration, user.user_id]
    );

    // Send verification email
    await sendVerificationEmail(user.email, user.username, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending verification email'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile route called. req.user:', req.user);
    if (!req.user || !req.user.userId) {
      console.warn('Profile route: req.user or userId missing - rejecting as unauthorized', req.user);
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    // Use correct column names from actual database schema
    const result = await db.query(`
      SELECT 
        user_id, 
        username, 
        email,
        phone,
        address,
        emergency_contact,
        preferred_transport,
        notifications,
        latitude,
        longitude,
        preferences,
        created_at, 
        updated_at 
      FROM users 
      WHERE user_id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    // Parse preferences JSON for profile_picture (still in JSONB)
    let preferences = {};
    if (user.preferences) {
      try {
        preferences = typeof user.preferences === 'string' 
          ? JSON.parse(user.preferences) 
          : user.preferences;
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          emergency_contact: user.emergency_contact || null,
          preferred_transport: user.preferred_transport || null,
          notifications: user.notifications !== undefined ? user.notifications : true,
          profile_picture: preferences.profile_picture || null,
          location: user.longitude && user.latitude ? {
            longitude: user.longitude,
            latitude: user.latitude
          } : null,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error && error.message);
    console.error(error && error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('phone').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    // More lenient phone validation - just check for digits and common phone characters
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{7,}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Phone number must contain at least 7 digits and only valid phone characters');
    }
    return true;
  }),
  body('address').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    if (value.trim().length < 3) {
      throw new Error('Address must be at least 3 characters');
    }
    return true;
  }),
  body('emergency_contact').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    // More lenient phone validation - just check for digits and common phone characters
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{7,}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Emergency contact must contain at least 7 digits and only valid phone characters');
    }
    return true;
  }),
  body('preferred_transport').optional().isIn(['walking', 'cycling', 'driving']).withMessage('Invalid transport preference'),
  body('notifications').optional().isBoolean().withMessage('Notifications must be true or false'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
  try {
    console.log('Profile update request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      name, 
      phone, 
      address, 
      emergency_contact, 
      preferred_transport, 
      notifications,
      latitude, 
      longitude 
    } = req.body;
    
    // First, get current user preferences
    const currentUserResult = await db.query(
      'SELECT preferences FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse existing preferences
    let preferences = {};
    if (currentUserResult.rows[0].preferences) {
      try {
        preferences = typeof currentUserResult.rows[0].preferences === 'string'
          ? JSON.parse(currentUserResult.rows[0].preferences)
          : currentUserResult.rows[0].preferences;
      } catch (e) {
        console.error('Error parsing existing preferences:', e);
      }
    }

    // Update preferences with new values (for backward compatibility with JSONB)
    if (latitude !== undefined) preferences.latitude = latitude;
    if (longitude !== undefined) preferences.longitude = longitude;

    const updates = [];
    const values = [];
    let paramCount = 1;

    // Update username if name is provided
    if (name !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    // Update individual columns directly (matching your actual database schema)
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }

    if (emergency_contact !== undefined) {
      updates.push(`emergency_contact = $${paramCount}`);
      values.push(emergency_contact);
      paramCount++;
    }

    if (preferred_transport !== undefined) {
      updates.push(`preferred_transport = $${paramCount}`);
      values.push(preferred_transport);
      paramCount++;
    }

    if (notifications !== undefined) {
      updates.push(`notifications = $${paramCount}`);
      values.push(notifications);
      paramCount++;
    }

    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount}`);
      values.push(latitude);
      paramCount++;
    }

    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount}`);
      values.push(longitude);
      paramCount++;
    }

    // Update preferences JSONB for location (for backward compatibility)
    if (latitude !== undefined || longitude !== undefined) {
      updates.push(`preferences = $${paramCount}`);
      values.push(JSON.stringify(preferences));
      paramCount++;
    }

    if (latitude && longitude) {
      updates.push(`location = ST_GeomFromText($${paramCount}, 4326)`);
      values.push(`POINT(${longitude} ${latitude})`);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, email, phone, address, emergency_contact, 
                preferred_transport, notifications, 
                latitude, longitude, preferences, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    // Use individual columns from database (not JSONB)
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          emergency_contact: user.emergency_contact || null,
          preferred_transport: user.preferred_transport || null,
          notifications: user.notifications !== undefined ? user.notifications : true,
          location: user.longitude && user.latitude ? {
            longitude: user.longitude,
            latitude: user.latitude
          } : null,
          updated_at: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload profile picture
router.post('/profile/picture', authenticateToken, (req, res) => {
  console.log('\n🎯 [AUTH] ========== PROFILE PICTURE UPLOAD START ==========');
  console.log('📸 [AUTH] User ID:', req.user.userId);
  console.log('📧 [AUTH] User email:', req.user.email);
  
  uploadProfile(req, res, async (err) => {
    console.log('🔄 [AUTH] Multer processing complete');
    
    if (err) {
      console.error('❌ [AUTH] Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }

    if (!req.file) {
      console.log('❌ [AUTH] No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    console.log('✅ [AUTH] File received by multer');
    console.log('📁 [AUTH] File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    });

    try {
      console.log('🔍 [AUTH] Querying database for current user preferences...');
      
      // Get current user to find old profile picture
      const currentUser = await db.query(
        'SELECT preferences FROM users WHERE user_id = $1',
        [req.user.userId]
      );
      
      console.log('✅ [AUTH] Database query complete');

      if (currentUser.rows.length === 0) {
        console.log('❌ [AUTH] User not found in database');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      console.log('✅ [AUTH] User found in database');

      // Parse existing preferences
      console.log('📋 [AUTH] Parsing user preferences...');
      let preferences = {};
      if (currentUser.rows[0].preferences) {
        try {
          preferences = typeof currentUser.rows[0].preferences === 'string'
            ? JSON.parse(currentUser.rows[0].preferences)
            : currentUser.rows[0].preferences;
          console.log('✅ [AUTH] Preferences parsed. Has old picture:', !!preferences.profile_picture);
        } catch (e) {
          console.error('❌ [AUTH] Error parsing preferences:', e);
        }
      }

      // Upload to Cloudinary
      console.log('☁️  [AUTH] Starting Cloudinary upload...');
      const result = await uploadToCloudinary(req.file.buffer, 'profiles', req.user.userId);
      console.log('✅ [AUTH] Cloudinary upload complete! URL:', result.secure_url);

      // Delete old profile picture if exists
      if (preferences.profile_picture) {
        console.log('🗑️  [AUTH] Deleting old profile picture from Cloudinary...');
        await deleteImage(preferences.profile_picture);
        console.log('✅ [AUTH] Old picture deleted');
      } else {
        console.log('ℹ️  [AUTH] No old profile picture to delete');
      }

      // Update preferences with new Cloudinary URL
      preferences.profile_picture = result.secure_url;
      console.log('✅ [AUTH] Preferences updated with new URL');

      // Update database
      console.log('💾 [AUTH] Saving to database...');
      const updateQuery = `
        UPDATE users 
        SET preferences = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2
        RETURNING user_id
      `;

      await db.query(updateQuery, [JSON.stringify(preferences), req.user.userId]);
      console.log('✅ [AUTH] Database saved successfully');

      console.log('📤 [AUTH] Sending response to client...');
      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profile_picture: preferences.profile_picture,
          url: preferences.profile_picture
        }
      });
      console.log('✅ [AUTH] ========== UPLOAD COMPLETE ==========\n');

    } catch (error) {
      console.error('❌ [AUTH] ERROR OCCURRED:', error.message);
      console.error('❌ [AUTH] Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error saving profile picture: ' + error.message
      });
      console.log('❌ [AUTH] ========== UPLOAD FAILED ==========\n');
    }
  });
});

// Delete profile picture
router.delete('/profile/picture', authenticateToken, async (req, res) => {
  try {
    // Get current user
    const currentUser = await db.query(
      'SELECT preferences FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse preferences
    let preferences = {};
    if (currentUser.rows[0].preferences) {
      try {
        preferences = typeof currentUser.rows[0].preferences === 'string'
          ? JSON.parse(currentUser.rows[0].preferences)
          : currentUser.rows[0].preferences;
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }

    if (!preferences.profile_picture) {
      return res.status(404).json({
        success: false,
        message: 'No profile picture to delete'
      });
    }

    // Delete the file from filesystem
    deleteImage(preferences.profile_picture);

    // Remove from preferences
    delete preferences.profile_picture;

    // Update database
    const updateQuery = `
      UPDATE users 
      SET preferences = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $2
    `;

    await db.query(updateQuery, [JSON.stringify(preferences), req.user.userId]);

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile picture'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email required',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const userResult = await db.query(
      'SELECT user_id, username, email FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiration

    // Store reset token in database
    await db.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
      [resetToken, resetExpires, user.user_id]
    );

    // Send password reset email
    const { sendPasswordResetEmail } = require('../lib/emailService');
    await sendPasswordResetEmail(user.email, user.username, resetToken);

    console.log(`✅ Password reset email sent to: ${email}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find user with valid reset token
    const userResult = await db.query(
      `SELECT user_id, username, email, password_reset_expires 
       FROM users 
       WHERE password_reset_token = $1`,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = userResult.rows[0];

    // Check if token has expired
    const now = new Date();
    if (now > new Date(user.password_reset_expires)) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new password reset.'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await db.query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_token = NULL, 
           password_reset_expires = NULL 
       WHERE user_id = $2`,
      [hashedPassword, user.user_id]
    );

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

/**
 * @route   GET /api/auth/verify-reset-token
 * @desc    Verify if reset token is valid
 * @access  Public
 */
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Check if token exists and is not expired
    const userResult = await db.query(
      `SELECT user_id, password_reset_expires 
       FROM users 
       WHERE password_reset_token = $1`,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = userResult.rows[0];
    const now = new Date();

    if (now > new Date(user.password_reset_expires)) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying reset token'
    });
  }
});

module.exports = router;