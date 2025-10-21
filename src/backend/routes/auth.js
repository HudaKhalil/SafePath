const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

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
    let query, values;

    if (latitude && longitude) {
      query = `
        INSERT INTO users (name, email, password, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, created_at
      `;
      values = [name, email, hashedPassword, latitude, longitude];
    } else {
      query = `
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
      `;
      values = [name, email, hashedPassword];
    }

    const result = await db.query(query, values);
    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
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