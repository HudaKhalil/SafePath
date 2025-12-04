const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Ensure environment variables are loaded
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { uploadProfile, deleteImage, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

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

    // Create user with simplified location handling
    // Note: Database uses 'username' instead of 'name', 'password_hash' instead of 'password'
    let query, values;

    if (latitude && longitude) {
      query = `
        INSERT INTO users (username, email, password_hash, preferences)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, email, created_at
      `;
      // Store location in preferences JSON
      const preferences = JSON.stringify({ latitude, longitude });
      values = [name, email, hashedPassword, preferences];
    } else {
      query = `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING user_id, username, email, created_at
      `;
      values = [name, email, hashedPassword];
    }

    const result = await db.query(query, values);
    const newUser = result.rows[0];

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
    
    // Debug: Check if JWT_SECRET is loaded
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not found in environment, using fallback');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('JWT') || key.includes('SECRET')));
    }
    
    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.user_id,
          name: newUser.username,
          email: newUser.email,
          createdAt: newUser.created_at
        },
        token
      }
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
      'SELECT user_id, username, email, password_hash FROM users WHERE email = $1',
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
// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile route called. req.user:', req.user);
    if (!req.user || !req.user.userId) {
      console.warn('Profile route: req.user or userId missing - rejecting as unauthorized', req.user);
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    // Use correct column names: user_id, username, password_hash, preferences
    const result = await db.query(`
      SELECT 
        user_id, 
        username, 
        email, 
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
    
    // Parse preferences JSON if it exists
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
          phone: preferences.phone || null,
          address: preferences.address || null,
          emergency_contact: preferences.emergency_contact || null,
          preferred_transport: preferences.preferred_transport || null,
          safety_priority: preferences.safety_priority || null,
          notifications: preferences.notifications !== undefined ? preferences.notifications : true,
          profile_picture: preferences.profile_picture || null,
          location: preferences.longitude && preferences.latitude ? {
            longitude: preferences.longitude,
            latitude: preferences.latitude
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
  body('safety_priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid safety priority'),
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
      safety_priority, 
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

    // Update preferences with new values
    if (phone !== undefined) preferences.phone = phone;
    if (address !== undefined) preferences.address = address;
    if (emergency_contact !== undefined) preferences.emergency_contact = emergency_contact;
    if (preferred_transport !== undefined) preferences.preferred_transport = preferred_transport;
    if (safety_priority !== undefined) preferences.safety_priority = safety_priority;
    if (notifications !== undefined) preferences.notifications = notifications;
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

    // Always update preferences if any field changed
    if (phone !== undefined || address !== undefined || emergency_contact !== undefined ||
        preferred_transport !== undefined || safety_priority !== undefined || 
        notifications !== undefined || latitude !== undefined || longitude !== undefined) {
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
      RETURNING user_id, username, email, preferences, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    // Parse preferences for response
    let userPreferences = {};
    if (user.preferences) {
      try {
        userPreferences = typeof user.preferences === 'string'
          ? JSON.parse(user.preferences)
          : user.preferences;
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          phone: userPreferences.phone || null,
          address: userPreferences.address || null,
          emergency_contact: userPreferences.emergency_contact || null,
          preferred_transport: userPreferences.preferred_transport || null,
          safety_priority: userPreferences.safety_priority || null,
          notifications: userPreferences.notifications !== undefined ? userPreferences.notifications : true,
          location: userPreferences.longitude && userPreferences.latitude ? {
            longitude: userPreferences.longitude,
            latitude: userPreferences.latitude
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

module.exports = router;