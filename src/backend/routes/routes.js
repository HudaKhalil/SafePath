// const { Server } = require('socket.io');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// /**
//  * WebSocket Service using Socket.IO
//  * Replaces PostgreSQL LISTEN/NOTIFY for real-time hazard alerts
//  */
// class WebSocketService {
//   constructor() {
//     this.io = null;
//     this.connections = new Map(); // Store user connections with metadata
//     this.isInitialized = false;
//   }

//   /**
//    * Initialize Socket.IO server
//    * @param {http.Server} httpServer - HTTP server instance
//    */
//   initialize(httpServer) {
//     if (this.isInitialized) {
//       console.log('WebSocket service already initialized');
//       return this.io;
//     }

//     this.io = new Server(httpServer, {
//       cors: {
//         origin: [
//           process.env.FRONTEND_URL || 'http://localhost:3000',
//           'http://localhost:3001'
//         ],
//         methods: ['GET', 'POST'],
//         credentials: true
//       },
//       pingTimeout: 60000,
//       pingInterval: 25000
//     });

//     this.setupConnectionHandlers();
//     this.isInitialized = true;

//     console.log('WebSocket (Socket.IO) service initialized');
//     console.log(`CORS enabled for: ${process.env.FRONTEND_URL}`);

//     return this.io;
//   }

//   /**
//    * Set up Socket.IO connection handlers
//    */
//   setupConnectionHandlers() {
//     this.io.on('connection', (socket) => {
//       console.log(`Client connected: ${socket.id}`);

//       // Authenticate socket connection
//       socket.on('authenticate', (data) => {
//         this.authenticateSocket(socket, data);
//       });

//       // Subscribe to hazard updates with location
//       socket.on('subscribe_hazard_updates', (data) => {
//         this.subscribeToHazards(socket, data);
//       });

//       // Update user location
//       socket.on('update_location', (data) => {
//         this.updateUserLocation(socket, data);
//       });

//       // Track user position for nearby hazard detection
//       socket.on('user_position', async (coords) => {
//         await this.handleUserPosition(socket, coords);
//       });

//       // Unsubscribe from hazard updates
//       socket.on('unsubscribe_hazard_updates', () => {
//         this.unsubscribeFromHazards(socket);
//       });

//       // Handle disconnect
//       socket.on('disconnect', (reason) => {
//         this.handleDisconnect(socket, reason);
//       });

//       // Handle errors
//       socket.on('error', (error) => {
//         console.error(`Socket error for ${socket.id}:`, error);
//       });
//     });
//   }

//   /**
//    * Authenticate socket connection with JWT
//    */
//   authenticateSocket(socket, data) {
//     try {
//       const { token } = data;

//       if (!token) {
//         socket.emit('auth_error', { message: 'Token required' });
//         return;
//       }

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
//       // Store user info with socket
//       socket.userId = decoded.userId;
//       socket.username = decoded.username;
//       socket.authenticated = true;

//       socket.emit('authenticated', {
//         message: 'Authentication successful',
//         userId: decoded.userId
//       });

//       console.log(`Socket ${socket.id} authenticated as user ${decoded.userId}`);
//     } catch (error) {
//       console.error(`Authentication failed for socket ${socket.id}:`, error.message);
//       socket.emit('auth_error', { message: 'Invalid token' });
//       socket.disconnect();
//     }
//   }

//   /**
//    * Subscribe socket to hazard updates
//    */
//   subscribeToHazards(socket, data) {
//     if (!socket.authenticated) {
//       socket.emit('error', { message: 'Not authenticated' });
//       return;
//     }

//     const { latitude, longitude, radius = 5000 } = data;

//     if (!latitude || !longitude) {
//       socket.emit('error', { message: 'Location required' });
//       return;
//     }

//     // Store connection metadata
//     const connectionData = {
//       socketId: socket.id,
//       userId: socket.userId,
//       location: {
//         latitude: parseFloat(latitude),
//         longitude: parseFloat(longitude)
//       },
//       radius: parseInt(radius),
//       subscribedAt: new Date()
//     };

//     this.connections.set(socket.id, connectionData);

//     socket.emit('subscribed', {
//       message: 'Subscribed to hazard updates',
//       location: connectionData.location,
//       radius: connectionData.radius
//     });

