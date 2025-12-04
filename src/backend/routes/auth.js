const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendVerificationEmail, sendWelcomeEmail } = require('../lib/emailService');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

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

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user (sends verification email)
 * @access  Public
 */
router.post('/signup', signupValidation, async (req, res) => {
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
    const existingUser = await db.query(
      'SELECT user_id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // If user exists but not verified, resend verification email
      if (!user.is_verified) {
        const verificationToken = generateVerificationToken();
        const tokenExpiration = getTokenExpiration();
        
        await db.query(
          'UPDATE users SET verification_token = $1, token_expires_at = $2 WHERE user_id = $3',
          [verificationToken, tokenExpiration, user.user_id]
        );
        
        await sendVerificationEmail(email, name, verificationToken);
        
        return res.status(200).json({
          success: true,
          message: 'Account already exists but not verified. Verification email resent.',
          requiresVerification: true
        });
      }
      
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiration = getTokenExpiration();

    // Create preferences object
    const preferences = {
      ...(latitude && longitude && {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      })
    };

    // Insert new user (not verified yet)
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, preferences, is_verified, verification_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, username, email, created_at`,
      [name, email, passwordHash, JSON.stringify(preferences), false, verificationToken, tokenExpiration]
    );

    const newUser = result.rows[0];

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Continue anyway - user is created, they can request resend
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      requiresVerification: true,
      data: {
        user: {
          id: newUser.user_id,
          name: newUser.username,
          email: newUser.email,
          createdAt: newUser.created_at
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup'
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
      `SELECT user_id, username, email, is_verified, token_expires_at 
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
    const expiresAt = new Date(user.token_expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new one.',
        expired: true
      });
    }

    // Verify the user
    await db.query(
      `UPDATE users 
       SET is_verified = true, verification_token = NULL, token_expires_at = NULL 
       WHERE user_id = $1`,
      [user.user_id]
    );

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the verification if welcome email fails
    }

    // Generate JWT token for auto-login
    const jwtToken = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      data: {
        token: jwtToken,
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email
        }
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
      'UPDATE users SET verification_token = $1, token_expires_at = $2 WHERE user_id = $3',
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

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res) => {
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

    // Find user
    const result = await db.query(
      'SELECT user_id, username, email, password_hash, is_verified, preferences FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          preferences: user.preferences
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, email, preferences, created_at FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          preferences: user.preferences,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, emergency_contact, preferred_transport, safety_priority, notifications, latitude, longitude, factorWeights } = req.body;
    
    // Get current user data
    const currentUser = await db.query(
      'SELECT username, preferences FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentPreferences = currentUser.rows[0].preferences || {};
    const currentName = currentUser.rows[0].username;

    // Build updated preferences
    const updatedPreferences = {
      ...currentPreferences,
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(emergency_contact !== undefined && { emergency_contact }),
      ...(preferred_transport !== undefined && { preferred_transport }),
      ...(safety_priority !== undefined && { safety_priority }),
      ...(notifications !== undefined && { notifications }),
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      ...(factorWeights !== undefined && { factorWeights })
    };

    // Update user
    const result = await db.query(
      'UPDATE users SET username = $1, preferences = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING user_id, username, email, preferences',
      [name || currentName, JSON.stringify(updatedPreferences), req.user.userId]
    );

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.user_id,
          name: updatedUser.username,
          email: updatedUser.email,
          preferences: updatedUser.preferences
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/profile/picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get current preferences
    const currentUser = await db.query(
      'SELECT preferences FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    const currentPreferences = currentUser.rows[0]?.preferences || {};
    
    // Delete old profile picture if exists
    if (currentPreferences.profile_picture) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(currentPreferences.profile_picture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update preferences with new picture path
    const pictureUrl = `/uploads/${req.file.filename}`;
    const updatedPreferences = {
      ...currentPreferences,
      profile_picture: pictureUrl
    };

    await db.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [JSON.stringify(updatedPreferences), req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: pictureUrl
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   DELETE /api/auth/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/profile/picture', authenticateToken, async (req, res) => {
  try {
    // Get current preferences
    const currentUser = await db.query(
      'SELECT preferences FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    const currentPreferences = currentUser.rows[0]?.preferences || {};
    
    // Delete profile picture file if exists
    if (currentPreferences.profile_picture) {
      const picturePath = path.join(__dirname, '../uploads', path.basename(currentPreferences.profile_picture));
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
    }

    // Remove profile_picture from preferences
    const updatedPreferences = { ...currentPreferences };
    delete updatedPreferences.profile_picture;

    await db.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [JSON.stringify(updatedPreferences), req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;