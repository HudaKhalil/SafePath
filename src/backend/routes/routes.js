const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
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

    const result = await pool.query(query, params);

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

    const result = await pool.query(`
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

    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        description, 
        difficulty, 
        distance_km, 
        estimated_time_minutes, 
        safety_rating,
        ST_AsGeoJSON(path) as path_geojson,
        ST_Distance(
          path::geography, 
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) as distance_meters
      FROM routes 
      WHERE ST_DWithin(
        path::geography, 
        ST_SetSRID(ST_Point($2, $1), 4326)::geography, 
        $3
      )
      ORDER BY distance_meters ASC, safety_rating DESC
      LIMIT $4
    `, [latitude, longitude, radius, limit]);

    const routes = result.rows.map(route => ({
      id: route.id,
      name: route.name,
      description: route.description,
      difficulty: route.difficulty,
      distanceKm: route.distance_km,
      estimatedTimeMinutes: route.estimated_time_minutes,
      safetyRating: route.safety_rating,
      path: route.path_geojson ? JSON.parse(route.path_geojson) : null,
      distanceMeters: Math.round(route.distance_meters)
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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
