const express = require('express');
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
 * Find nearby available buddies
 * Query params:
 * - lat: user's latitude (required)
 * - lon: user's longitude (required)
 * - radius: search radius in km (default: 5)
 * - modes: comma-separated transport modes (optional)
 * - status: availability status filter (optional)
 */
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lon, radius = 5, modes, status } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Parse modes filter
    const modesArray = modes ? modes.split(',').map(m => m.trim()) : null;

    // Filter mock buddies
    let results = mockBuddies.filter(buddy => {
      // Exclude the requesting user
      if (buddy.id === req.user.userId) {
        return false;
      }

      // Filter by radius
      if (buddy.distance_km > parseFloat(radius)) {
        return false;
      }

      // Filter by modes
      if (modesArray && modesArray.length > 0) {
        const hasMatchingMode = buddy.preferred_modes.some(mode => 
          modesArray.includes(mode)
        );
        if (!hasMatchingMode) {
          return false;
        }
      }

      // Filter by status
      if (status && buddy.availability_status !== status) {
        return false;
      }

      return true;
    });

    // Sort by distance (closest first)
    results.sort((a, b) => a.distance_km - b.distance_km);

    res.json({
      success: true,
      data: {
        buddies: results,
        count: results.length,
        searchParams: {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          radius: parseFloat(radius),
          modes: modesArray,
          status
        }
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
    const {
      recipient_id,
      start_location_lat,
      start_location_lon,
      start_location_name,
      end_location_lat,
      end_location_lon,
      end_location_name,
      transport_mode,
      message
    } = req.body;

    // Validate required fields
    if (!recipient_id) {
      return res.status(400).json({
        success: false,
        message: 'recipient_id is required'
      });
    }

    if (!start_location_lat || !start_location_lon || !end_location_lat || !end_location_lon) {
      return res.status(400).json({
        success: false,
        message: 'Start and end location coordinates are required'
      });
    }

    // Check if recipient exists (in real implementation, check database)
    const recipient = mockBuddies.find(b => b.id === parseInt(recipient_id));
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create new request
    const newRequest = {
      id: requestIdCounter++,
      requester_id: req.user.userId,
      requester_username: req.user.username || 'current_user',
      recipient_id: parseInt(recipient_id),
      recipient_username: recipient.username,
      start_location: {
        lat: parseFloat(start_location_lat),
        lon: parseFloat(start_location_lon),
        name: start_location_name || 'Start location'
      },
      end_location: {
        lat: parseFloat(end_location_lat),
        lon: parseFloat(end_location_lon),
        name: end_location_name || 'End location'
      },
      transport_mode: transport_mode || 'walking',
      message: message || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 minutes
    };

    mockRequests.push(newRequest);

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Buddy request sent successfully'
    });

  } catch (error) {
    console.error('Error creating buddy request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send buddy request'
    });
  }
});

/**
 * GET /api/buddies/requests
 * Get buddy requests for the current user
 * Query params:
 * - filter: 'sent', 'received', or 'all' (default: 'all')
 */
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    const userId = req.user.userId;

    let requests = [];

    if (filter === 'sent' || filter === 'all') {
      const sentRequests = mockRequests
        .filter(r => r.requester_id === userId)
        .map(r => ({ ...r, type: 'sent' }));
      requests = [...requests, ...sentRequests];
    }

    if (filter === 'received' || filter === 'all') {
      const receivedRequests = mockRequests
        .filter(r => r.recipient_id === userId)
        .map(r => ({ ...r, type: 'received' }));
      requests = [...requests, ...receivedRequests];
    }

    // Sort by created_at (newest first)
    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: {
        requests,
        count: requests.length,
        filter
      }
    });

  } catch (error) {
    console.error('Error fetching buddy requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buddy requests'
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

    // Validate action
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "accept" or "reject"'
      });
    }

    // Find the request
    const request = mockRequests.find(r => r.id === parseInt(requestId));

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if user is the recipient
    if (request.recipient_id !== userId) {
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

    // Check if request has expired
    if (new Date() > new Date(request.expires_at)) {
      request.status = 'expired';
      return res.status(400).json({
        success: false,
        message: 'Request has expired'
      });
    }

    // Update request status
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    request.responded_at = new Date().toISOString();

    res.json({
      success: true,
      data: request,
      message: `Request ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to request'
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

module.exports = router;
