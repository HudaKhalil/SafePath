const db = require('../config/database');

async function addUniqueConstraint() {
  try {
    console.log('🔧 Adding unique constraint to street_lighting table...');
    
    await db.initializeDatabase();
    
    // Add the unique constraint
    await db.query(`
      ALTER TABLE street_lighting 
      ADD CONSTRAINT unique_osm_light UNIQUE (osm_id, osm_type);
    `);
    
    console.log('✅ Unique constraint added successfully!');
    console.log('   Constraint: unique_osm_light on (osm_id, osm_type)');
    
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Constraint already exists, no action needed');
      process.exit(0);
    } else {
      console.error('❌ Error adding constraint:', error.message);
      process.exit(1);
    }
  }
}

addUniqueConstraint();
