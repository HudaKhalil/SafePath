const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');
const routeCalculator = require('../lib/routeCalculator');

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
// Insert a new route
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      difficulty,
      distance_km,
      estimated_time_minutes,
      safety_rating,
      path,
      created_at
    } = req.body;

    if (!name || !difficulty || !distance_km || !estimated_time_minutes || !safety_rating || !path) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Insert route into database (PostGIS geometry for path)
    const query = `
      INSERT INTO routes
        (name, description, difficulty, distance_km, estimated_time_minutes, safety_rating, path, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326), $8)
      RETURNING id
    `;
    const params = [
      name,
      description || '',
      difficulty,
      distance_km,
      estimated_time_minutes,
      safety_rating,
      path,
      created_at || new Date()
    ];
    const result = await db.query(query, params);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Insert route error:', error);
  res.status(500).json({ success: false, message: 'Failed to insert route', error: error.message });
  }
});
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
    const { fromLat, fromLon, toLat, toLon, mode = 'walking', userPreferences = null } = req.body;

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return res.status(400).json({
        success: false,
        message: 'Missing required coordinates'
      });
    }

    // Log user preferences if provided
    if (userPreferences) {
      console.log('[Routes API] User safety preferences:', userPreferences.factorWeights);
    }

    // Use route calculator to get both fastest and safest routes
    const result = await routeCalculator.calculateRoutes(
      parseFloat(fromLat),
      parseFloat(fromLon),
      parseFloat(toLat),
      parseFloat(toLon),
      mode,
      userPreferences
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate routes'
      });
    }

    res.json({
      success: true,
      data: {
        fastest: result.fastest,
        safest: result.safest
      },
      provider: result.provider,
      message: 'Routes calculated successfully'
    });
  } catch (error) {
    console.error('Error finding routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find routes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Route calculation error'
    });
  }
});

module.exports = router;