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
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    this.connections.delete(socket.id);
    console.log(`Client disconnected: ${socket.id} (Reason: ${reason})`);
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