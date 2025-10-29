const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const routesRoutes = require('./routes/routes');
// const hazardsRoutes = require('./routes/hazards');
// const buddiesRoutes = require('./routes/buddies');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://safe-path-ten.vercel.app'
];
/* app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); */
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      corsOptions = { origin: '*' };   // Allow all origins for other routes
    }
  } else {

      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    message: 'London Safety Routing API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'unknown'
  };

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
// app.use('/api/hazards', hazardsRoutes);
// app.use('/api/buddies', buddiesRoutes);

// 404 handler
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

// ✅ Start server (no initializeDatabase, just test connection)
const startServer = async () => {
  try {
    const connectionTest = await db.testConnection();
    if (!connectionTest.success) throw new Error(connectionTest.error);

    app.listen(PORT, () => {
      console.log(`🚀 London Safety Routing API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL}`);
      console.log(`🗄️  Database: PostgreSQL`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Please ensure PostgreSQL is running and accessible');
    process.exit(1);
  }
};

startServer();

module.exports = app;
