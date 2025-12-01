import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

/**
 * WebSocket Client for real-time hazard updates during navigation
 * Connects to the backend Socket.IO server
 */
class WebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const token = Cookies.get('auth_token');

    console.log('🔌 Connecting to WebSocket server:', serverUrl);

    this.socket = io(serverUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Authenticate after connection
      const token = Cookies.get('auth_token');
      if (token) {
        console.log('🔐 Authenticating WebSocket connection...');
        this.socket.emit('authenticate', { token });
      }
    });

    // Handle authentication response
    this.socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authenticated:', data);
      this.emit('authenticated', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ WebSocket authentication failed:', error);
      this.emit('auth_error', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error?.message || error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('⚠️ WebSocket: Max reconnection attempts reached. Hazard alerts will be unavailable.');
        console.warn('Make sure the backend server is running on the correct port.');
      }
    });

    this.socket.on('error', (error) => {
      console.warn('WebSocket error:', error?.message || error);
    });

    // Subscription confirmation events
    this.socket.on('subscribed', (data) => {
      console.log('✅ Subscribed to hazard updates:', data);
      this.emit('subscribed', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('✅ Unsubscribed from hazard updates:', data);
      this.emit('unsubscribed', data);
    });

    // Hazard-specific events
    this.socket.on('nearby_hazards', (data) => {
      console.log('📍 Received nearby hazards:', data);
      this.emit('nearby_hazards', data);
    });

    this.socket.on('new_hazard', (data) => {
      console.log('⚠️ New hazard reported:', data);
      this.emit('new_hazard', data);
    });

    this.socket.on('hazard_updated', (data) => {
      console.log('🔄 Hazard updated:', data);
      this.emit('hazard_updated', data);
    });

    this.socket.on('hazard_resolved', (data) => {
      console.log('✅ Hazard resolved:', data);
      this.emit('hazard_resolved', data);
    });
  }

  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit event to registered handlers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Subscribe to hazard updates for a location
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {number} radius - Search radius in meters (default: 5000)
   */
  subscribeToHazards(latitude, longitude, radius = 5000) {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return false;
    }

    console.log(`📍 Subscribing to hazards at [${latitude}, ${longitude}] with radius ${radius}m`);

    this.socket.emit('subscribe_hazard_updates', {
      latitude,
      longitude,
      radius
    });

    return true;
  }

  /**
   * Unsubscribe from hazard updates
   */
  unsubscribeFromHazards() {
    if (!this.socket?.connected) {
      return false;
    }

    this.socket.emit('unsubscribe_hazard_updates');
    console.log('📍 Unsubscribed from hazard updates');
    return true;
  }

  /**
   * Send user position to get nearby hazards
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radius - Search radius in meters (default: 500)
   */
  sendUserPosition(latitude, longitude, radius = 500) {
    if (!this.socket?.connected) {
      console.warn('Cannot send position: WebSocket not connected');
      return;
    }

    console.log(`📍 Sending position: ${latitude}, ${longitude} (radius: ${radius}m)`);

    this.socket.emit('user_position', {
      latitude,
      longitude,
      radius
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  get connected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const websocketClient = new WebSocketClient();

export default websocketClient;
