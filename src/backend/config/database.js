const { Pool } = require('pg');
require('dotenv').config();

// Initialize with SQLite as default
let pool = require('./database-sqlite');
let usingSQLite = true;

// Try to connect to PostgreSQL
const initializeDatabase = async () => {
  if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
    try {
      const pgPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'london_safety_routing',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'ilove_Theo12345',
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
      console.log('⚠️  PostgreSQL connection failed, using SQLite');
      console.log('PostgreSQL error:', error.message);
    }
  } else {
    console.log('⚠️  No PostgreSQL password configured, using SQLite');
  }
  
  return false;
};

// Initialize on startup
initializeDatabase();

// Unified query interface
const query = async (text, params) => {
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
};

// Add a method to test the connection
const testConnection = async () => {
  try {
    if (usingSQLite) {
      await pool.get('SELECT 1');
      return { success: true, database: 'SQLite', time: new Date() };
    } else {
      const result = await pool.query('SELECT NOW()');
      return { success: true, database: 'PostgreSQL', time: result.rows[0].now };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  query,
  testConnection,
  usingSQLite: () => usingSQLite
};