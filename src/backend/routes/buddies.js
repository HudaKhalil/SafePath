const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

console.log('👥 Buddy routes initialized');

// ==========================================
// GET NEARBY BUDDIES
// ==========================================
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lon, radius = 5000, limit = 50, transport_mode } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log(`🔍 Finding buddies near (${lat}, ${lon}) within ${radius}m`);

    let queryText = `
      SELECT 
        u.user_id as id,
        u.username as name,
        u.email,
        u.transport_mode,
        u.safety_priority,
        ST_Y(u.location::geometry) as lat,
        ST_X(u.location::geometry) as lon,
        ST_Distance(
          u.location::geography,
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) / 1000.0 as distance_km,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM buddy_requests 
            WHERE ((sender_id = $3 AND receiver_id = u.user_id) 
                  OR (sender_id = u.user_id AND receiver_id = $3))
            AND status = 'pending'
          ) THEN 'pending'
          WHEN EXISTS (
            SELECT 1 FROM buddy_requests 
            WHERE ((sender_id = $3 AND receiver_id = u.user_id) 
                  OR (sender_id = u.user_id AND receiver_id = $3))
            AND status = 'accepted'
          ) THEN 'accepted'
          ELSE NULL
        END as request_status,
        EXISTS (
          SELECT 1 FROM buddy_requests 
          WHERE sender_id = $3 AND receiver_id = u.user_id AND status = 'pending'
        ) as is_sender
      FROM users u
      WHERE u.user_id != $3
        AND u.location IS NOT NULL
        AND ST_DWithin(
          u.location::geography,
          ST_SetSRID(ST_Point($2, $1), 4326)::geography,
          $4
        )
    `;

    const params = [lat, lon, req.user.userId, radius];

    if (transport_mode && transport_mode !== 'all') {
      queryText += ` AND u.transport_mode = $${params.length + 1}`;
      params.push(transport_mode);
    }

    queryText += ` ORDER BY distance_km ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);

    console.log(`✅ Found ${result.rows.length} nearby buddies`);

    res.json({
      success: true,
      data: {
        buddies: result.rows.map(buddy => ({
          id: buddy.id,
          name: buddy.name,
          email: buddy.email,
          transport_mode: buddy.transport_mode,
          safety_priority: buddy.safety_priority,
          lat: parseFloat(buddy.lat),
          lon: parseFloat(buddy.lon),
          distance_km: parseFloat(buddy.distance_km).toFixed(2),
          request_status: buddy.request_status,
          is_sender: buddy.is_sender
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get nearby buddies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby buddies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// SEND BUDDY REQUEST
// ==========================================
router.post('/requests', authenticateToken, [
  body('receiver_id').isInt().withMessage('Valid receiver_id required'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Message too long')
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

    const { receiver_id, message } = req.body;
    const sender_id = req.user.userId;

    if (sender_id === receiver_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send buddy request to yourself'
      });
    }

    const receiverCheck = await query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [receiver_id]
    );

    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const existingRequest = await query(`
      SELECT id, status FROM buddy_requests
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
    `, [sender_id, receiver_id]);

    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'A buddy request already exists between you and this user'
        });
      } else if (status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already buddies with this user'
        });
      }
    }

    const result = await query(`
      INSERT INTO buddy_requests (sender_id, receiver_id, message, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, sender_id, receiver_id, message, status, created_at
    `, [sender_id, receiver_id, message || 'Hey! Would you like to be travel buddies?']);

    console.log(`✅ Buddy request sent from user ${sender_id} to user ${receiver_id}`);

    res.status(201).json({
      success: true,
      message: 'Buddy request sent successfully',
      data: {
        request: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Send buddy request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send buddy request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// GET BUDDY REQUESTS
// ==========================================
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.userId;

    let queryText = `
      SELECT 
        br.id,
        br.sender_id,
        br.receiver_id,
        br.message,
        br.status,
        br.created_at,
        br.updated_at,
        sender.username as sender_name,
        sender.email as sender_email,
        sender.transport_mode as sender_transport_mode,
        sender.safety_priority as sender_safety_priority,
        ST_Y(sender.location::geometry) as sender_lat,
        ST_X(sender.location::geometry) as sender_lon,
        receiver.username as receiver_name,
        receiver.email as receiver_email,
        receiver.transport_mode as receiver_transport_mode,
        receiver.safety_priority as receiver_safety_priority,
        ST_Y(receiver.location::geometry) as receiver_lat,
        ST_X(receiver.location::geometry) as receiver_lon,
        ST_Distance(
          sender.location::geography,
          receiver.location::geography
        ) / 1000.0 as distance_km,
        CASE WHEN br.sender_id = $1 THEN true ELSE false END as is_sender,
        CASE WHEN br.receiver_id = $1 THEN true ELSE false END as is_receiver
      FROM buddy_requests br
      JOIN users sender ON br.sender_id = sender.user_id
      JOIN users receiver ON br.receiver_id = receiver.user_id
      WHERE (br.sender_id = $1 OR br.receiver_id = $1)
    `;

    const params = [userId];

    if (status) {
      queryText += ` AND br.status = $${params.length + 1}`;
      params.push(status);
    }

    queryText += ` ORDER BY br.created_at DESC`;

    const result = await query(queryText, params);

    console.log(`✅ Found ${result.rows.length} buddy requests for user ${userId}`);

    res.json({
      success: true,
      data: {
        requests: result.rows.map(req => ({
          id: req.id,
          sender_id: req.sender_id,
          receiver_id: req.receiver_id,
          message: req.message,
          status: req.status,
          created_at: req.created_at,
          updated_at: req.updated_at,
          sender_name: req.sender_name,
          sender_email: req.sender_email,
          sender_transport_mode: req.sender_transport_mode,
          sender_safety_priority: req.sender_safety_priority,
          sender_lat: req.sender_lat ? parseFloat(req.sender_lat) : null,
          sender_lon: req.sender_lon ? parseFloat(req.sender_lon) : null,
          receiver_name: req.receiver_name,
          receiver_email: req.receiver_email,
          receiver_transport_mode: req.receiver_transport_mode,
          receiver_safety_priority: req.receiver_safety_priority,
          receiver_lat: req.receiver_lat ? parseFloat(req.receiver_lat) : null,
          receiver_lon: req.receiver_lon ? parseFloat(req.receiver_lon) : null,
          distance_km: req.distance_km ? parseFloat(req.distance_km).toFixed(2) : null,
          is_sender: req.is_sender,
          is_receiver: req.is_receiver
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get buddy requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buddy requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// RESPOND TO BUDDY REQUEST
// ==========================================
router.put('/requests/:id', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
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
    const { action } = req.body;
    const userId = req.user.userId;

    const requestCheck = await query(`
      SELECT sender_id, receiver_id, status 
      FROM buddy_requests 
      WHERE id = $1
    `, [id]);

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Buddy request not found'
      });
    }

    const request = requestCheck.rows[0];

    if (request.receiver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only respond to requests sent to you'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`
      });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    const result = await query(`
      UPDATE buddy_requests
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, sender_id, receiver_id, status, updated_at
    `, [newStatus, id]);

    console.log(`✅ Buddy request ${id} ${newStatus} by user ${userId}`);

    res.json({
      success: true,
      message: `Buddy request ${newStatus} successfully`,
      data: {
        request: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Respond to buddy request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to buddy request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// GET ACCEPTED BUDDIES
// ==========================================
router.get('/accepted', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(`
      SELECT 
        CASE 
          WHEN br.sender_id = $1 THEN br.receiver_id
          ELSE br.sender_id
        END as buddy_id,
        CASE 
          WHEN br.sender_id = $1 THEN receiver.username
          ELSE sender.username
        END as buddy_name,
        CASE 
          WHEN br.sender_id = $1 THEN receiver.email
          ELSE sender.email
        END as buddy_email,
        CASE 
          WHEN br.sender_id = $1 THEN receiver.transport_mode
          ELSE sender.transport_mode
        END as buddy_transport_mode,
        CASE 
          WHEN br.sender_id = $1 THEN receiver.safety_priority
          ELSE sender.safety_priority
        END as buddy_safety_priority,
        CASE 
          WHEN br.sender_id = $1 THEN ST_Y(receiver.location::geometry)
          ELSE ST_Y(sender.location::geometry)
        END as buddy_lat,
        CASE 
          WHEN br.sender_id = $1 THEN ST_X(receiver.location::geometry)
          ELSE ST_X(sender.location::geometry)
        END as buddy_lon,
        ST_Distance(
          sender.location::geography,
          receiver.location::geography
        ) / 1000.0 as distance_km,
        br.updated_at as connected_at
      FROM buddy_requests br
      JOIN users sender ON br.sender_id = sender.user_id
      JOIN users receiver ON br.receiver_id = receiver.user_id
      WHERE (br.sender_id = $1 OR br.receiver_id = $1)
        AND br.status = 'accepted'
      ORDER BY br.updated_at DESC
    `, [userId]);

    console.log(`✅ Found ${result.rows.length} accepted buddies for user ${userId}`);

    res.json({
      success: true,
      data: {
        buddies: result.rows.map(buddy => ({
          buddy_id: buddy.buddy_id,
          buddy_name: buddy.buddy_name,
          buddy_email: buddy.buddy_email,
          buddy_transport_mode: buddy.buddy_transport_mode,
          buddy_safety_priority: buddy.buddy_safety_priority,
          buddy_lat: buddy.buddy_lat ? parseFloat(buddy.buddy_lat) : null,
          buddy_lon: buddy.buddy_lon ? parseFloat(buddy.buddy_lon) : null,
          distance_km: buddy.distance_km ? parseFloat(buddy.distance_km).toFixed(2) : null,
          connected_at: buddy.connected_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get accepted buddies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accepted buddies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// FIND BUDDIES ALONG ROUTE
// ==========================================
router.post('/along-route', authenticateToken, [
  body('start_lat').isFloat({ min: -90, max: 90 }),
  body('start_lon').isFloat({ min: -180, max: 180 }),
  body('end_lat').isFloat({ min: -90, max: 90 }),
  body('end_lon').isFloat({ min: -180, max: 180 }),
  body('radius').optional().isInt({ min: 100, max: 50000 })
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

    const { start_lat, start_lon, end_lat, end_lon, radius = 5000 } = req.body;
    const userId = req.user.userId;

    console.log(`🗺️ Finding buddies along route from (${start_lat},${start_lon}) to (${end_lat},${end_lon})`);

    const result = await query(`
      WITH route_line AS (
        SELECT ST_MakeLine(
          ST_SetSRID(ST_Point($1, $2), 4326)::geometry,
          ST_SetSRID(ST_Point($3, $4), 4326)::geometry
        ) as line
      )
      SELECT 
        u.user_id as id,
        u.username as name,
        u.email,
        u.transport_mode,
        u.safety_priority,
        ST_Y(u.location::geometry) as lat,
        ST_X(u.location::geometry) as lon,
        ST_Distance(
          u.location::geography,
          (SELECT line FROM route_line)::geography
        ) as distance_to_route,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM buddy_requests 
            WHERE ((sender_id = $5 AND receiver_id = u.user_id) 
                  OR (sender_id = u.user_id AND receiver_id = $5))
            AND status = 'accepted'
          ) THEN true
          ELSE false
        END as is_buddy
      FROM users u, route_line
      WHERE u.user_id != $5
        AND u.location IS NOT NULL
        AND ST_DWithin(
          u.location::geography,
          route_line.line::geography,
          $6
        )
      ORDER BY distance_to_route ASC
      LIMIT 20
    `, [start_lon, start_lat, end_lon, end_lat, userId, radius]);

    console.log(`✅ Found ${result.rows.length} buddies along route`);

    res.json({
      success: true,
      data: {
        buddies: result.rows.map(buddy => ({
          id: buddy.id,
          name: buddy.name,
          email: buddy.email,
          transport_mode: buddy.transport_mode,
          safety_priority: buddy.safety_priority,
          lat: parseFloat(buddy.lat),
          lon: parseFloat(buddy.lon),
          distance_to_route: Math.round(parseFloat(buddy.distance_to_route)),
          distance_km: (parseFloat(buddy.distance_to_route) / 1000).toFixed(2),
          is_buddy: buddy.is_buddy
        }))
      }
    });

  } catch (error) {
    console.error('❌ Find buddies along route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find buddies along route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// CREATE GROUP ROUTE
// ==========================================
router.post('/group-routes', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('start_location').trim().notEmpty(),
  body('end_location').trim().notEmpty(),
  body('start_lat').isFloat({ min: -90, max: 90 }),
  body('start_lon').isFloat({ min: -180, max: 180 }),
  body('end_lat').isFloat({ min: -90, max: 90 }),
  body('end_lon').isFloat({ min: -180, max: 180 }),
  body('invited_buddies').optional().isArray()
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

    const {
      name,
      start_location,
      end_location,
      start_lat,
      start_lon,
      end_lat,
      end_lon,
      invited_buddies = []
    } = req.body;

    const userId = req.user.userId;

    const routeResult = await query(`
      INSERT INTO group_routes (
        creator_id, route_name, 
        start_location, end_location,
        start_address, end_address,
        status
      )
      VALUES (
        $1, $2,
        ST_SetSRID(ST_Point($4, $3), 4326)::geography,
        ST_SetSRID(ST_Point($6, $5), 4326)::geography,
        $7, $8,
        'active'
      )
      RETURNING id, creator_id, route_name, start_address, end_address, status, created_at
    `, [userId, name, start_lat, start_lon, end_lat, end_lon, start_location, end_location]);

    const route = routeResult.rows[0];

    await query(`
      INSERT INTO group_route_members (group_route_id, user_id)
      VALUES ($1, $2)
    `, [route.id, userId]);

    if (invited_buddies.length > 0) {
      for (const buddyId of invited_buddies) {
        const buddyCheck = await query(`
          SELECT 1 FROM buddy_requests
          WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
            AND status = 'accepted'
        `, [userId, buddyId]);

        if (buddyCheck.rows.length > 0) {
          await query(`
            INSERT INTO group_route_members (group_route_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (group_route_id, user_id) DO NOTHING
          `, [route.id, buddyId]);
        }
      }
    }

    console.log(`✅ Group route created: ${route.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Group route created successfully',
      data: {
        route: {
          id: route.id,
          name: route.route_name,
          start_location: route.start_address,
          end_location: route.end_address,
          status: route.status,
          created_at: route.created_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Create group route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// GET GROUP ROUTES
// ==========================================
router.get('/group-routes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(`
      SELECT 
        gr.id,
        gr.route_name as name,
        gr.start_address as start_location,
        gr.end_address as end_location,
        ST_Y(gr.start_location::geometry) as start_lat,
        ST_X(gr.start_location::geometry) as start_lon,
        ST_Y(gr.end_location::geometry) as end_lat,
        ST_X(gr.end_location::geometry) as end_lon,
        gr.transport_mode,
        gr.status,
        gr.created_at,
        gr.creator_id,
        creator.username as creator_name,
        COUNT(grm.user_id) as member_count
      FROM group_routes gr
      JOIN users creator ON gr.creator_id = creator.user_id
      LEFT JOIN group_route_members grm ON gr.id = grm.group_route_id
      WHERE EXISTS (
        SELECT 1 FROM group_route_members 
        WHERE group_route_id = gr.id AND user_id = $1
      )
      GROUP BY gr.id, creator.username
      ORDER BY gr.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: {
        routes: result.rows.map(route => ({
          id: route.id,
          name: route.name,
          start_location: route.start_location,
          end_location: route.end_location,
          start_lat: parseFloat(route.start_lat),
          start_lon: parseFloat(route.start_lon),
          end_lat: parseFloat(route.end_lat),
          end_lon: parseFloat(route.end_lon),
          transport_mode: route.transport_mode || 'walking',
          status: route.status,
          created_at: route.created_at,
          creator_id: route.creator_id,
          creator_name: route.creator_name,
          member_count: parseInt(route.member_count)
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get group routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// JOIN GROUP ROUTE
// ==========================================
router.post('/group-routes/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const routeCheck = await query(
      'SELECT id, status FROM group_routes WHERE id = $1',
      [id]
    );

    if (routeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group route not found'
      });
    }

    if (routeCheck.rows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This route is no longer active'
      });
    }

    const memberCheck = await query(`
      SELECT 1 FROM group_route_members
      WHERE group_route_id = $1 AND user_id = $2
    `, [id, userId]);

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this route'
      });
    }

    await query(`
      INSERT INTO group_route_members (group_route_id, user_id)
      VALUES ($1, $2)
    `, [id, userId]);

    console.log(`✅ User ${userId} joined group route ${id}`);

    res.json({
      success: true,
      message: 'Successfully joined the group route'
    });

  } catch (error) {
    console.error('❌ Join group route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// UPDATE USER LOCATION
// ==========================================
router.put('/location', authenticateToken, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 })
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

    const { latitude, longitude } = req.body;
    const userId = req.user.userId;

    await query(`
      UPDATE users
      SET location = ST_SetSRID(ST_Point($2, $1), 4326)::geography
      WHERE user_id = $3
    `, [latitude, longitude, userId]);

    console.log(`✅ Updated location for user ${userId}`);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('❌ Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
