const { Pool } = require('pg');
require('dotenv').config();

// SQLite fallback commented out - using PostgreSQL only
// let pool = require('./database-sqlite');
// let usingSQLite = true;

// PostgreSQL configuration - primary database
let pool;
let usingSQLite = false;

// Initialize PostgreSQL connection
const initializeDatabase = async () => {
  try {
    const pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'safety_routing',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    
    pool = pgPool;
    usingSQLite = false;
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.error('Please ensure PostgreSQL is running and credentials are correct');
    throw error; // Don't fall back to SQLite, fail fast
  }
};

// Initialize on startup
initializeDatabase();

// Unified query interface - PostgreSQL only
const query = async (text, params) => {
  // SQLite conversion logic commented out - using PostgreSQL directly
  /*
  if (usingSQLite) {
    // Convert PostgreSQL-style queries to SQLite
    let sqliteQuery = text;
    let sqliteParams = params;
    
    // Convert $1, $2, etc. to ? placeholders for SQLite
    if (params && params.length > 0) {
      for (let i = params.length; i >= 1; i--) {
        sqliteQuery = sqliteQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
      }
    }
    
    // Handle RETURNING clause (SQLite doesn't support it)
    if (sqliteQuery.includes('RETURNING')) {
      const isInsert = sqliteQuery.toLowerCase().includes('insert');
      const baseQuery = sqliteQuery.split('RETURNING')[0].trim();
      
      if (isInsert) {
        const result = await pool.run(baseQuery, sqliteParams);
        // Fetch the inserted record
        const selectQuery = 'SELECT * FROM users WHERE id = ?';
        const insertedRow = await pool.get(selectQuery, [result.id]);
        return { rows: [insertedRow] };
      }
    }
    
    // Regular queries
    if (sqliteQuery.toLowerCase().trim().startsWith('select')) {
      const rows = await pool.all(sqliteQuery, sqliteParams);
      return { rows };
    } else {
      const result = await pool.run(sqliteQuery, sqliteParams);
      return { rows: [], rowCount: result.changes };
    }
  } else {
    // PostgreSQL
    return await pool.query(text, params);
  }
  */
  
  // PostgreSQL only
  return await pool.query(text, params);
};

// Test connection method - PostgreSQL only
const testConnection = async () => {
  try {
    // SQLite test commented out
    /*
    if (usingSQLite) {
      await pool.get('SELECT 1');
      return { success: true, database: 'SQLite', time: new Date() };
    } else {
      const result = await pool.query('SELECT NOW()');
      return { success: true, database: 'PostgreSQL', time: result.rows[0].now };
    }
    */
    
    // PostgreSQL only
    const result = await pool.query('SELECT NOW()');
    return { success: true, database: 'PostgreSQL', time: result.rows[0].now };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  query,
  testConnection,
  initializeDatabase,
  usingSQLite: () => usingSQLite
};