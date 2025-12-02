const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://safe-path-deploy.vercel.app',
  'https://safepath-deploy.vercel.app',
  'https://safepath-deploy-hudakhalils-projects.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      // For debugging, allow it but log it
      callback(null, true);
    }
  },
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
const uploadsPath = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsPath);
} else {
  console.log('📁 Uploads directory exists:', uploadsPath);
}

// Static file middleware with CORS
const staticFileHandler = express.static(uploadsPath, {
  setHeaders: (res, filePath, stat) => {
    // Set CORS headers for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
});

app.use('/uploads', (req, res, next) => {
  console.log('📸 Static file request:', req.url);
  
  // Try to serve the static file
  staticFileHandler(req, res, (err) => {
    if (err) {
      console.error('❌ Error serving static file:', err);
      return res.status(500).send('Error serving file');
    }
    
    // If static handler didn't respond, file doesn't exist
    if (!res.headersSent) {
      console.log('❌ File not found:', req.url);
      return res.status(404).send('File not found');
    }
  });
});

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

// 404 handler for unknown API routes (but not static files)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found`
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  // Don't interfere with static file 404s - they're handled by express.static
  if (req.originalUrl.startsWith('/uploads')) {
    return res.status(404).send('File not found');
  }
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