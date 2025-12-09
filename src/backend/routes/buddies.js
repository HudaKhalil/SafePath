const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// Mock data for testing (will be replaced with database queries)
const mockBuddies = [
  {
    id: 1,
    username: "sarah_runner",
    rating: 4.8,
    total_ratings: 24,
    preferred_modes: ["walking", "running"],
    availability_status: "available",
    last_active: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    bio: "Love evening runs around Hyde Park! Safety in numbers 🏃‍♀️",
    distance_km: 0.8
  },
  {
    id: 2,
    username: "mike_cyclist",
    rating: 4.9,
    total_ratings: 45,
    preferred_modes: ["cycling"],
    availability_status: "available",
    last_active: new Date(Date.now() - 10 * 60000).toISOString(), // 10 minutes ago
    bio: "Experienced cyclist, happy to ride together",
    distance_km: 1.2
  },
  {
    id: 3,
    username: "emma_walker",
    rating: 4.7,
    total_ratings: 18,
    preferred_modes: ["walking"],
    availability_status: "available",
    last_active: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
    bio: "Walking buddy for late evening commutes",
    distance_km: 0.5
  },
  {
    id: 4,
    username: "john_commuter",
    rating: 4.6,
    total_ratings: 32,
    preferred_modes: ["walking", "cycling"],
    availability_status: "busy",
    last_active: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    bio: "Regular commuter, often available mornings and evenings",
    distance_km: 2.1
  },
  {
    id: 5,
    username: "lisa_explorer",
    rating: 5.0,
    total_ratings: 12,
    preferred_modes: ["walking"],
    availability_status: "available",
    last_active: new Date(Date.now() - 2 * 60000).toISOString(), // 2 minutes ago
    bio: "New to the area, looking for walking buddies",
    distance_km: 1.5
  }
];

/**
 * GET /api/buddies/nearby
 * Find nearby available buddies using PostGIS
 * Query params:
 * - lat: user's latitude (required)
 * - lon: user's longitude (required)
 * - radius: search radius in meters (default: 5000)
 * - transport_mode: filter by transport mode (optional)
 * - limit: maximum results (default: 50)
 */
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lon, radius = 5000, transport_mode, limit = 50 } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Build SQL query with optional transport_mode filter
    let sqlQuery = `
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
          WHEN br.status = 'accepted' THEN 'accepted'
          WHEN br.status = 'pending' AND br.sender_id = $3 THEN 'pending'
          ELSE NULL
        END as request_status,
        CASE 
          WHEN br.sender_id = $3 THEN true
          ELSE false
        END as is_sender
      FROM users u
      LEFT JOIN buddy_requests br ON (
        (br.sender_id = u.user_id AND br.receiver_id = $3) OR
        (br.receiver_id = u.user_id AND br.sender_id = $3)
      )
      WHERE u.user_id != $3
        AND u.location IS NOT NULL
        AND ST_DWithin(
          u.location::geography,
          ST_SetSRID(ST_Point($2, $1), 4326)::geography,
          $4
        )
    `;

    const params = [parseFloat(lat), parseFloat(lon), req.user.userId, parseInt(radius)];

    // Add transport_mode filter if provided
    if (transport_mode && transport_mode !== 'all') {
      sqlQuery += ` AND u.transport_mode = $5`;
      params.push(transport_mode);
      sqlQuery += ` ORDER BY distance_km ASC LIMIT $6`;
      params.push(parseInt(limit));
    } else {
      sqlQuery += ` ORDER BY distance_km ASC LIMIT $5`;
      params.push(parseInt(limit));
    }

    const result = await query(sqlQuery, params);

    res.json({
      success: true,
      data: {
        buddies: result.rows,
        count: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching nearby buddies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby buddies'
    });
  }
});

/**
 * GET /api/buddies/profile/:userId
 * Get detailed profile of a specific buddy
 */
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find buddy in mock data
    const buddy = mockBuddies.find(b => b.id === parseInt(userId));

    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy not found'
      });
    }

    // Add additional profile details
    const profile = {
      ...buddy,
      total_trips: 156,
      member_since: "2024-08-15",
      recent_routes: [
        { from: "King's Cross", to: "Camden", date: "2024-11-20" },
        { from: "Shoreditch", to: "Liverpool Street", date: "2024-11-18" }
      ]
    };

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Error fetching buddy profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buddy profile'
    });
  }
});

