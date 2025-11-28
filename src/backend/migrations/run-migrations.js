/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

const MIGRATIONS_DIR = __dirname;

/**
 * Get all migration files sorted by name
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort(); // Alphabetical order ensures 001, 002, etc.
}

/**
 * Run a single migration file
 */
async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`);
  
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(filePath, 'utf8');
  
  try {
    await db.query(sql);
    console.log(`✅ ${filename} completed successfully`);
    return { success: true, file: filename };
  } catch (error) {
    console.error(`❌ ${filename} failed:`, error.message);
    return { success: false, file: filename, error: error.message };
  }
}

/**
 * Main migration runner
 */
async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Test database connection
    const testResult = await db.testConnection();
    if (!testResult.success) {
      throw new Error(`Database connection failed: ${testResult.error}`);
    }
    console.log('✅ Database connection verified');
    
    // Get migration files
    const migrationFiles = await getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }
    
    console.log(`Found ${migrationFiles.length} migration(s):\n${migrationFiles.map(f => `  - ${f}`).join('\n')}`);
    
    // Run each migration
    const results = [];
    for (const file of migrationFiles) {
      const result = await runMigration(file);
      results.push(result);
      
      // Stop on first failure
      if (!result.success) {
        console.error('\n❌ Migration failed. Stopping execution.');
        break;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All migrations completed successfully!');
    } else {
      console.log('\n⚠️  Some migrations failed. Please check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Migration runner error:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runAllMigrations();
}

module.exports = { runAllMigrations, runMigration, getMigrationFiles };
