const express = require('express');
const { body, validationResult } = require('express-validator');
const routeCalculator = require('../lib/routeCalculator');
const csvDataLoader = require('../lib/csvDataLoader');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * Find routes between two points (with authentication)
 * POST /api/routes/find
 */
router.post('/find', authenticateToken, [
  body('fromLat').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude required'),
  body('fromLon').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude required'),
  body('toLat').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude required'),
  body('toLon').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude required'),
  body('mode').optional().isIn(['walking', 'cycling', 'driving']).withMessage('Invalid transport mode')
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

    const { fromLat, fromLon, toLat, toLon, mode = 'cycling' } = req.body;

    console.log('Finding routes:', { fromLat, fromLon, toLat, toLon, mode });

    // Calculate routes
    const result = await routeCalculator.calculateRoutes(
      fromLat,
      fromLon,
      toLat,
      toLon,
      mode
    );

    res.json({
      success: true,
      data: result,
      provider: 'SafePath API'
    });

  } catch (error) {
    console.error('Route finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Calculate routes between two points
 * POST /api/routes/calculate
 */
router.post('/calculate', [
  body('from.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude required'),
  body('from.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude required'),
  body('to.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude required'),
  body('to.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude required'),
  body('mode').optional().isIn(['walking', 'cycling', 'driving']).withMessage('Invalid transport mode')
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

    const { from, to, mode = 'walking' } = req.body;

    // Calculate routes
    const result = await routeCalculator.calculateRoutes(
      from.lat,
      from.lon,
      to.lat,
      to.lon,
      mode
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get safety score for a specific location
 * GET /api/routes/safety-score
 */
router.get('/safety-score', [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lon').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
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

    const { lat, lon } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    const safetyScore = csvDataLoader.getSafetyScoreForLocation(latitude, longitude);

    res.json({
      success: true,
      data: {
        location: { latitude, longitude },
        safetyScore: parseFloat(safetyScore.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Safety score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get safety score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get crime data statistics
 * GET /api/routes/stats
 */
router.get('/stats', async (req, res) => {
  try {
    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    const stats = csvDataLoader.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

