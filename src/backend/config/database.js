// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL pool using DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Unified query interface - PostgreSQL only
const query = async (text, params) => {
  return await pool.query(text, params);
};

// Test connection method
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL at', result.rows[0].now);
    return { success: true, database: 'PostgreSQL', time: result.rows[0].now };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Initialize on startup
(async () => {
  await testConnection();
})();

module.exports = {
  query,
  testConnection,
};
