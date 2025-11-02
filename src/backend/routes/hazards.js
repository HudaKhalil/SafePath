const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool, notifyClient, initializeNotifyClient, isNotifyClientConnected } = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Store SSE connections for real-time notifications
const sseConnections = new Map();
let isListening = false;

// Initialize PostgreSQL LISTEN/NOTIFY system
async function initializeRealTimeSystem() {
  try {
    if (!isListening && !isNotifyClientConnected()) {
      await initializeNotifyClient();
      
      // Set up notification handler
      notifyClient.on('notification', (msg) => {
        try {
          const payload = JSON.parse(msg.payload);
          console.log('📢 PostgreSQL notification received:', payload.event_type, 'for hazard', payload.hazard_id);
          
          // Broadcast to all connected SSE clients
          broadcastToClients(payload);
        } catch (error) {
          console.error('❌ Error processing PostgreSQL notification:', error);
        }
      });
      
      notifyClient.on('error', (err) => {
        console.error('❌ PostgreSQL LISTEN client error:', err);
        isListening = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeRealTimeSystem, 5000);
      });
      
      isListening = true;
      console.log('🎯 Real-time hazard notification system initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize real-time system:', error);
  }
}

// Initialize on module load
initializeRealTimeSystem();

// Report a new hazard (protected route) - OPTIMIZED VERSION
router.post('/', authenticateToken, [
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('type').isIn([
    'construction', 'accident', 'crime', 'flooding', 'poor_lighting', 
    'road_damage', 'pothole', 'unsafe_crossing', 'broken_glass', 
    'suspicious_activity', 'vandalism', 'other'
  ]).withMessage('Invalid hazard type'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('affectsTraffic').optional().isBoolean().withMessage('affectsTraffic must be boolean'),
  body('weatherRelated').optional().isBoolean().withMessage('weatherRelated must be boolean')
], async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
    const result = await client.query(`
      INSERT INTO hazards (
        user_id, description, location, hazard_type, severity, 
        affects_traffic, weather_related, incident_time
      )
      VALUES ($1, $2, ST_SetSRID(ST_Point($4, $3), 4326)::geography, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING 
        id, description, hazard_type, severity, priority_level, 
        affects_traffic, weather_related, created_at, status,
        ST_Y(location::geometry) as latitude, 
        ST_X(location::geometry) as longitude
    `, [req.user.userId, description, latitude, longitude, hazardType, severity, affectsTraffic, weatherRelated]);

    const hazard = result.rows[0];
    
    console.log(`✅ New hazard reported: ID ${hazard.id}, Type: ${hazard.hazard_type}, Severity: ${hazard.severity}`);

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
          priorityLevel: hazard.priority_level,
          affectsTraffic: hazard.affects_traffic,
          weatherRelated: hazard.weather_related,
          createdAt: hazard.created_at,
          status: hazard.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Report hazard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
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
    
    let query = `
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity, 
        h.is_resolved,
        ST_X(h.location) as longitude,
        ST_Y(h.location) as latitude,
        h.created_at,
        u.name as reporter_name
      FROM hazards h
      LEFT JOIN users u ON h.user_id = u.id
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
      conditions.push(`h.is_resolved = $${params.length + 1}`);
      params.push(resolved === 'true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY h.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const hazards = result.rows.map(hazard => ({
      id: hazard.id,
      description: hazard.description,
      location: {
        latitude: hazard.latitude,
        longitude: hazard.longitude
      },
      hazardType: hazard.hazard_type,
      severity: hazard.severity,
      isResolved: hazard.is_resolved,
      reporterName: hazard.reporter_name,
      createdAt: hazard.created_at
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

    const result = await pool.query(`
      SELECT 
        h.id, 
        h.description, 
        h.hazard_type, 
        h.severity, 
        h.is_resolved,
        ST_X(h.location) as longitude,
        ST_Y(h.location) as latitude,
        h.created_at,
        u.name as reporter_name,
        ST_Distance(
          h.location::geography, 
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) as distance_meters
      FROM hazards h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE ST_DWithin(
        h.location::geography, 
        ST_SetSRID(ST_Point($2, $1), 4326)::geography, 
        $3
      )
      AND h.is_resolved = false
      ORDER BY distance_meters ASC, h.created_at DESC
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
      isResolved: hazard.is_resolved,
      reporterName: hazard.reporter_name,
      createdAt: hazard.created_at,
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
    const checkResult = await pool.query(
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

    const result = await pool.query(`
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

// Server-Sent Events endpoint for real-time hazard alerts
router.get('/stream', async (req, res) => {
  const { latitude, longitude, radius = 5000, token } = req.query;
  
  // Authenticate via URL token since EventSource doesn't support headers
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token required'
    });
  }
  
  // Verify JWT token
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = `${req.user.userId}_${Date.now()}`;
  const connection = {
    id: clientId,
    userId: req.user.userId,
    response: res,
    location: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null,
    radius: parseInt(radius)
  };

  sseConnections.set(clientId, connection);
  
  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Real-time hazard alerts activated',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Clean up on client disconnect  
  req.on('close', () => {
    sseConnections.delete(clientId);
    // Only log disconnections in verbose mode to reduce log spam
    if (process.env.VERBOSE_LOGGING === 'true') {
      console.log(`Client ${clientId} disconnected from hazard stream`);
    }
  });

  req.on('end', () => {
    sseConnections.delete(clientId);
  });
});

// Get recent hazards - OPTIMIZED VERSION using function
router.get('/recent', async (req, res) => {
  const startTime = Date.now();
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

    let query, params = [];

    if (latitude && longitude) {
      // Use optimized spatial function for <100ms performance
      query = `
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
      
      query += whereClause + ' ORDER BY nh.priority_level DESC, nh.distance_meters ASC';
    } else {
      // Fallback query without location
      query = `
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
        query += ` AND h.severity = $${params.length + 1}`;
        params.push(severity);
      }
      if (hazardType) {
        query += ` AND h.hazard_type = $${params.length + 1}`;
        params.push(hazardType);
      }
      
      query += ` ORDER BY h.priority_level DESC, h.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    }

    const result = await client.query(query, params);
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

/**
 * Broadcast PostgreSQL notifications to SSE clients
 */
function broadcastToClients(payload) {
  if (!payload || sseConnections.size === 0) return;
  
  try {
    let notificationsSent = 0;
    
    // Create standardized notification format
    const notification = createNotificationMessage(payload);
    
    for (const [clientId, connection] of sseConnections) {
      try {
        if (connection.location && payload.latitude && payload.longitude) {
          const distance = calculateDistance(
            connection.location.latitude,
            connection.location.longitude,
            payload.latitude,
            payload.longitude
          );

          // Send notification if within user's radius
          if (distance <= connection.radius) {
            notification.distanceMeters = Math.round(distance);
            
            const sseMessage = `data: ${JSON.stringify(notification)}\n\n`;
            connection.response.write(sseMessage);
            
            notificationsSent++;
            console.log(`📡 SSE sent to user ${connection.userId}: ${payload.event_type} (${Math.round(distance)}m away)`);
          }
        }
      } catch (error) {
        console.error(`❌ Error sending SSE to client ${clientId}:`, error);
        sseConnections.delete(clientId);
      }
    }
    
    if (notificationsSent > 0) {
      console.log(`🌐 Broadcast complete: ${notificationsSent} users notified of ${payload.event_type}`);
    }
  } catch (error) {
    console.error('❌ Broadcast error:', error);
  }
}

/**
 * Create notification message from PostgreSQL payload
 */
function createNotificationMessage(payload) {
  const hazardEmojis = {
    construction: '🚧',
    accident: '🚗💥',
    crime: '🚔',
    flooding: '🌊',
    poor_lighting: '💡',
    road_damage: '🕳️',
    pothole: '🕳️',
    unsafe_crossing: '⚠️',
    broken_glass: '🔍',
    suspicious_activity: '👁️',
    vandalism: '🎯',
    other: '⚠️'
  };

  const severityColors = {
    low: '🟢',
    medium: '🟡', 
    high: '🔴',
    critical: '🆘'
  };

  const emoji = hazardEmojis[payload.hazard_type] || '⚠️';
  const severityColor = severityColors[payload.severity] || '⚠️';
  
  let message = '';
  let notificationType = 'hazard_update';
  
  switch (payload.event_type) {
    case 'hazard_created':
      message = `${emoji} ${severityColor} New ${payload.severity} risk: ${payload.hazard_type.replace('_', ' ')} reported nearby`;
      notificationType = 'new_hazard';
      break;
    case 'hazard_updated':
      message = `${emoji} Hazard status updated: ${payload.new_status}`;
      notificationType = 'hazard_updated';
      break;
    case 'hazard_deleted':
      message = `✅ Hazard resolved and removed`;
      notificationType = 'hazard_resolved';
      break;
    default:
      message = `${emoji} Hazard notification`;
  }

  return {
    type: notificationType,
    event_type: payload.event_type,
    hazard: {
      id: payload.hazard_id,
      hazardType: payload.hazard_type,
      severity: payload.severity,
      description: payload.description,
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude
      },
      priorityLevel: payload.priority_level,
      affectsTraffic: payload.affects_traffic,
      weatherRelated: payload.weather_related,
      status: payload.status
    },
    message: message,
    timestamp: payload.created_at || new Date().toISOString(),
    urgency: payload.severity === 'critical' ? 'high' : payload.severity === 'high' ? 'medium' : 'normal'
  };
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Health check endpoint for real-time system
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: pool.totalCount > 0,
        connections: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      },
      realtime: {
        listening: isListening,
        connections: sseConnections.size,
        notifyClient: isNotifyClientConnected()
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Test database query performance
    const queryStart = Date.now();
    await pool.query('SELECT COUNT(*) FROM hazards WHERE status = $1', ['active']);
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
    const stats = await pool.query('SELECT * FROM hazard_performance_stats');
    
    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        realtime: {
          connections: sseConnections.size,
          listening: isListening
        },
        database: {
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingConnections: pool.waitingCount
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

module.exports = router;