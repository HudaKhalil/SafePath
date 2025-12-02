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
   * Set up Socket.IO connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Authenticate socket connection
      socket.on('authenticate', (data) => {
        this.authenticateSocket(socket, data);
      });

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

      // Navigation events with authentication
      socket.on('start_navigation', (data) => {
        this.handleStartNavigation(socket, data);
      });

      socket.on('navigation_progress', (data) => {
        this.handleNavigationProgress(socket, data);
      });

      socket.on('end_navigation', (data) => {
        this.handleEndNavigation(socket, data);
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
      
      // Check if hazards table exists first
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'hazards'
        );
      `;
      
      const tableExists = await db.query(tableCheckQuery);
      
      if (!tableExists.rows[0].exists) {
        // Table doesn't exist yet, return empty hazards
        socket.emit('nearby_hazards', {
          hazards: [],
          userLocation: { latitude, longitude },
          radius: radius,
          count: 0,
          timestamp: new Date().toISOString(),
          note: 'Hazards table not initialized'
        });
        console.log(`[WebSocket] Hazards table not found, returning empty result for socket ${socket.id}`);
        return;
      }
      
      // Query nearby hazards using PostGIS
      const query = `
        SELECT 
          id,
          hazard_type,
          severity,
          description,
          latitude,
          longitude,
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
      // Send empty result instead of error to prevent frontend issues
      socket.emit('nearby_hazards', {
        hazards: [],
        userLocation: { latitude: coords.latitude, longitude: coords.longitude },
        radius: coords.radius || 1500,
        count: 0,
        timestamp: new Date().toISOString(),
        error: 'Database query failed'
      });
      console.log(`[WebSocket] Sent empty hazards due to error for socket ${socket.id}`);
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
   * Handle navigation start with authentication
   */
  handleStartNavigation(socket, data) {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { routeId, routeName, startLocation, endLocation } = data;

    if (!routeId || !startLocation || !endLocation) {
      socket.emit('error', { message: 'Invalid navigation data' });
      return;
    }

    // Store navigation session
    const navigationData = {
      socketId: socket.id,
      userId: socket.userId,
      routeId,
      routeName: routeName || 'Route',
      startLocation,
      endLocation,
      startTime: new Date(),
      isNavigating: true
    };

    // Update connection with navigation data
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.navigation = navigationData;
      this.connections.set(socket.id, connection);
    }

    socket.emit('navigation_started', {
      message: 'Navigation started',
      routeId,
      routeName: navigationData.routeName,
      timestamp: navigationData.startTime.toISOString()
    });

    console.log(`User ${socket.userId} started navigation for route ${routeId}`);
  }

  /**
   * Handle navigation progress updates with authentication
   */
  handleNavigationProgress(socket, data) {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const connection = this.connections.get(socket.id);
    
    if (!connection || !connection.navigation) {
      socket.emit('error', { message: 'No active navigation session' });
      return;
    }

    const { currentPosition, remainingDistance, estimatedTimeRemaining } = data;

    if (!currentPosition) {
      socket.emit('error', { message: 'Current position required' });
      return;
    }

    // Update navigation progress
    connection.navigation.lastUpdate = new Date();
    connection.navigation.currentPosition = currentPosition;
    connection.navigation.remainingDistance = remainingDistance;
    connection.navigation.estimatedTimeRemaining = estimatedTimeRemaining;
    this.connections.set(socket.id, connection);

    // Check for nearby hazards at current position
    this.handleUserPosition(socket, {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      radius: 1500 // 1.5km radius during navigation
    });

    console.log(`Navigation progress updated for user ${socket.userId}`);
  }

  /**
   * Handle navigation end with authentication
   */
  handleEndNavigation(socket, data) {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const connection = this.connections.get(socket.id);
    
    if (!connection || !connection.navigation) {
      socket.emit('error', { message: 'No active navigation session' });
      return;
    }

    const { reason = 'completed', finalPosition } = data;

    // Calculate navigation duration
    const duration = new Date() - connection.navigation.startTime;
    const durationMinutes = Math.round(duration / 60000);

    // Clear navigation data
    const navigationData = connection.navigation;
    delete connection.navigation;
    this.connections.set(socket.id, connection);

    socket.emit('navigation_ended', {
      message: 'Navigation ended',
      routeId: navigationData.routeId,
      reason,
      duration: durationMinutes,
      timestamp: new Date().toISOString()
    });

    console.log(`User ${socket.userId} ended navigation (${reason}) after ${durationMinutes} minutes`);
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    this.connections.delete(socket.id);
    console.log(`Client disconnected: ${socket.id} (Reason: ${reason})`);
  }

  /**
   * Broadcast new hazard to relevant clients
   * @param {Object} hazardData - Hazard information
   */
  broadcastNewHazard(hazardData) {
    if (!this.io) {
      console.error('WebSocket service not initialized');
      return;
    }

    const {
      id,
      hazard_type,
      severity,
      description,
      latitude,
      longitude,
      priority_level,
      affects_traffic,
      weather_related,
      status,
      reported_at
    } = hazardData;

    let notificationsSent = 0;

    // Iterate through all connected clients
    for (const [socketId, connection] of this.connections) {
      try {
        const distance = this.calculateDistance(
          connection.location.latitude,
          connection.location.longitude,
          latitude,
          longitude
        );

        // Send notification if hazard is within user's radius
        if (distance <= connection.radius) {
          const notification = this.createNotificationMessage({
            ...hazardData,
            distance_meters: Math.round(distance)
          });

          this.io.to(socketId).emit('new_hazard', notification);
          notificationsSent++;

          console.log(`Hazard ${id} sent to user ${connection.userId} (${Math.round(distance)}m away)`);
        }
      } catch (error) {
        console.error(`Error broadcasting to socket ${socketId}:`, error);
        this.connections.delete(socketId);
      }
    }

    if (notificationsSent > 0) {
      console.log(`Broadcast complete: ${notificationsSent} users notified of hazard ${id}`);
    }

    return notificationsSent;
  }

  /**
   * Broadcast hazard update (status change, verification, etc.)
   */
  broadcastHazardUpdate(hazardData) {
    if (!this.io) return;

    const notification = this.createNotificationMessage(hazardData, 'hazard_updated');
    
    let notificationsSent = 0;

    for (const [socketId, connection] of this.connections) {
      try {
        const distance = this.calculateDistance(
          connection.location.latitude,
          connection.location.longitude,
          hazardData.latitude,
          hazardData.longitude
        );

        if (distance <= connection.radius) {
          this.io.to(socketId).emit('hazard_updated', notification);
          notificationsSent++;
        }
      } catch (error) {
        console.error(`Error broadcasting update to socket ${socketId}:`, error);
      }
    }

    console.log(`Hazard update broadcast: ${notificationsSent} users notified`);
    return notificationsSent;
  }

  /**
   * Broadcast hazard resolution
   */
  broadcastHazardResolved(hazardId, hazardData) {
    if (!this.io) return;

    const notification = {
      type: 'hazard_resolved',
      hazardId: hazardId,
      message: 'Hazard has been resolved',
      timestamp: new Date().toISOString()
    };

    this.io.emit('hazard_resolved', notification);
    console.log(`Hazard ${hazardId} resolution broadcast to all clients`);
  }

  /**
   * Create formatted notification message
   */
  createNotificationMessage(hazardData, eventType = 'new_hazard') {
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
      low: 'green',
      medium: 'yellow',
      high: 'orange',
      critical: 'red'
    };

    const emoji = hazardEmojis[hazardData.hazard_type] || '⚠️';
    const severityColor = severityColors[hazardData.severity] || 'yellow';

    let message = '';
    if (eventType === 'new_hazard') {
      message = `${emoji} New ${hazardData.severity} risk: ${hazardData.hazard_type.replace('_', ' ')} reported nearby`;
    } else if (eventType === 'hazard_updated') {
      message = `${emoji} Hazard status updated`;
    }

    return {
      type: eventType,
      hazard: {
        id: hazardData.id,
        hazardType: hazardData.hazard_type,
        severity: hazardData.severity,
        severityColor: severityColor,
        description: hazardData.description,
        location: {
          latitude: hazardData.latitude,
          longitude: hazardData.longitude
        },
        priorityLevel: hazardData.priority_level,
        affectsTraffic: hazardData.affects_traffic,
        weatherRelated: hazardData.weather_related,
        status: hazardData.status,
        ...(hazardData.distance_meters && { distanceMeters: hazardData.distance_meters })
      },
      message: message,
      timestamp: hazardData.reported_at || new Date().toISOString(),
      urgency: hazardData.severity === 'critical' ? 'high' : hazardData.severity === 'high' ? 'medium' : 'normal'
    };
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

process.on('SIGTERM', async () => {
  console.log('\nShutting down WebSocket service...');
  await websocketService.shutdown();
  process.exit(0);
});

module.exports = websocketService;
