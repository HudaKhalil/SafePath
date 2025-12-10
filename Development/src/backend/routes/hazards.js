const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, pool: getPool } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const websocketService = require('../lib/websocketService');
const { uploadHazard, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

console.log('🎯 Hazard routes initialized with WebSocket service');

router.post('/', authenticateToken, (req, res) => {
  // Handle file upload first
  uploadHazard(req, res, async (err) => {
    if (err) {
      console.error('❌ File upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    // Manual validation since express-validator doesn't work well with multer
    const { description, latitude, longitude, type: hazardType, severity = 'medium', affectsTraffic = 'false', weatherRelated = 'false' } = req.body;

    // Validate required fields
    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude required'
      });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid longitude required'
      });
    }

    const validTypes = [
      'construction', 'accident', 'crime', 'flooding', 'poor_lighting', 
      'road_damage', 'pothole', 'unsafe_crossing', 'broken_glass', 
      'suspicious_activity', 'vandalism', 'other', 'Road Damage', 'Pothole'
    ];

    if (!validTypes.includes(hazardType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hazard type'
      });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity level'
      });
    }

    try {
      console.log('📝 Received hazard report:', JSON.stringify(req.body, null, 2));
      
      // Upload to Cloudinary if file was uploaded
      let imageUrl = null;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, 'hazards', req.user.userId);
        imageUrl = result.secure_url;
        console.log('📷 Image uploaded to Cloudinary:', imageUrl);
      }

      // Convert affectsTraffic and weatherRelated from strings to booleans
      const affectsTrafficBool = affectsTraffic === 'true' || affectsTraffic === true;
      const weatherRelatedBool = weatherRelated === 'true' || weatherRelated === true;

      // Use optimized prepared statement for performance
      const result = await query(`
        INSERT INTO hazards (
          user_id, description, location, latitude, longitude, hazard_type, severity, 
          metadata, image_url, reported_at
        )
        VALUES ($1, $2, ST_SetSRID(ST_Point($4, $3), 4326)::geography, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING 
          id, description, hazard_type, severity,
          latitude, longitude, image_url, reported_at, status
      `, [
        req.user.userId, 
        description.trim(), 
        lat, 
        lng, 
        hazardType.toLowerCase().replace(' ', '_'), 
        severity, 
        JSON.stringify({ affectsTraffic: affectsTrafficBool, weatherRelated: weatherRelatedBool }),
        imageUrl
      ]);

      const hazard = result.rows[0];
      
      console.log(`✅ New hazard reported: ID ${hazard.id}, Type: ${hazard.hazard_type}, Severity: ${hazard.severity}${hazard.image_url ? ' with image' : ''}`);

      // Broadcast to WebSocket clients in real-time 
      websocketService.broadcastNewHazard({
        id: hazard.id,
        hazard_type: hazard.hazard_type,
        severity: hazard.severity,
        description: hazard.description,
        latitude: hazard.latitude,
        longitude: hazard.longitude,
        image_url: hazard.image_url,
        status: hazard.status,
        reported_at: hazard.reported_at
      });

      res.status(201).json({
        success: true,
        message: 'Hazard reported successfully! Nearby users will be notified in real-time.',
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
            imageUrl: hazard.image_url,
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
        h.image_url,
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
      image_url: hazard.image_url,
      imageUrl: hazard.image_url,
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
    const { radius = 5000, limit = 50 } = req.query; // radius in meters (increased default to 5km)

    console.log(`🔍 Searching hazards near (${latitude}, ${longitude}) within ${radius}m`);

    const result = await query(`
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity,
        h.latitude,
        h.longitude,
        h.image_url,
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
      AND h.reported_at > NOW() - INTERVAL '6 months'
      ORDER BY distance_meters ASC, h.reported_at DESC
      LIMIT $4
    `, [latitude, longitude, radius, limit]);

    console.log(`✅ Found ${result.rows.length} hazards in area`);

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      location: {
        latitude: hazard.latitude,
        longitude: hazard.longitude
      },
      hazardType: hazard.hazard_type,
      type: hazard.hazard_type,
      severity: hazard.severity,
      status: hazard.status,
      image_url: hazard.image_url,
      imageUrl: hazard.image_url,
      reportedAt: hazard.reported_at,
      created_at: hazard.reported_at,
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

// Update hazard status (protected route)
router.patch('/:id', authenticateToken, [
  body('isResolved').optional().isBoolean().withMessage('isResolved must be a boolean')
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

    const { id } = req.params;
    const { isResolved } = req.body;

    // Check if hazard exists and belongs to user
    const checkResult = await query(
      'SELECT user_id FROM hazards WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own hazard reports'
      });
    }

    const result = await query(`
      UPDATE hazards 
      SET is_resolved = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, description, hazard_type, severity, is_resolved, updated_at
    `, [isResolved, id]);

    const hazard = result.rows[0];

    res.json({
      success: true,
      message: 'Hazard status updated successfully',
      data: {
        hazard: {
          id: hazard.id,
          description: hazard.description,
          hazardType: hazard.hazard_type,
          severity: hazard.severity,
          isResolved: hazard.is_resolved,
          updatedAt: hazard.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Update hazard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get nearby hazards (query param version for flexibility)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 5000, limit = 50 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log(`🔍 [Find Buddy] Searching hazards near (${lat}, ${lon}) within ${radius}m`);

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
    `, [lat, lon, radius, limit]);

    console.log(`✅ [Find Buddy] Found ${result.rows.length} hazards`);

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      hazardType: hazard.hazard_type,
      severity: hazard.severity,
      status: hazard.status,
      reportedAt: hazard.reported_at,
      distanceMeters: Math.round(hazard.distance_meters)
    }));

    res.json({
      success: true,
      data: { hazards }
    });

  } catch (error) {
    console.error('[Find Buddy] Get nearby hazards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/websocket-status', authenticateToken, async (req, res) => {
  try {
    const status = websocketService.getStatus();
    res.json({
      success: true,
      data: {
        ...status,
        message: 'WebSocket service is active. Connect using Socket.IO client.'
      }
    });
  } catch (error) {
    console.error('WebSocket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get recent hazards - OPTIMIZED VERSION using function
router.get('/recent', async (req, res) => {
  const startTime = Date.now();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const { 
      latitude, 
      longitude, 
      radius = 5000, // 5km default for better performance
      limit = 20,
      severity,
      hazardType 
    } = req.query;

    let queryText, params = [];

    if (latitude && longitude) {
      // Use optimized spatial function for <100ms performance
      queryText = `
        SELECT 
          nh.*,
          u.name as reporter_name,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - nh.created_at))/3600 as hours_ago
        FROM get_nearby_hazards($1, $2, $3, $4) nh
        LEFT JOIN users u ON u.id = (
          SELECT user_id FROM hazards WHERE id = nh.id LIMIT 1
        )
      `;
      params = [parseFloat(latitude), parseFloat(longitude), parseInt(radius), parseInt(limit)];
      
      // Add filtering conditions
      let whereClause = '';
      if (severity) {
        whereClause += ` WHERE nh.severity = $${params.length + 1}`;
        params.push(severity);
      }
      if (hazardType) {
        whereClause += severity ? ` AND nh.hazard_type = $${params.length + 1}` : ` WHERE nh.hazard_type = $${params.length + 1}`;
        params.push(hazardType);
      }
      
      queryText += whereClause + ' ORDER BY nh.priority_level DESC, nh.distance_meters ASC';
    } else {
      // Fallback query without location
      queryText = `
        SELECT 
          h.id,
          h.hazard_type,
          h.severity,
          h.description,
          ST_Y(h.location::geometry) as latitude,
          ST_X(h.location::geometry) as longitude,
          h.priority_level,
          h.affects_traffic,
          h.weather_related,
          h.status,
          h.created_at,
          NULL as distance_meters,
          u.name as reporter_name,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - h.created_at))/3600 as hours_ago
        FROM hazards h
        LEFT JOIN users u ON h.user_id = u.id
        WHERE h.status = 'active' 
          AND h.created_at > CURRENT_TIMESTAMP - INTERVAL '48 hours'
      `;
      
      if (severity) {
        queryText += ` AND h.severity = $${params.length + 1}`;
        params.push(severity);
      }
      if (hazardType) {
        queryText += ` AND h.hazard_type = $${params.length + 1}`;
        params.push(hazardType);
      }
      
      queryText += ` ORDER BY h.priority_level DESC, h.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    }

    const result = await client.query(queryText, params);
    const queryTime = Date.now() - startTime;

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      location: {
        latitude: parseFloat(hazard.latitude),
        longitude: parseFloat(hazard.longitude)
      },
      hazardType: hazard.hazard_type,
      severity: hazard.severity,
      priorityLevel: hazard.priority_level,
      affectsTraffic: hazard.affects_traffic,
      weatherRelated: hazard.weather_related,
      status: hazard.status,
      reporterName: hazard.reporter_name,
      createdAt: hazard.created_at,
      hoursAgo: Math.round(hazard.hours_ago * 10) / 10,
      ...(hazard.distance_meters && { distanceMeters: Math.round(hazard.distance_meters) })
    }));

    console.log(`⚡ Recent hazards query completed in ${queryTime}ms (${hazards.length} results)`);

    res.json({
      success: true,
      data: {
        hazards,
        searchLocation: latitude && longitude ? {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        } : null,
        radiusMeters: parseInt(radius),
        totalFound: hazards.length,
        queryTimeMs: queryTime
      }
    });

  } catch (error) {
    console.error('❌ Get recent hazards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Health check endpoint for real-time system
router.get('/health', async (req, res) => {
  try {
    const websocketStatus = websocketService.getStatus();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        message: 'PostgreSQL connected'
      },
      realtime: {
        type: 'WebSocket (Socket.IO)',
        initialized: websocketStatus.initialized,
        activeConnections: websocketStatus.activeConnections
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Test database query performance
    const queryStart = Date.now();
    await query('SELECT COUNT(*) FROM hazards WHERE status = $1', ['active']);
    const queryTime = Date.now() - queryStart;
    
    healthStatus.performance.lastQueryMs = queryTime;
    
    if (queryTime > 1000) {
      healthStatus.status = 'degraded';
      healthStatus.warnings = ['Database query performance degraded'];
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Performance stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const websocketStatus = websocketService.getStatus();
    
    res.json({
      success: true,
      data: {
        realtime: {
          type: 'WebSocket (Socket.IO)',
          activeConnections: websocketStatus.activeConnections,
          initialized: websocketStatus.initialized
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get combined hazards (community + TomTom Traffic) - Proof of Concept for Academic Project
// Demonstrates multi-source data aggregation for comprehensive hazard detection
const tomtomHazardsService = require('../lib/tomtomHazardsService');

router.get('/combined/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { radius = 5000, limit = 100, includeTomTom = 'true' } = req.query;

    console.log(`🔄 [PoC] Fetching combined hazards (community + TomTom) near (${latitude}, ${longitude})`);

    // Fetch community-reported hazards from database
    // Only show hazards from last 6 months (old hazards likely resolved/outdated)
    const communityResult = await query(`
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity,
        h.latitude,
        h.longitude,
        h.image_url,
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
      AND h.reported_at > NOW() - INTERVAL '6 months'
      ORDER BY distance_meters ASC, h.reported_at DESC
      LIMIT $4
    `, [latitude, longitude, radius, limit]);

    const communityHazards = communityResult.rows.map(hazard => ({
      id: hazard.id,
      source: 'community',
      description: hazard.description,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      type: hazard.hazard_type,
      severity: hazard.severity,
      status: hazard.status,
      image_url: hazard.image_url,
      reportedAt: hazard.reported_at,
      distanceMeters: Math.round(hazard.distance_meters),
      verified: false // Community reports pending verification
    }));

    console.log(`✅ Found ${communityHazards.length} community-reported hazards`);

    // Fetch TomTom traffic incidents if requested (for academic demonstration)
    let tomtomHazards = [];
    if (includeTomTom === 'true') {
      console.log(`🚦 [PoC] Querying TomTom Traffic API for incidents...`);
      tomtomHazards = await tomtomHazardsService.getTomTomHazards(
        parseFloat(latitude), 
        parseFloat(longitude), 
        parseInt(radius)
      );
      
      console.log(`✅ Found ${tomtomHazards.length} TomTom traffic incidents`);
    }

    // Merge hazards (remove duplicates within 50m)
    const mergedHazards = mergeHazards(communityHazards, tomtomHazards);

    // Sort by distance
    mergedHazards.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

    res.json({
      success: true,
      data: {
        hazards: mergedHazards,
        searchLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radiusMeters: parseInt(radius),
        stats: {
          total: mergedHazards.length,
          community: communityHazards.length,
          tomtom: tomtomHazards.length,
          merged: mergedHazards.length
        },
        note: 'Academic Proof of Concept - Demonstrates integration of multiple data sources'
      }
    });

  } catch (error) {
    console.error('❌ Get combined hazards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Merge hazards from different sources, removing duplicates
 * Two hazards are considered duplicates if they're within 50m and same type
 */
function mergeHazards(communityHazards, tomtomHazards) {
  const merged = [...communityHazards];
  const duplicateThreshold = 50; // meters

  for (const tomtomHazard of tomtomHazards) {
    let isDuplicate = false;
    
    for (const communityHazard of communityHazards) {
      const distance = tomtomHazardsService.calculateDistance(
        tomtomHazard.latitude,
        tomtomHazard.longitude,
        communityHazard.latitude,
        communityHazard.longitude
      );
      
      // Same type and within 50m = duplicate
      if (distance < duplicateThreshold && tomtomHazard.type === communityHazard.type) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      merged.push(tomtomHazard);
    }
  }

  return merged;
}

module.exports = router;