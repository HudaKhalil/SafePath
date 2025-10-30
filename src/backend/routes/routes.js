const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Get all routes with optional filtering
router.get('/', async (req, res) => {
  try {
    const { difficulty, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id, 
        name, 
        description, 
        difficulty, 
        distance_km, 
        estimated_time_minutes, 
        safety_rating,
        ST_AsGeoJSON(path) as path_geojson,
        created_at
      FROM routes
    `;
    
    const params = [];
    let whereClause = '';

    if (difficulty) {
      whereClause = ' WHERE difficulty = $1';
      params.push(difficulty);
    }

    query += whereClause + ` ORDER BY safety_rating DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    const routes = result.rows.map(route => ({
      id: route.id,
      name: route.name,
      description: route.description,
      difficulty: route.difficulty,
      distanceKm: route.distance_km,
      estimatedTimeMinutes: route.estimated_time_minutes,
      safetyRating: route.safety_rating,
      path: route.path_geojson ? JSON.parse(route.path_geojson) : null,
      createdAt: route.created_at
    }));

    res.json({
      success: true,
      data: {
        routes,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: routes.length
        }
      }
    });

  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single route by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        id, 
        name, 
        description, 
        difficulty, 
        distance_km, 
        estimated_time_minutes, 
        safety_rating,
        ST_AsGeoJSON(path) as path_geojson,
        created_at,
        updated_at
      FROM routes 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const route = result.rows[0];
    res.json({
      success: true,
      data: {
        route: {
          id: route.id,
          name: route.name,
          description: route.description,
          difficulty: route.difficulty,
          distanceKm: route.distance_km,
          estimatedTimeMinutes: route.estimated_time_minutes,
          safetyRating: route.safety_rating,
          path: route.path_geojson ? JSON.parse(route.path_geojson) : null,
          createdAt: route.created_at,
          updatedAt: route.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Find routes near a location
router.get('/near/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { radius = 5000, limit = 10 } = req.query; // radius in meters

    console.log(`Finding routes near ${latitude}, ${longitude} within ${radius}m`);

    // First, check if the routes table has any data and what columns exist
    const tableCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'routes' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Available columns in routes table:', tableCheck.rows.map(r => r.column_name));

    // Check if we have any routes
    const countResult = await db.query('SELECT COUNT(*) as count FROM routes');
    console.log(`Total routes in database: ${countResult.rows[0].count}`);

    if (parseInt(countResult.rows[0].count) === 0) {
      // Return mock data if no routes exist
      console.log('No routes in database, returning mock data');
      return res.json({
        success: true,
        data: {
          routes: [
            {
              id: 'mock_1',
              name: 'Sample Safe Route',
              description: 'A well-lit path through the city center',
              difficulty: 'easy',
              distanceKm: 2.1,
              estimatedTimeMinutes: 25,
              safetyRating: 8.5,
              path: null,
              distanceMeters: 500
            }
          ],
          searchLocation: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          },
          radiusMeters: parseInt(radius)
        }
      });
    }

    // Try simplified query first without PostGIS functions if they're causing issues
    let result;
    try {
      result = await db.query(`
        SELECT 
          id, 
          name, 
          description, 
          difficulty, 
          distance_km, 
          estimated_time_minutes, 
          safety_rating,
          created_at
        FROM routes 
        ORDER BY safety_rating DESC
        LIMIT $1
      `, [limit]);
    } catch (geoError) {
      console.error('PostGIS query failed, using basic query:', geoError.message);
      result = await db.query(`
        SELECT 
          id, 
          name, 
          description, 
          difficulty, 
          distance_km, 
          estimated_time_minutes, 
          safety_rating,
          created_at
        FROM routes 
        LIMIT $1
      `, [limit]);
    }

    const routes = result.rows.map(route => ({
      id: route.id,
      name: route.name,
      description: route.description,
      difficulty: route.difficulty,
      distanceKm: route.distance_km,
      estimatedTimeMinutes: route.estimated_time_minutes,
      safetyRating: route.safety_rating,
      path: null, // Temporarily disable path data
      distanceMeters: Math.round(Math.random() * 2000) // Mock distance for now
    }));

    res.json({
      success: true,
      data: {
        routes,
        searchLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radiusMeters: parseInt(radius)
      }
    });

  } catch (error) {
    console.error('Get nearby routes error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
    });
  }
});

// Find routes between two points
router.post('/find', authenticateToken, async (req, res) => {
  try {
    const { fromLat, fromLon, toLat, toLon, mode = 'walking' } = req.body;

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return res.status(400).json({
        success: false,
        message: 'Missing required coordinates'
      });
    }

    // For now, return mock routes with different safety ratings
    // In production, this would integrate with real crime data and routing algorithms
    const mockRoutes = [
      {
        id: 'route_safest',
        name: 'Safest Route',
        type: 'safest',
        description: 'Prioritizes well-lit streets and areas with good safety records',
        distance: '2.3',
        estimatedTime: 28,
        safetyRating: 8.7,
        path: [
          [parseFloat(fromLat), parseFloat(fromLon)],
          // Add some intermediate points for a realistic path
          [parseFloat(fromLat) + 0.001, parseFloat(fromLon) + 0.002],
          [parseFloat(fromLat) + 0.003, parseFloat(fromLon) + 0.004],
          [parseFloat(toLat), parseFloat(toLon)]
        ]
      },
      {
        id: 'route_fastest',
        name: 'Fastest Route', 
        type: 'fastest',
        description: 'Shortest time route with standard safety considerations',
        distance: '1.8',
        estimatedTime: 22,
        safetyRating: 7.2,
        path: [
          [parseFloat(fromLat), parseFloat(fromLon)],
          [parseFloat(fromLat) + 0.002, parseFloat(fromLon) + 0.001],
          [parseFloat(toLat), parseFloat(toLon)]
        ]
      },
      {
        id: 'route_balanced',
        name: 'Balanced Route',
        type: 'balanced', 
        description: 'Good balance between safety and efficiency',
        distance: '2.0',
        estimatedTime: 25,
        safetyRating: 7.8,
        path: [
          [parseFloat(fromLat), parseFloat(fromLon)],
          [parseFloat(fromLat) + 0.0015, parseFloat(fromLon) + 0.0015],
          [parseFloat(fromLat) + 0.0025, parseFloat(fromLon) + 0.003],
          [parseFloat(toLat), parseFloat(toLon)]
        ]
      }
    ];

    res.json({
      success: true,
      data: mockRoutes,
      message: `Found ${mockRoutes.length} route options`
    });
  } catch (error) {
    console.error('Error finding routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find routes'
    });
  }
});

module.exports = router;