//     console.log(`User ${socket.userId} subscribed to hazards within ${radius}m of (${latitude}, ${longitude})`);
//   }

//   /**
//    * Handle user position update for nearby hazard detection
//    */
//   async handleUserPosition(socket, coords) {
//     try {
//       const { latitude, longitude, radius = 1500 } = coords;

//       if (!latitude || !longitude) {
//         socket.emit('error', { message: 'Invalid coordinates' });
//         return;
//       }

//       // Import database connection dynamically to avoid circular dependency
//       const db = require('../config/database');
      
//       // Query nearby hazards using PostGIS
//       const query = `
//         SELECT 
//           id,
//           hazard_type,
//           severity,
//           description,
//           ST_Y(location::geometry) as latitude,
//           ST_X(location::geometry) as longitude,
//           priority_level,
//           affects_traffic,
//           weather_related,
//           status,
//           reported_at,
//           created_at,
//           ST_Distance(
//             location,
//             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
//           ) as distance_meters
//         FROM hazards
//         WHERE 
//           status = 'active'
//           AND ST_DWithin(
//             location,
//             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
//             $3
//           )
//         ORDER BY distance_meters ASC
//         LIMIT 20
//       `;

//       const result = await db.query(query, [longitude, latitude, radius]);
      
//       // Emit nearby hazards to client
//       socket.emit('nearby_hazards', {
//         hazards: result.rows,
//         userLocation: { latitude, longitude },
//         radius: radius,
//         count: result.rows.length,
//         timestamp: new Date().toISOString()
//       });

//       console.log(`[WebSocket] Sent ${result.rows.length} nearby hazards to socket ${socket.id}`);
      
//     } catch (error) {
//       console.error('[WebSocket] Error handling user position:', error);
//       socket.emit('error', { 
//         message: 'Failed to fetch nearby hazards',
//         details: error.message 
//       });
//     }
//   }

//   /**
//    * Update user's location
//    */
//   updateUserLocation(socket, data) {
//     const connection = this.connections.get(socket.id);
    
//     if (!connection) {
//       socket.emit('error', { message: 'Not subscribed' });
//       return;
//     }

//     const { latitude, longitude } = data;

//     if (latitude && longitude) {
//       connection.location = {
//         latitude: parseFloat(latitude),
//         longitude: parseFloat(longitude)
//       };

//       this.connections.set(socket.id, connection);
//       socket.emit('location_updated', { location: connection.location });
//     }
//   }

//   /**
//    * Unsubscribe from hazard updates
//    */
//   unsubscribeFromHazards(socket) {
//     this.connections.delete(socket.id);
//     socket.emit('unsubscribed', { message: 'Unsubscribed from hazard updates' });
//     console.log(`Socket ${socket.id} unsubscribed from hazards`);
//   }

//   /**
//    * Handle socket disconnect
//    */
//   handleDisconnect(socket, reason) {
//     this.connections.delete(socket.id);
//     console.log(`Client disconnected: ${socket.id} (Reason: ${reason})`);
//   }

//   /**
//    * Calculate distance between two coordinates (Haversine formula)
//    * @returns {number} Distance in meters
//    */
//   calculateDistance(lat1, lon1, lat2, lon2) {
//     const R = 6371e3; // Earth's radius in meters
//     const φ1 = lat1 * Math.PI / 180;
//     const φ2 = lat2 * Math.PI / 180;
//     const Δφ = (lat2 - lat1) * Math.PI / 180;
//     const Δλ = (lon2 - lon1) * Math.PI / 180;

//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//       Math.cos(φ1) * Math.cos(φ2) *
//       Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     return R * c;
//   }

//   /**
//    * Get service status
//    */
//   getStatus() {
//     return {
//       initialized: this.isInitialized,
//       activeConnections: this.connections.size,
//       connections: Array.from(this.connections.values()).map(conn => ({
//         userId: conn.userId,
//         location: conn.location,
//         radius: conn.radius,
//         subscribedAt: conn.subscribedAt
//       }))
//     };
//   }

//   /**
//    * Get IO instance
//    */
//   getIO() {
//     return this.io;
//   }