/**
 * GET /api/buddies/my-profile
 * Get or create current user's buddy profile
 */
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    // For now, return mock profile for current user
    const userProfile = {
      id: req.user.userId,
      username: req.user.username || "current_user",
      rating: 4.5,
      total_ratings: 0,
      preferred_modes: ["walking"],
      availability_status: "available",
      bio: "",
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * PUT /api/buddies/my-profile
 * Update current user's buddy profile
 */
router.put('/my-profile', authenticateToken, async (req, res) => {
  try {
    const { preferred_modes, availability_status, bio } = req.body;

    // Validate preferred_modes
    if (preferred_modes && !Array.isArray(preferred_modes)) {
      return res.status(400).json({
        success: false,
        message: 'preferred_modes must be an array'
      });
    }

    const validModes = ['walking', 'cycling', 'running'];
    if (preferred_modes && !preferred_modes.every(mode => validModes.includes(mode))) {
      return res.status(400).json({
        success: false,
        message: `preferred_modes must only contain: ${validModes.join(', ')}`
      });
    }

    // Validate availability_status
    const validStatuses = ['available', 'busy', 'offline'];
    if (availability_status && !validStatuses.includes(availability_status)) {
      return res.status(400).json({
        success: false,
        message: `availability_status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Mock update response
    const updatedProfile = {
      id: req.user.userId,
      username: req.user.username || "current_user",
      preferred_modes: preferred_modes || ["walking"],
      availability_status: availability_status || "available",
      bio: bio || "",
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile'
    });
  }
});

// ============ BUDDY REQUEST ENDPOINTS ============

// Mock data for buddy requests
const mockRequests = [];
let requestIdCounter = 1;

/**
 * POST /api/buddies/requests
 * Send a buddy request
 */
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.userId;

    // Validate required fields
    if (!receiver_id) {
      return res.status(400).json({
        success: false,
        message: 'receiver_id is required'
      });
    }

    // Check if trying to send request to self
    if (sender_id === receiver_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send buddy request to yourself'
      });
    }

    // Check if recipient exists
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

    // Check for existing request
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

    // Insert new request
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

/**
 * GET /api/buddies/requests
 * Get buddy requests for the current user
 * Query params:
 * - status: filter by status (pending, accepted, rejected) (optional)
 */
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

/**
 * GET /api/buddies/requests/:requestId
 * Get details of a specific request
 */
router.get('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const request = mockRequests.find(r => r.id === parseInt(requestId));

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if user is authorized to view this request
    if (request.requester_id !== userId && request.recipient_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    // Add type based on user's role
    const requestWithType = {
      ...request,
      type: request.requester_id === userId ? 'sent' : 'received'
    };

    res.json({
      success: true,
      data: requestWithType
    });

  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request details'
    });
  }
});

/**
 * PUT /api/buddies/requests/:requestId
 * Respond to a buddy request (accept/reject)
 */
router.put('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.user.userId;

    console.log(`🔄 User ${userId} attempting to ${action} request ${requestId}`);

    // Validate action
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "accept" or "reject"'
      });
    }

    // Find the request in database
    const requestCheck = await query(`
      SELECT id, sender_id, receiver_id, status
      FROM buddy_requests
      WHERE id = $1
    `, [requestId]);

    if (requestCheck.rows.length === 0) {
      console.log(`❌ Request ${requestId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const request = requestCheck.rows[0];

    // Check if user is the receiver
    if (request.receiver_id !== userId) {
      console.log(`❌ User ${userId} is not the receiver of request ${requestId}`);
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can respond to this request'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`
      });
    }

    // Update request status in database
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const result = await query(`
      UPDATE buddy_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, sender_id, receiver_id, status, updated_at
    `, [newStatus, requestId]);

    console.log(`✅ Request ${requestId} ${action}ed successfully`);

    res.json({
      success: true,
      data: result.rows[0],
      message: `Request ${action}ed successfully`
    });

  } catch (error) {
    console.error('❌ Error responding to request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/buddies/requests/:requestId
 * Cancel/delete a buddy request
 */
router.delete('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const requestIndex = mockRequests.findIndex(r => r.id === parseInt(requestId));

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const request = mockRequests[requestIndex];

    // Only requester can cancel their own request
    if (request.requester_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the requester can cancel this request'
      });
    }

    // Remove request
    mockRequests.splice(requestIndex, 1);

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request'
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
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lon').isFloat({ min: -180, max: 180 })
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

    const { lat, lon } = req.body;
    const userId = req.user.userId;

    await query(`
      UPDATE users
      SET location = ST_SetSRID(ST_Point($2, $1), 4326)::geography
      WHERE user_id = $3
    `, [lat, lon, userId]);

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
