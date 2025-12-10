#!/usr/bin/env node

/**
 * Migration Runner for Street Lighting Table
 * 
 * Usage: node run-lighting-migration.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  try {
    console.log('🔦 Running street lighting table migration...\n');
    
    // Initialize database connection
    await db.initializeDatabase();
    
    // Read migration SQL
    const migrationPath = path.join(__dirname, '003_create_street_lighting_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await db.query(sql);
    
    console.log('✅ Migration 003 completed successfully!\n');
    console.log('Created:');
    console.log('  - street_lighting table');
    console.log('  - Spatial indexes (GIST)');
    console.log('  - Helper functions (get_lighting_grid_cell, calculate_lighting_score)');
    console.log('  - Update trigger\n');
    
    // Verify table was created
    const result = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'street_lighting'
    `);
    
    if (result.rows[0].count > 0) {
      console.log('✅ Verified: street_lighting table exists\n');
    } else {
      console.error('❌ Warning: table verification failed\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