//   /**
//    * Disconnect all clients and shutdown
//    */
//   async shutdown() {
//     if (this.io) {
//       console.log('Shutting down WebSocket service...');
//       this.io.disconnectSockets();
//       this.io.close();
//       this.connections.clear();
//       this.isInitialized = false;
//       console.log('WebSocket service shut down');
//     }
//   }
// }

// // Create singleton instance
// const websocketService = new WebSocketService();

// // Graceful shutdown
// process.on('SIGINT', async () => {
//   console.log('\nShutting down WebSocket service...');
//   await websocketService.shutdown();
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   console.log('\nShutting down WebSocket service...');
//   await websocketService.shutdown();
//   process.exit(0);
// });

// module.exports = websocketService;

const express = require('express');
const { body, validationResult } = require('express-validator');
const routeCalculator = require('../lib/routeCalculator');
const csvDataLoader = require('../lib/csvDataLoader');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * Find routes between two points (with authentication)
 * POST /api/routes/find
 */
router.post('/find', authenticateToken, [
  body('fromLat').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude required'),
  body('fromLon').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude required'),
  body('toLat').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude required'),
  body('toLon').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude required'),
  body('mode').optional().isIn(['walking', 'cycling', 'driving']).withMessage('Invalid transport mode')
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

    const { fromLat, fromLon, toLat, toLon, mode = 'cycling' } = req.body;

    console.log('Finding routes:', { fromLat, fromLon, toLat, toLon, mode });

    // Calculate routes
    const result = await routeCalculator.calculateRoutes(
      fromLat,
      fromLon,
      toLat,
      toLon,
      mode
    );

    res.json({
      success: true,
      data: result,
      provider: 'SafePath API'
    });

  } catch (error) {
    console.error('Route finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
=======
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * WebSocket Service using Socket.IO
 * Replaces PostgreSQL LISTEN/NOTIFY for real-time hazard alerts
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connections = new Map(); // Store user connections with metadata
    this.isInitialized = false;
  }

  /**
   * Initialize Socket.IO server
   * @param {http.Server} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    if (this.isInitialized) {
      console.log('WebSocket service already initialized');
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3001'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupConnectionHandlers();
    this.isInitialized = true;

    console.log('WebSocket (Socket.IO) service initialized');
    console.log(`CORS enabled for: ${process.env.FRONTEND_URL}`);

    return this.io;
  }

/**
 * Calculate routes between two points
 * POST /api/routes/calculate
 */
router.post('/calculate', [
  body('from.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude required'),
  body('from.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude required'),
  body('to.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude required'),
  body('to.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude required'),
  body('mode').optional().isIn(['walking', 'cycling', 'driving']).withMessage('Invalid transport mode')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
=======
  /**
   * Set up Socket.IO connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Authenticate socket connection
      socket.on('authenticate', (data) => {
        this.authenticateSocket(socket, data);
      });

    const { from, to, mode = 'walking' } = req.body;

    // Calculate routes
    const result = await routeCalculator.calculateRoutes(
      from.lat,
      from.lon,
      to.lat,
      to.lon,
      mode
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
=======
      // Subscribe to hazard updates with location
      socket.on('subscribe_hazard_updates', (data) => {
        this.subscribeToHazards(socket, data);
      });

      // Update user location
      socket.on('update_location', (data) => {
        this.updateUserLocation(socket, data);
      });

      // Track user position for nearby hazard detection
      socket.on('user_position', async (coords) => {
        await this.handleUserPosition(socket, coords);
      });

      // Unsubscribe from hazard updates
      socket.on('unsubscribe_hazard_updates', () => {
        this.unsubscribeFromHazards(socket);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

/**
 * Get safety score for a specific location
 * GET /api/routes/safety-score
 */
router.get('/safety-score', [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lon').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
=======
  /**
   * Authenticate socket connection with JWT
   */
  authenticateSocket(socket, data) {
    try {
      const { token } = data;

      if (!token) {
        socket.emit('auth_error', { message: 'Token required' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store user info with socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.authenticated = true;

      socket.emit('authenticated', {
        message: 'Authentication successful',
        userId: decoded.userId

      });

      console.log(`Socket ${socket.id} authenticated as user ${decoded.userId}`);
    } catch (error) {
      console.error(`Authentication failed for socket ${socket.id}:`, error.message);
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect();
    }
  }


    const { lat, lon } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    const safetyScore = csvDataLoader.getSafetyScoreForLocation(latitude, longitude);

    res.json({
      success: true,
      data: {
        location: { latitude, longitude },
        safetyScore: parseFloat(safetyScore.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Safety score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get safety score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
=======
  /**
   * Subscribe socket to hazard updates
   */
  subscribeToHazards(socket, data) {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { latitude, longitude, radius = 5000 } = data;

    if (!latitude || !longitude) {
      socket.emit('error', { message: 'Location required' });
      return;
    }

    // Store connection metadata
    const connectionData = {
      socketId: socket.id,
      userId: socket.userId,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      radius: parseInt(radius),
      subscribedAt: new Date()
    };

    this.connections.set(socket.id, connectionData);

    socket.emit('subscribed', {
      message: 'Subscribed to hazard updates',
      location: connectionData.location,
      radius: connectionData.radius
    });

    console.log(`User ${socket.userId} subscribed to hazards within ${radius}m of (${latitude}, ${longitude})`);
  }

/**
 * Get crime data statistics
 * GET /api/routes/stats
 */
router.get('/stats', async (req, res) => {
  try {
    if (!csvDataLoader.isLoaded()) {
      await csvDataLoader.loadCrimeData();
    }

    const stats = csvDataLoader.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
=======
  /**
   * Handle user position update for nearby hazard detection
   */
  async handleUserPosition(socket, coords) {
    try {
      const { latitude, longitude, radius = 1500 } = coords;

      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid coordinates' });
        return;
      }

      // Import database connection dynamically to avoid circular dependency
      const db = require('../config/database');
      
      // Query nearby hazards using PostGIS
      const query = `
        SELECT 
          id,
          hazard_type,
          severity,
          description,
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          priority_level,
          affects_traffic,
          weather_related,
          status,
          reported_at,
          created_at,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance_meters
        FROM hazards
        WHERE 
          status = 'active'
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY distance_meters ASC
        LIMIT 20
      `;

      const result = await db.query(query, [longitude, latitude, radius]);
      
      // Emit nearby hazards to client
      socket.emit('nearby_hazards', {
        hazards: result.rows,
        userLocation: { latitude, longitude },
        radius: radius,
        count: result.rows.length,
        timestamp: new Date().toISOString()
      });

      console.log(`[WebSocket] Sent ${result.rows.length} nearby hazards to socket ${socket.id}`);
      
    } catch (error) {
      console.error('[WebSocket] Error handling user position:', error);
      socket.emit('error', { 
        message: 'Failed to fetch nearby hazards',
        details: error.message 
      });
    }
  }

  /**
   * Update user's location
   */
  updateUserLocation(socket, data) {
    const connection = this.connections.get(socket.id);
    
    if (!connection) {
      socket.emit('error', { message: 'Not subscribed' });
      return;
    }

    const { latitude, longitude } = data;

    if (latitude && longitude) {
      connection.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      this.connections.set(socket.id, connection);
      socket.emit('location_updated', { location: connection.location });
    }
  }

  /**
   * Unsubscribe from hazard updates
   */
  unsubscribeFromHazards(socket) {
    this.connections.delete(socket.id);
    socket.emit('unsubscribed', { message: 'Unsubscribed from hazard updates' });
    console.log(`Socket ${socket.id} unsubscribed from hazards`);
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    this.connections.delete(socket.id);
    console.log(`Client disconnected: ${socket.id} (Reason: ${reason})`);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        userId: conn.userId,
        location: conn.location,
        radius: conn.radius,
        subscribedAt: conn.subscribedAt
      }))
    };
  }

  /**
   * Get IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Disconnect all clients and shutdown
   */
  async shutdown() {
    if (this.io) {
      console.log('Shutting down WebSocket service...');
      this.io.disconnectSockets();
      this.io.close();
      this.connections.clear();
      this.isInitialized = false;
      console.log('WebSocket service shut down');
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down WebSocket service...');
  await websocketService.shutdown();
  process.exit(0);
});

module.exports = router;
=======
process.on('SIGTERM', async () => {
  console.log('\nShutting down WebSocket service...');
  await websocketService.shutdown();
  process.exit(0);
});

module.exports = websocketService;

