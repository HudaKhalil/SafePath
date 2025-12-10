const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Get user's safety preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        crime_weight, 
        collision_weight, 
        lighting_weight, 
        hazard_weight,
        preset_name,
        crime_severity_weights,
        updated_at
      FROM user_safety_preferences 
      WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences if none exist
      const createResult = await db.query(
        `INSERT INTO user_safety_preferences (user_id) 
         VALUES ($1) 
         RETURNING crime_weight, collision_weight, lighting_weight, hazard_weight, preset_name, crime_severity_weights`,
        [req.user.userId]
      );
      
      return res.json({
        success: true,
        data: {
          factorWeights: {
            crime: parseFloat(createResult.rows[0].crime_weight),
            collision: parseFloat(createResult.rows[0].collision_weight),
            lighting: parseFloat(createResult.rows[0].lighting_weight),
            hazard: parseFloat(createResult.rows[0].hazard_weight)
          },
          preset: createResult.rows[0].preset_name,
          crimeSeverity: createResult.rows[0].crime_severity_weights || {}
        }
      });
    }

    const prefs = result.rows[0];
    res.json({
      success: true,
      data: {
        factorWeights: {
          crime: parseFloat(prefs.crime_weight),
          collision: parseFloat(prefs.collision_weight),
          lighting: parseFloat(prefs.lighting_weight),
          hazard: parseFloat(prefs.hazard_weight)
        },
        preset: prefs.preset_name,
        crimeSeverity: prefs.crime_severity_weights || {},
        updatedAt: prefs.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching safety preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch safety preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user's safety preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Received preferences update:', JSON.stringify(req.body, null, 2));
    const { factorWeights, preset, crimeSeverity } = req.body;

    // Validate factor weights
    if (factorWeights) {
      const { crime, collision, lighting, hazard } = factorWeights;
      
      // Check all weights are provided
      if (crime === undefined || collision === undefined || 
          lighting === undefined || hazard === undefined) {
        return res.status(400).json({
          success: false,
          message: 'All factor weights must be provided (crime, collision, lighting, hazard)'
        });
      }

      // Check weights are valid numbers between 0 and 1
      const weights = [crime, collision, lighting, hazard];
      if (weights.some(w => typeof w !== 'number' || w < 0 || w > 1)) {
        return res.status(400).json({
          success: false,
          message: 'All weights must be numbers between 0 and 1'
        });
      }

      // Check weights sum to approximately 1.0 (allow small rounding errors)
      const sum = crime + collision + lighting + hazard;
      if (Math.abs(sum - 1.0) >= 0.01) {
        return res.status(400).json({
          success: false,
          message: `Weights must sum to 1.0 (current sum: ${sum.toFixed(3)})`
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (factorWeights) {
      updates.push(`crime_weight = $${paramIndex++}`);
      values.push(factorWeights.crime);
      updates.push(`collision_weight = $${paramIndex++}`);
      values.push(factorWeights.collision);
      updates.push(`lighting_weight = $${paramIndex++}`);
      values.push(factorWeights.lighting);
      updates.push(`hazard_weight = $${paramIndex++}`);
      values.push(factorWeights.hazard);
    }

    if (preset !== undefined) {
      updates.push(`preset_name = $${paramIndex++}`);
      values.push(preset);
    }

    if (crimeSeverity !== undefined) {
      updates.push(`crime_severity_weights = $${paramIndex++}`);
      values.push(JSON.stringify(crimeSeverity));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    values.push(req.user.userId);

    const result = await db.query(
      `UPDATE user_safety_preferences 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING crime_weight, collision_weight, lighting_weight, hazard_weight, preset_name, crime_severity_weights, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      // If no record exists, create one
      const createResult = await db.query(
        `INSERT INTO user_safety_preferences 
         (user_id, crime_weight, collision_weight, lighting_weight, hazard_weight, preset_name, crime_severity_weights) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING crime_weight, collision_weight, lighting_weight, hazard_weight, preset_name, crime_severity_weights`,
        [
          req.user.userId,
          factorWeights?.crime ?? 0.40,
          factorWeights?.collision ?? 0.25,
          factorWeights?.lighting ?? 0.20,
          factorWeights?.hazard ?? 0.15,
          preset ?? 'balanced',
          JSON.stringify(crimeSeverity || {})
        ]
      );

      const prefs = createResult.rows[0];
      return res.json({
        success: true,
        message: 'Safety preferences created successfully',
        data: {
          factorWeights: {
            crime: parseFloat(prefs.crime_weight),
            collision: parseFloat(prefs.collision_weight),
            lighting: parseFloat(prefs.lighting_weight),
            hazard: parseFloat(prefs.hazard_weight)
          },
          preset: prefs.preset_name,
          crimeSeverity: prefs.crime_severity_weights || {}
        }
      });
    }

    const prefs = result.rows[0];
    res.json({
      success: true,
      message: 'Safety preferences updated successfully',
      data: {
        factorWeights: {
          crime: parseFloat(prefs.crime_weight),
          collision: parseFloat(prefs.collision_weight),
          lighting: parseFloat(prefs.lighting_weight),
          hazard: parseFloat(prefs.hazard_weight)
        },
        preset: prefs.preset_name,
        crimeSeverity: prefs.crime_severity_weights || {},
        updatedAt: prefs.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating safety preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update safety preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset preferences to default
router.post('/preferences/reset', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE user_safety_preferences 
       SET crime_weight = 0.40,
           collision_weight = 0.25,
           lighting_weight = 0.20,
           hazard_weight = 0.15,
           preset_name = 'balanced',
           crime_severity_weights = '{}'
       WHERE user_id = $1
       RETURNING crime_weight, collision_weight, lighting_weight, hazard_weight, preset_name`,
      [req.user.userId]
    );

    const prefs = result.rows[0];
    res.json({
      success: true,
      message: 'Safety preferences reset to defaults',
      data: {
        factorWeights: {
          crime: parseFloat(prefs.crime_weight),
          collision: parseFloat(prefs.collision_weight),
          lighting: parseFloat(prefs.lighting_weight),
          hazard: parseFloat(prefs.hazard_weight)
        },
        preset: prefs.preset_name,
        crimeSeverity: {}
      }
    });
  } catch (error) {
    console.error('Error resetting safety preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset safety preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
