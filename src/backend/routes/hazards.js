const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const websocketService = require('../lib/websocketService');

const router = express.Router();

console.log('🎯 Hazard routes initialized with WebSocket service');

// Report a new hazard (protected route) - OPTIMIZED VERSION
router.post('/', authenticateToken, [
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('type').isIn([
    'construction', 'accident', 'crime', 'flooding', 'poor_lighting', 
    'road_damage', 'pothole', 'unsafe_crossing', 'broken_glass', 
    'suspicious_activity', 'vandalism', 'other', 'Road Damage', 'Pothole'
  ]).withMessage('Invalid hazard type'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('affectsTraffic').optional().isBoolean().withMessage('affectsTraffic must be boolean'),
  body('weatherRelated').optional().isBoolean().withMessage('weatherRelated must be boolean')
], async (req, res) => {
  try {
    console.log('📝 Received hazard report:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      description, 
      latitude, 
      longitude, 
      type: hazardType, 
      severity = 'medium',
      affectsTraffic = false,
      weatherRelated = false
    } = req.body;

    // Use optimized prepared statement for performance
    const result = await query(`
      INSERT INTO hazards (
        user_id, description, location, latitude, longitude, hazard_type, severity, 
        metadata, reported_at
      )
      VALUES ($1, $2, ST_SetSRID(ST_Point($4, $3), 4326)::geography, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING 
        id, description, hazard_type, severity,
        latitude, longitude, reported_at, status
    `, [
      req.user.userId, 
      description, 
      latitude, 
      longitude, 
      hazardType.toLowerCase().replace(' ', '_'), 
      severity, 
      JSON.stringify({ affectsTraffic, weatherRelated })
    ]);

    const hazard = result.rows[0];
    
    console.log(`✅ New hazard reported: ID ${hazard.id}, Type: ${hazard.hazard_type}, Severity: ${hazard.severity}`);

    // Broadcast to WebSocket clients in real‑time (replaces PostgreSQL trigger)
    websocketService.broadcastNewHazard({
      id: hazard.id,
      hazard_type: hazard.hazard_type,
      severity: hazard.severity,
      description: hazard.description,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      status: hazard.status,
      reported_at: hazard.reported_at
    });

    res.status(201).json({
      success: true,
      message: 'Hazard reported successfully! Nearby users will be notified in real‑time.',
      data: {
        hazard: {
          id: hazard.id,
          description: hazard.description,
          location: {
            latitude: hazard.latitude,
            longitude: hazard.longitude
          },
          hazardType: hazard.hazard_type,
          severity: hazard.severity,
          reportedAt: hazard.reported_at,
          status: hazard.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Report hazard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all hazards with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      hazardType, 
      severity, 
      resolved,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let queryText = `
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity,
        h.latitude,
        h.longitude,
        h.reported_at,
        h.status
      FROM hazards h
    `;
    
    const params = [];
    const conditions = [];

    if (hazardType) {
      conditions.push(`h.hazard_type = $${params.length + 1}`);
      params.push(hazardType);
    }

    if (severity) {
      conditions.push(`h.severity = $${params.length + 1}`);
      params.push(severity);
    }

    if (resolved !== undefined) {
      const status = resolved === 'true' ? 'resolved' : 'active';
      conditions.push(`h.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ` ORDER BY h.reported_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      location: {
        latitude: hazard.latitude,
        longitude: hazard.longitude
      },
      hazardType: hazard.hazard_type,
      severity: hazard.severity,
      status: hazard.status,
      reportedAt: hazard.reported_at
    }));

    res.json({
      success: true,
      data: {
        hazards,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: hazards.length
        }
      }
    });

  } catch (error) {
    console.error('Get hazards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get hazards near a location
router.get('/near/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { radius = 2000, limit = 20 } = req.query; // radius in meters

    const result = await query(`
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity,
        h.latitude,
        h.longitude,
        h.reported_at,
        h.status,
        ST_Distance(
          h.location::geography, 
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) as distance_meters
      FROM hazards h
      WHERE ST_DWithin(
        h.location::geography, 
        ST_SetSRID(ST_Point($2, $1), 4326)::geography, 
        $3
      )
      AND (h.status IS NULL OR h.status != 'resolved')
      ORDER BY distance_meters ASC, h.reported_at DESC
      LIMIT $4
    `, [latitude, longitude, radius, limit]);

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      location: {
        latitude: hazard.latitude,
        longitude: hazard.longitude
      },
      hazardType: hazard.hazard_type,
      severity: hazard.severity,
      status: hazard.status,
      reportedAt: hazard.reported_at,
      distanceMeters: Math.round(hazard.distance_meters)
    }));

    res.json({
      success: true,
      data: {
        hazards,
        searchLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radiusMeters: parseInt(radius)
      }
    });

  } catch (error) {
    console.error('Get nearby hazards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


module.exports = router;