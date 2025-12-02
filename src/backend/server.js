const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('./config/database');
const csvDataLoader = require('./lib/csvDataLoader');
const websocketService = require('./lib/websocketService');

// Import routes
const authRoutes = require('./routes/auth');
const routesRoutes = require('./routes/routes');
const geocodingRoutes = require('./routes/geocoding');
const hazardsRoutes = require('./routes/hazards');
const buddiesRoutes = require('./routes/buddies');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files as static content with explicit CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    message: 'London Safety Routing API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'unknown'
  };

  // Test database connection
  try {
    const connectionTest = await db.testConnection();
    if (connectionTest.success) {
      healthCheck.database = `connected (${connectionTest.database})`;
    } else {
      throw new Error(connectionTest.error);
    }
  } catch (error) {
    console.error('Health check - Database connection failed:', error.message);
    healthCheck.database = 'disconnected';
    healthCheck.status = 'degraded';
    healthCheck.error = error.message;
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json({
    success: healthCheck.status === 'ok',
    ...healthCheck
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/hazards', hazardsRoutes);
app.use('/api/buddies', buddiesRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server with database initialization
const startServer = async () => {
  try {
    // Initialize database connection
    //HK - Removed: database is already initialized inside ./config/database
    //await db.initializeDatabase();
    
    // Load crime data from CSV files for safety scoring
    console.log('🔄 Loading crime data for safety scoring...');
    await csvDataLoader.loadCrimeData();
    const stats = csvDataLoader.getStats();
    console.log(`✅ Crime data loaded: ${stats.totalRecords} records, ${stats.gridCells} grid cells`);
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket service with authentication and all event handlers
    const io = websocketService.initialize(server);
    
    // Make io available to routes
    app.set('io', io);
    
    server.listen(PORT, () => {
      console.log(`🚀 London Safety Routing API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL}`);
      console.log(`🗄️  Database: PostgreSQL`);
      console.log(`🛡️  Safety scoring: Rule-based (CSV data)`);
      console.log(`🔌 WebSocket enabled for real-time updates`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Please ensure PostgreSQL is running and accessible');
    process.exit(1);
  }
};

startServer();

module.exports = app;